import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import type { User } from 'firebase/auth';
import {
  db,
  handleFirestoreError,
  OperationType,
  storage,
} from './firebase';
import { todayIsoDate } from './portalService';
import type {
  PaidStrategy,
  PaidStrategyFile,
  PaidStrategyFileType,
  PaymentRequest,
  PaymentRequestStatus,
  PaymentSettings,
  StrategyUnlock,
} from '../types';

const SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.slice(0, 180) || 'file';
}

function makeDocId(prefix: string): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${raw}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function clampText(value: string | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

function timestampMillis(ts?: Timestamp | null): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function detectStrategyFileType(file: File): PaidStrategyFileType | null {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.name)
  ) {
    return 'image';
  }
  return null;
}

async function uploadToStorage(storagePath: string, file: File): Promise<string> {
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type || undefined,
  });
  return getDownloadURL(storageRef);
}

// --- Subscriptions ---

export function subscribePaidStrategies(
  onData: (items: PaidStrategy[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'paid_strategies'),
    where('visibility', '==', 'members'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PaidStrategy, 'id'>),
      })) as PaidStrategy[];
      items.sort((a, b) => {
        const dateDiff = b.date.localeCompare(a.date);
        if (dateDiff !== 0) return dateDiff;
        return timestampMillis(b.createdAt) - timestampMillis(a.createdAt);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'paid_strategies');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
        else throw wrapped;
      }
    },
  );
}

export function subscribePaymentSettings(
  onData: (settings: PaymentSettings | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const refDoc = doc(db, 'payment_settings', 'upi');
  return onSnapshot(
    refDoc,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({
        id: snap.id,
        ...(snap.data() as Omit<PaymentSettings, 'id'>),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'payment_settings/upi');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
        else throw wrapped;
      }
    },
  );
}

export function subscribePaymentRequests(
  user: User,
  isAdmin: boolean,
  onData: (items: PaymentRequest[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'payment_requests'))
    : query(
        collection(db, 'payment_requests'),
        where('memberUid', '==', user.uid),
      );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data({ serverTimestamps: 'estimate' }) as Omit<PaymentRequest, 'id'>),
      })) as PaymentRequest[];
      items.sort((a, b) => {
        const msDiff = timestampMillis(b.createdAt) - timestampMillis(a.createdAt);
        if (msDiff !== 0) return msDiff;
        return b.date.localeCompare(a.date);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'payment_requests');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
        else throw wrapped;
      }
    },
  );
}

export function subscribeStrategyUnlocks(
  user: User,
  isAdmin: boolean,
  onData: (items: StrategyUnlock[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = isAdmin
    ? query(collection(db, 'strategy_unlocks'))
    : query(
        collection(db, 'strategy_unlocks'),
        where('memberUid', '==', user.uid),
      );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<StrategyUnlock, 'id'>),
      })) as StrategyUnlock[];
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'strategy_unlocks');
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
        else throw wrapped;
      }
    },
  );
}

// --- Admin Operations ---

export interface PaidStrategyInput {
  title: string;
  description: string;
  priceInr: number;
  date?: string;
}

