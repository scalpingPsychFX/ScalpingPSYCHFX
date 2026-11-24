import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BACKUP_ADMIN_EMAIL,
  isValidAdminEmail,
  normalizeAdminEmail,
} from './portalService';
import type { AdminEmailRecord } from '../types';

function clampText(value: string | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

function timestampMillis(ts?: Timestamp | null): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

/**
 * Ensures the signed-in admin's email and the backup admin email (solotravelvip@gmail.com)
 * are recorded in `admin_emails` and that `portal_config/admin_roster` tracks the active count.
 * Never overrides an explicitly revoked entry.
 */
export async function ensureAdminRosterSeeded(adminUser: User): Promise<void> {
  if (!adminUser.emailVerified) return;
  const myEmail = normalizeAdminEmail(adminUser.email);
  if (!myEmail || !isValidAdminEmail(myEmail)) return;

  try {
    const allSnap = await getDocs(collection(db, 'admin_emails'));
    const existingActiveSet = new Set<string>();
    allSnap.docs.forEach((d) => {
      if (d.data()?.status === 'active') {
        existingActiveSet.add(d.id);
      }
    });

    await runTransaction(db, async (tx) => {
      const rosterRef = doc(db, 'portal_config', 'admin_roster');
      const myRef = doc(db, 'admin_emails', myEmail);
      const backupRef = doc(db, 'admin_emails', BACKUP_ADMIN_EMAIL);

      const rosterSnap = await tx.get(rosterRef);
      const mySnap = await tx.get(myRef);
      const backupSnap =
        myEmail === BACKUP_ADMIN_EMAIL ? mySnap : await tx.get(backupRef);

      let added = 0;

      if (!mySnap.exists()) {
        tx.set(myRef, {
          email: myEmail,
          status: 'active',
          roleLabel:
            myEmail === BACKUP_ADMIN_EMAIL ? 'Backup Admin' : 'Primary Admin',
          addedByUid: adminUser.uid,
          addedByEmail: myEmail,
          updatedByUid: adminUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        existingActiveSet.add(myEmail);
        added += 1;
      }

      if (myEmail !== BACKUP_ADMIN_EMAIL && !backupSnap.exists()) {
        tx.set(backupRef, {
          email: BACKUP_ADMIN_EMAIL,
          status: 'active',
          roleLabel: 'Backup Admin',
          addedByUid: adminUser.uid,
          addedByEmail: myEmail,
          updatedByUid: adminUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        existingActiveSet.add(BACKUP_ADMIN_EMAIL);
        added += 1;
      }

      const targetCount = Math.max(1, existingActiveSet.size);
      const currentRosterCount = rosterSnap.exists()
        ? Number(rosterSnap.data()?.activeCount ?? 0)
        : 0;

      if (!rosterSnap.exists()) {
        tx.set(rosterRef, {
          activeCount: targetCount,
          updatedByUid: adminUser.uid,
          updatedAt: serverTimestamp(),
        });
      } else if (added > 0 || currentRosterCount !== targetCount) {
        tx.update(rosterRef, {
          activeCount: targetCount,
          updatedByUid: adminUser.uid,
          updatedAt: serverTimestamp(),
        });
      }
    });
  } catch (error) {
    console.warn('Admin roster seed notice:', error);
  }
}

export function subscribeAdminEmails(
  onData: (items: AdminEmailRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'admin_emails'),
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data({ serverTimestamps: 'estimate' }) as Omit<AdminEmailRecord, 'id'>),
      })) as AdminEmailRecord[];

      items.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
        const tsDiff = timestampMillis(a.createdAt) - timestampMillis(b.createdAt);
        if (tsDiff !== 0) return tsDiff;
        return a.email.localeCompare(b.email);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'admin_emails');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
        else throw wrapped;
      }
    },
  );
}

/**
 * Watches the current signed-in user's own `admin_emails/{email}` doc so promotions
 * or revocations take effect in real time.
 */
