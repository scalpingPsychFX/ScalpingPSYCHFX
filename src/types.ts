import type { Timestamp } from 'firebase/firestore';

export type MarketBias = 'Bullish' | 'Bearish' | 'Neutral';
export type StrategyCategory =
  | 'Execution Rule'
  | 'Risk Management'
  | 'Session Playbook'
  | 'Market Regime';
export type MeetingStatus = 'upcoming' | 'completed';
export type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent';
export type PortalNoteType = 'profile' | 'important_note';
export type PaidStrategyFileType = 'pdf' | 'image';
export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';
export type AdminEmailStatus = 'active' | 'revoked';

export interface AdminEmailRecord {
  id: string;
  email: string;
  status: AdminEmailStatus;
  roleLabel?: string;
  addedByUid: string;
  addedByEmail: string;
  updatedByUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface GoldAnalysis {
  id: string;
  title: string;
  date: string;
  pair: string;
  bias: MarketBias;
  timeframe: string;
  entryZone?: string;
  invalidation?: string;
  targets?: string;
  strategyNotes: string;
  visibility: 'members';
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StrategyUpdate {
  id: string;
  title: string;
  date: string;
  category: StrategyCategory;
  summary: string;
  details: string;
  visibility: 'members';
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  link: string;
  status: MeetingStatus;
  agendaOrRecap: string;
  recordingLink?: string;
  visibility: 'members';
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Announcement {
  id: string;
  title: string;
  date: string;
  priority: AnnouncementPriority;
  body: string;
  pinned: boolean;
  visibility: 'members';
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PortalNote {
  id: string;
  noteType: PortalNoteType;
  title: string;
  date: string;
  content: string;
  traderName?: string;
  tradingStyle?: string;
  activeSessions?: string;
  contactChannel?: string;
  riskRules?: string;
  visibility: 'members';
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PaidStrategy {
  id: string;
  title: string;
  description: string;
  priceInr: number;
  fileName: string;
  fileType: PaidStrategyFileType;
  date: string;
  visibility: 'members';
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PaidStrategyFile {
  id: string;
  strategyId: string;
  fileUrl: string;
  storagePath: string;
  fileName: string;
  fileType: PaidStrategyFileType;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PaymentSettings {
  id: string;
  upiId: string;
  payeeName?: string;
  qrImageUrl: string;
  qrStoragePath?: string;
  instructions?: string;
  authorUid: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface PaymentRequest {
  id: string;
  memberUid: string;
  memberName: string;
  memberEmail: string;
  strategyId: string;
  strategyTitle: string;
  priceInr: number;
  screenshotUrl: string;
  screenshotStoragePath: string;
  transactionId?: string;
  status: PaymentRequestStatus;
  adminNote?: string;
  date: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StrategyUnlock {
  id: string;
  memberUid: string;
  strategyId: string;
  requestId: string;
  fileUrl: string;
  fileName: string;
  fileType: PaidStrategyFileType;
  grantedBy: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type PortalSection =
  | 'dashboard'
  | 'gold'
  | 'strategy'
  | 'meetings'
  | 'notes';
