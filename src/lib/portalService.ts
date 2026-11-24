import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import type {
  Announcement,
  AnnouncementPriority,
  GoldAnalysis,
  MarketBias,
  Meeting,
  MeetingStatus,
  PortalNote,
  PortalNoteType,
  StrategyCategory,
  StrategyUpdate,
} from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  return DATE_RE.test(trimmed) ? trimmed : todayIsoDate();
}

function clampText(value: string | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

function makeDocId(prefix: string): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const cleaned = `${prefix}_${raw}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, 128);
}

function timestampMillis(ts?: Timestamp | null): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

function sortLatestFirst<T extends { date: string; createdAt?: Timestamp | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return timestampMillis(b.createdAt) - timestampMillis(a.createdAt);
  });
}

export const BACKUP_ADMIN_EMAIL = 'solotravelvip@gmail.com';
const ADMIN_EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function normalizeAdminEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function isValidAdminEmail(email: string): boolean {
  const normalized = normalizeAdminEmail(email);
  return (
    normalized.length >= 3 &&
    normalized.length <= 200 &&
    !normalized.includes('..') &&
    ADMIN_EMAIL_RE.test(normalized)
  );
}

/**
 * Resolves whether the signed-in user has Admin access:
 * 1. Explicit entry in `admin_emails/{email}` (`active` => true, `revoked` => false).
 * 2. Bootstrapped backup admin (`solotravelvip@gmail.com`) unless explicitly revoked.
 * 3. First verified user who claimed `portal_config/primary_admin` (unless revoked in `admin_emails`).
 * 4. Legacy `admins/{uid}` fallback.
 */
export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified || !SAFE_ID_RE.test(user.uid)) return false;

  const emailLower = normalizeAdminEmail(user.email);

  if (emailLower && isValidAdminEmail(emailLower)) {
    try {
      const emailSnap = await getDoc(doc(db, 'admin_emails', emailLower));
      if (emailSnap.exists()) {
        return emailSnap.data()?.status === 'active';
      }
    } catch {
      // Fall through to bootstrap / primary claim checks
    }
  }

  if (emailLower === BACKUP_ADMIN_EMAIL) {
    return true;
  }

  const primaryRef = doc(db, 'portal_config', 'primary_admin');
  try {
    const existingSnap = await getDoc(primaryRef);
    if (existingSnap.exists()) {
      if (existingSnap.data()?.adminUid === user.uid) {
        return true;
      }
    } else {
      const claimed = await runTransaction(db, async (tx) => {
        const txSnap = await tx.get(primaryRef);
        if (!txSnap.exists()) {
          tx.set(primaryRef, {
            adminUid: user.uid,
            claimedAt: serverTimestamp(),
          });
          return true;
        }
        return txSnap.data()?.adminUid === user.uid;
      });
      if (claimed) return true;
    }
  } catch (error) {
    try {
      const retrySnap = await getDoc(primaryRef);
      if (retrySnap.exists() && retrySnap.data()?.adminUid === user.uid) {
        return true;
      }
    } catch {
      // fall through
    }
    console.warn('Primary admin claim check:', error);
  }

  try {
    const secondarySnap = await getDoc(doc(db, 'admins', user.uid));
    return secondarySnap.exists() && secondarySnap.data()?.role === 'admin';
  } catch {
    return false;
  }
}

export function subscribeCollection<T extends { id: string; date: string; createdAt?: Timestamp | null }>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (err: Error) => void,
  customSort?: (items: T[]) => T[],
): Unsubscribe {
  const q = query(
    collection(db, collectionName),
    where('visibility', '==', 'members'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const rows = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<T, 'id'>),
      })) as T[];
      const sorted = customSort ? customSort(rows) : sortLatestFirst(rows);
      onData(sorted);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, collectionName);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        } else {
          throw wrapped;
        }
      }
    },
  );
}

// --- Gold Analysis CRUD ---
export interface GoldAnalysisInput {
  title: string;
  date: string;
  pair: string;
  bias: MarketBias;
  timeframe: string;
  entryZone?: string;
  invalidation?: string;
  targets?: string;
  strategyNotes: string;
}

export async function saveGoldAnalysis(
  user: User,
  input: GoldAnalysisInput,
  existingId?: string,
): Promise<string> {
  const docId = existingId && SAFE_ID_RE.test(existingId) ? existingId : makeDocId('xau');
  const docPath = `gold_analyses/${docId}`;

  const payload: Record<string, unknown> = {
    title: clampText(input.title, 200) || 'XAUUSD Market Analysis',
    date: normalizeDate(input.date),
    pair: clampText(input.pair, 24) || 'XAUUSD',
    bias: input.bias,
    timeframe: clampText(input.timeframe, 40) || 'H4 / M15',
    strategyNotes: clampText(input.strategyNotes, 15000) || 'Strategy notes pending.',
    entryZone: clampText(input.entryZone, 120),
    invalidation: clampText(input.invalidation, 120),
    targets: clampText(input.targets, 160),
    updatedAt: serverTimestamp(),
  };

  try {
    if (existingId) {
      await updateDoc(doc(db, 'gold_analyses', docId), payload);
    } else {
      await setDoc(doc(db, 'gold_analyses', docId), {
        ...payload,
        visibility: 'members',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
      });
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      docPath,
    );
  }
}

export async function deleteGoldAnalysis(id: string): Promise<void> {
  const path = `gold_analyses/${id}`;
  try {
    await deleteDoc(doc(db, 'gold_analyses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Strategy Updates CRUD ---
export interface StrategyUpdateInput {
  title: string;
  date: string;
  category: StrategyCategory;
  summary: string;
  details: string;
}

export async function saveStrategyUpdate(
  user: User,
  input: StrategyUpdateInput,
  existingId?: string,
): Promise<string> {
  const docId = existingId && SAFE_ID_RE.test(existingId) ? existingId : makeDocId('strat');
  const docPath = `strategy_updates/${docId}`;

  const payload = {
    title: clampText(input.title, 200) || 'Strategy Update',
    date: normalizeDate(input.date),
    category: input.category,
    summary: clampText(input.summary, 500) || 'Updated desk rule.',
    details: clampText(input.details, 12000) || 'Details pending.',
    updatedAt: serverTimestamp(),
  };

  try {
    if (existingId) {
      await updateDoc(doc(db, 'strategy_updates', docId), payload);
    } else {
      await setDoc(doc(db, 'strategy_updates', docId), {
        ...payload,
        visibility: 'members',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
      });
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      docPath,
    );
  }
}

export async function deleteStrategyUpdate(id: string): Promise<void> {
  const path = `strategy_updates/${id}`;
  try {
    await deleteDoc(doc(db, 'strategy_updates', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Meetings CRUD ---
export interface MeetingInput {
  title: string;
  date: string;
  time: string;
  link: string;
  status: MeetingStatus;
  agendaOrRecap: string;
  recordingLink?: string;
}

export async function saveMeeting(
  user: User,
  input: MeetingInput,
  existingId?: string,
): Promise<string> {
  const docId = existingId && SAFE_ID_RE.test(existingId) ? existingId : makeDocId('meet');
  const docPath = `meetings/${docId}`;

  const payload: Record<string, unknown> = {
    title: clampText(input.title, 200) || 'Group Strategy Session',
    date: normalizeDate(input.date),
    time: clampText(input.time, 60) || '14:00 UTC',
    link: clampText(input.link, 500),
    status: input.status,
    agendaOrRecap: clampText(input.agendaOrRecap, 8000),
    recordingLink: clampText(input.recordingLink, 500),
    updatedAt: serverTimestamp(),
  };

  try {
    if (existingId) {
      await updateDoc(doc(db, 'meetings', docId), payload);
    } else {
      await setDoc(doc(db, 'meetings', docId), {
        ...payload,
        visibility: 'members',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
      });
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      docPath,
    );
  }
}

export async function deleteMeeting(id: string): Promise<void> {
  const path = `meetings/${id}`;
  try {
    await deleteDoc(doc(db, 'meetings', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Announcements CRUD ---
export interface AnnouncementInput {
  title: string;
  date: string;
  priority: AnnouncementPriority;
  body: string;
  pinned: boolean;
}

export async function saveAnnouncement(
  user: User,
  input: AnnouncementInput,
  existingId?: string,
): Promise<string> {
  const docId = existingId && SAFE_ID_RE.test(existingId) ? existingId : makeDocId('ann');
  const docPath = `announcements/${docId}`;

  const payload = {
    title: clampText(input.title, 200) || 'Community Announcement',
    date: normalizeDate(input.date),
    priority: input.priority,
    body: clampText(input.body, 8000) || 'Update details.',
    pinned: Boolean(input.pinned),
    updatedAt: serverTimestamp(),
  };

  try {
    if (existingId) {
      await updateDoc(doc(db, 'announcements', docId), payload);
    } else {
      await setDoc(doc(db, 'announcements', docId), {
        ...payload,
        visibility: 'members',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
      });
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      docPath,
    );
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const path = `announcements/${id}`;
  try {
    await deleteDoc(doc(db, 'announcements', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Portal Notes & Personal Details CRUD ---
export interface PortalNoteInput {
  noteType: PortalNoteType;
  title: string;
  date: string;
  content: string;
  traderName?: string;
  tradingStyle?: string;
  activeSessions?: string;
  contactChannel?: string;
  riskRules?: string;
}

export async function savePortalNote(
  user: User,
  input: PortalNoteInput,
  existingId?: string,
): Promise<string> {
  const docId =
    existingId && SAFE_ID_RE.test(existingId)
      ? existingId
      : input.noteType === 'profile'
        ? 'admin_profile'
        : makeDocId('note');
  const docPath = `portal_notes/${docId}`;

  const payload: Record<string, unknown> = {
    noteType: input.noteType,
    title: clampText(input.title, 200) || 'Desk Note',
    date: normalizeDate(input.date),
    content: clampText(input.content, 10000) || 'Notes.',
    traderName: clampText(input.traderName, 120),
    tradingStyle: clampText(input.tradingStyle, 160),
    activeSessions: clampText(input.activeSessions, 160),
    contactChannel: clampText(input.contactChannel, 200),
    riskRules: clampText(input.riskRules, 2000),
    updatedAt: serverTimestamp(),
  };

  try {
    if (existingId) {
      await updateDoc(doc(db, 'portal_notes', docId), payload);
    } else {
      await setDoc(doc(db, 'portal_notes', docId), {
        ...payload,
        visibility: 'members',
        authorUid: user.uid,
        createdAt: serverTimestamp(),
      });
    }
    return docId;
  } catch (error) {
    handleFirestoreError(
      error,
      existingId ? OperationType.UPDATE : OperationType.CREATE,
      docPath,
    );
  }
}

export async function deletePortalNote(id: string): Promise<void> {
  const path = `portal_notes/${id}`;
  try {
    await deleteDoc(doc(db, 'portal_notes', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function sortAnnouncementsLatestFirst(items: Announcement[]): Announcement[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return timestampMillis(b.createdAt) - timestampMillis(a.createdAt);
  });
}

export type { GoldAnalysis, StrategyUpdate, Meeting, Announcement, PortalNote };