export async function savePaidStrategy(
  adminUser: User,
  input: PaidStrategyInput,
  strategyFile: File | null,
  existing?: PaidStrategy,
): Promise<string> {
  const strategyId =
    existing?.id && SAFE_ID_RE.test(existing.id)
      ? existing.id
      : makeDocId('paid');

  if (!existing && !strategyFile) {
    throw new Error('Please upload a PDF or image file for the strategy.');
  }

  let fileName = existing?.fileName ?? '';
  let fileType: PaidStrategyFileType = existing?.fileType ?? 'pdf';
  let fileUrl: string | null = null;
  let storagePath: string | null = null;

  if (strategyFile) {
    const detected = detectStrategyFileType(strategyFile);
    if (!detected) {
      throw new Error('Only PDF or image files (PNG, JPG, WebP) are supported.');
    }
    if (strategyFile.size > 25 * 1024 * 1024) {
      throw new Error('Strategy file must be 25 MB or smaller.');
    }
    fileType = detected;
    fileName = clampText(strategyFile.name, 260) || 'strategy_file';
    storagePath = `paid_strategies/${strategyId}/${Date.now()}_${sanitizeFileName(fileName)}`;
    fileUrl = await uploadToStorage(storagePath, strategyFile);
  }

  const price = Number.isFinite(input.priceInr)
    ? Math.max(0, Math.min(10000000, Math.round(input.priceInr)))
    : 0;
  const dateStr = input.date?.trim() || existing?.date || todayIsoDate();

  const publicRef = doc(db, 'paid_strategies', strategyId);
  const secretRef = doc(db, 'paid_strategy_files', strategyId);

  try {
    const batch = writeBatch(db);

    if (existing) {
      batch.update(publicRef, {
        title: clampText(input.title, 200) || 'Paid Strategy',
        description: clampText(input.description, 2000) || 'Strategy guide.',
        priceInr: price,
        fileName,
        fileType,
        date: dateStr,
        updatedAt: serverTimestamp(),
      });
      if (fileUrl && storagePath) {
        batch.update(secretRef, {
          fileUrl,
          storagePath,
          fileName,
          fileType,
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      batch.set(publicRef, {
        title: clampText(input.title, 200) || 'Paid Strategy',
        description: clampText(input.description, 2000) || 'Strategy guide.',
        priceInr: price,
        fileName,
        fileType,
        date: dateStr,
        visibility: 'members',
        authorUid: adminUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(secretRef, {
        strategyId,
        fileUrl,
        storagePath,
        fileName,
        fileType,
        authorUid: adminUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return strategyId;
  } catch (error) {
    handleFirestoreError(
      error,
      existing ? OperationType.UPDATE : OperationType.CREATE,
      `paid_strategies/${strategyId}`,
    );
  }
}

export async function getAdminStrategyFile(
  strategyId: string,
): Promise<PaidStrategyFile | null> {
  const path = `paid_strategy_files/${strategyId}`;
  try {
    const snap = await getDoc(doc(db, 'paid_strategy_files', strategyId));
    if (!snap.exists()) return null;
    return {
      id: snap.id,
      ...(snap.data() as Omit<PaidStrategyFile, 'id'>),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deletePaidStrategy(strategyId: string): Promise<void> {
  try {
    const secretSnap = await getDoc(doc(db, 'paid_strategy_files', strategyId));
    const storagePath = secretSnap.exists()
      ? (secretSnap.data()?.storagePath as string | undefined)
      : undefined;

    const batch = writeBatch(db);
    batch.delete(doc(db, 'paid_strategies', strategyId));
    if (secretSnap.exists()) {
      batch.delete(doc(db, 'paid_strategy_files', strategyId));
    }
    await batch.commit();

    if (storagePath) {
      deleteObject(ref(storage, storagePath)).catch(() => {
        // best-effort storage cleanup
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `paid_strategies/${strategyId}`,
    );
  }
}

export interface UpiSettingsInput {
  upiId: string;
  payeeName?: string;
  instructions?: string;
}

export async function saveUpiSettings(
  adminUser: User,
  input: UpiSettingsInput,
  qrFile: File | null,
  existing: PaymentSettings | null,
): Promise<void> {
  const trimmedUpi = clampText(input.upiId, 120);
  if (!trimmedUpi) {
    throw new Error('Please enter your UPI ID.');
  }

  let qrImageUrl = existing?.qrImageUrl ?? '';
  let qrStoragePath = existing?.qrStoragePath ?? '';

  if (qrFile) {
    if (!qrFile.type.startsWith('image/')) {
      throw new Error('UPI QR code must be an image (PNG, JPG, or WebP).');
    }
    if (qrFile.size > 5 * 1024 * 1024) {
      throw new Error('QR code image must be 5 MB or smaller.');
    }
    qrStoragePath = `payment_settings/upi_qr_${Date.now()}_${sanitizeFileName(qrFile.name)}`;
    qrImageUrl = await uploadToStorage(qrStoragePath, qrFile);
  }

  const settingsRef = doc(db, 'payment_settings', 'upi');
  try {
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      await updateDoc(settingsRef, {
        upiId: trimmedUpi,
        payeeName: clampText(input.payeeName, 120),
        qrImageUrl: clampText(qrImageUrl, 2000),
        qrStoragePath: clampText(qrStoragePath, 500),
        instructions: clampText(input.instructions, 1000),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(settingsRef, {
        upiId: trimmedUpi,
        payeeName: clampText(input.payeeName, 120),
        qrImageUrl: clampText(qrImageUrl, 2000),
        qrStoragePath: clampText(qrStoragePath, 500),
        instructions: clampText(input.instructions, 1000),
        authorUid: adminUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'payment_settings/upi');
  }
}

export async function reviewPaymentRequest(
  adminUser: User,
  request: PaymentRequest,
  decision: Extract<PaymentRequestStatus, 'approved' | 'rejected'>,
  adminNote?: string,
): Promise<void> {
  const reqRef = doc(db, 'payment_requests', request.id);
  const unlockId = `${request.memberUid}_${request.strategyId}`;
  const unlockRef = doc(db, 'strategy_unlocks', unlockId);

  try {
    if (decision === 'approved') {
      const secretSnap = await getDoc(
        doc(db, 'paid_strategy_files', request.strategyId),
      );
      if (!secretSnap.exists()) {
        throw new Error(
          'Strategy file record was not found. Re-upload the strategy file first.',
        );
      }
      const secretData = secretSnap.data() as Omit<PaidStrategyFile, 'id'>;
      const existingUnlockSnap = await getDoc(unlockRef);

      const batch = writeBatch(db);
      batch.update(reqRef, {
        status: 'approved',
        adminNote: clampText(adminNote, 500),
        updatedAt: serverTimestamp(),
      });

      if (existingUnlockSnap.exists()) {
        batch.update(unlockRef, {
          requestId: request.id,
          fileUrl: secretData.fileUrl,
          fileName: secretData.fileName,
          fileType: secretData.fileType,
          grantedBy: adminUser.uid,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(unlockRef, {
          memberUid: request.memberUid,
          strategyId: request.strategyId,
          requestId: request.id,
          fileUrl: secretData.fileUrl,
          fileName: secretData.fileName,
          fileType: secretData.fileType,
          grantedBy: adminUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } else {
      const existingUnlockSnap = await getDoc(unlockRef);
      const batch = writeBatch(db);
      batch.update(reqRef, {
        status: 'rejected',
        adminNote: clampText(adminNote, 500),
        updatedAt: serverTimestamp(),
      });
      if (existingUnlockSnap.exists()) {
        batch.delete(unlockRef);
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.UPDATE,
      `payment_requests/${request.id}`,
    );
  }
}

export async function deletePaymentRequest(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'payment_requests', requestId));
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.DELETE,
      `payment_requests/${requestId}`,
    );
  }
}

// --- Member Operations ---

export async function submitPaymentRequest(
  memberUser: User,
  strategy: PaidStrategy,
  screenshotFile: File,
  transactionId?: string,
): Promise<string> {
  if (!screenshotFile.type.startsWith('image/')) {
    throw new Error('Please upload a payment screenshot image (PNG, JPG, or WebP).');
  }
  if (screenshotFile.size > 10 * 1024 * 1024) {
    throw new Error('Payment screenshot must be 10 MB or smaller.');
  }

  const requestId = makeDocId('payreq');
  const screenshotStoragePath = `payment_screenshots/${memberUser.uid}/${requestId}_${sanitizeFileName(screenshotFile.name)}`;
  const screenshotUrl = await uploadToStorage(screenshotStoragePath, screenshotFile);

  const memberName =
    clampText(memberUser.displayName ?? undefined, 120) ||
    clampText(memberUser.email?.split('@')[0], 120) ||
    'Community Member';
  const memberEmail = clampText(memberUser.email ?? undefined, 200) || 'member@portal';

  try {
    await setDoc(doc(db, 'payment_requests', requestId), {
      memberUid: memberUser.uid,
      memberName,
      memberEmail,
      strategyId: strategy.id,
      strategyTitle: clampText(strategy.title, 200),
      priceInr: strategy.priceInr,
      screenshotUrl,
      screenshotStoragePath,
      transactionId: clampText(transactionId, 120),
      status: 'pending',
      adminNote: '',
      date: todayIsoDate(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return requestId;
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.CREATE,
      `payment_requests/${requestId}`,
    );
  }
}