export function subscribeMyAdminEmailStatus(
  user: User,
  onStatusChange: () => void,
): Unsubscribe {
  const emailLower = normalizeAdminEmail(user.email);
  if (!emailLower || !isValidAdminEmail(emailLower)) {
    return () => {};
  }
  return onSnapshot(
    doc(db, 'admin_emails', emailLower),
    () => {
      onStatusChange();
    },
    () => {
      // Ignore transient permission errors on listener teardown
    },
  );
}

export async function addAdminEmail(
  actor: User,
  rawEmail: string,
  roleLabel?: string,
): Promise<string> {
  const email = normalizeAdminEmail(rawEmail);
  if (!isValidAdminEmail(email)) {
    throw new Error('Please enter a valid Google email address.');
  }

  const actorEmail =
    normalizeAdminEmail(actor.email) || BACKUP_ADMIN_EMAIL;
  const cleanLabel = clampText(roleLabel, 80) || 'Admin';

  try {
    const allSnap = await getDocs(collection(db, 'admin_emails'));
    const activeIds = new Set<string>();
    allSnap.docs.forEach((d) => {
      if (d.data()?.status === 'active') activeIds.add(d.id);
    });

    await runTransaction(db, async (tx) => {
      const targetRef = doc(db, 'admin_emails', email);
      const rosterRef = doc(db, 'portal_config', 'admin_roster');

      const targetSnap = await tx.get(targetRef);
      const rosterSnap = await tx.get(rosterRef);

      if (targetSnap.exists() && targetSnap.data()?.status === 'active') {
        throw new Error(`${email} already has admin access.`);
      }

      activeIds.add(email);
      const nextCount = activeIds.size;
      if (nextCount > 100) {
        throw new Error('Maximum of 100 admins reached.');
      }

      if (targetSnap.exists()) {
        tx.update(targetRef, {
          status: 'active',
          roleLabel: cleanLabel,
          updatedByUid: actor.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(targetRef, {
          email,
          status: 'active',
          roleLabel: cleanLabel,
          addedByUid: actor.uid,
          addedByEmail: actorEmail,
          updatedByUid: actor.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (rosterSnap.exists()) {
        tx.update(rosterRef, {
          activeCount: nextCount,
          updatedByUid: actor.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(rosterRef, {
          activeCount: nextCount,
          updatedByUid: actor.uid,
          updatedAt: serverTimestamp(),
        });
      }
    });

    return email;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already has admin access') ||
        error.message.includes('Maximum of 100 admins') ||
        error.message.includes('valid Google email'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `admin_emails/${email}`);
  }
}

export async function removeAdminEmail(
  actor: User,
  targetEmail: string,
): Promise<void> {
  const email = normalizeAdminEmail(targetEmail);
  if (!isValidAdminEmail(email)) {
    throw new Error('Invalid admin email.');
  }

  try {
    const allSnap = await getDocs(collection(db, 'admin_emails'));
    const activeIds = new Set<string>();
    allSnap.docs.forEach((d) => {
      if (d.data()?.status === 'active') activeIds.add(d.id);
    });

    if (activeIds.size <= 1) {
      throw new Error(
        'Cannot remove the last remaining admin. At least one admin must stay active.',
      );
    }

    await runTransaction(db, async (tx) => {
      const targetRef = doc(db, 'admin_emails', email);
      const rosterRef = doc(db, 'portal_config', 'admin_roster');

      const targetSnap = await tx.get(targetRef);
      const rosterSnap = await tx.get(rosterRef);

      if (!targetSnap.exists() || targetSnap.data()?.status !== 'active') {
        throw new Error(`${email} is not currently an active admin.`);
      }

      const rosterCount = rosterSnap.exists()
        ? Number(rosterSnap.data()?.activeCount ?? 0)
        : 0;

      if (rosterCount < 2 || activeIds.size <= 1) {
        throw new Error(
          'Cannot remove the last remaining admin. At least one admin must stay active.',
        );
      }

      tx.update(targetRef, {
        status: 'revoked',
        updatedByUid: actor.uid,
        updatedAt: serverTimestamp(),
      });

      tx.update(rosterRef, {
        activeCount: rosterCount - 1,
        updatedByUid: actor.uid,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('last remaining admin') ||
        error.message.includes('not currently an active admin') ||
        error.message.includes('Invalid admin email'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, `admin_emails/${email}`);
  }
}
