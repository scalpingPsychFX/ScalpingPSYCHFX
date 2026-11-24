import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Lock,
  Plus,
  QrCode,
  ShieldCheck,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  deletePaidStrategy,
  formatInr,
  getAdminStrategyFile,
  reviewPaymentRequest,
  savePaidStrategy,
  saveUpiSettings,
  submitPaymentRequest,
} from '../lib/paidStrategiesService';
import type {
  PaidStrategy,
  PaidStrategyFileType,
  PaymentRequest,
  PaymentSettings,
  StrategyUnlock,
} from '../types';
import { AdminRowActions } from './AdminRowActions';

interface PaidStrategiesViewProps {
  user: User;
  isAdmin: boolean;
  paidStrategies: PaidStrategy[];
  paymentSettings: PaymentSettings | null;
  paymentRequests: PaymentRequest[];
  strategyUnlocks: StrategyUnlock[];
  onToast: (msg: string) => void;
}

export const PaidStrategiesView: React.FC<PaidStrategiesViewProps> = ({
  user,
  isAdmin,
  paidStrategies,
  paymentSettings,
  paymentRequests,
  strategyUnlocks,
  onToast,
}) => {
  const [adminSubTab, setAdminSubTab] = useState<'catalog' | 'requests'>('catalog');
  const [requestStatusFilter, setRequestStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');

  // Modals
  const [editingStrategy, setEditingStrategy] = useState<PaidStrategy | null | 'new'>(null);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<PaidStrategy | null>(null);
  const [viewerFile, setViewerFile] = useState<{
    title: string;
    fileName: string;
    fileType: PaidStrategyFileType;
    fileUrl: string;
  } | null>(null);
  const [screenshotLightbox, setScreenshotLightbox] = useState<PaymentRequest | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [loadingAdminFileId, setLoadingAdminFileId] = useState<string | null>(null);

  const pendingCount = useMemo(
    () => paymentRequests.filter((r) => r.status === 'pending').length,
    [paymentRequests],
  );

  // Map strategyId -> member's latest payment request
  const myRequestByStrategy = useMemo(() => {
    const map = new Map<string, PaymentRequest>();
    for (const req of paymentRequests) {
      if (req.memberUid !== user.uid) continue;
      if (!map.has(req.strategyId)) {
        map.set(req.strategyId, req);
      }
    }
    return map;
  }, [paymentRequests, user.uid]);

  // Map strategyId -> member's unlock record
  const myUnlockByStrategy = useMemo(() => {
    const map = new Map<string, StrategyUnlock>();
    for (const u of strategyUnlocks) {
      if (u.memberUid === user.uid) {
        map.set(u.strategyId, u);
      }
    }
    return map;
  }, [strategyUnlocks, user.uid]);

  const filteredRequests = useMemo(() => {
    if (requestStatusFilter === 'all') return paymentRequests;
    return paymentRequests.filter((r) => r.status === requestStatusFilter);
  }, [paymentRequests, requestStatusFilter]);

  const handleAdminPreviewFile = async (strategy: PaidStrategy) => {
    setLoadingAdminFileId(strategy.id);
    try {
      const fileDoc = await getAdminStrategyFile(strategy.id);
      if (!fileDoc) {
        onToast('Strategy file record not found.');
        return;
      }
      setViewerFile({
        title: strategy.title,
        fileName: fileDoc.fileName,
        fileType: fileDoc.fileType,
        fileUrl: fileDoc.fileUrl,
      });
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to load strategy file.');
    } finally {
      setLoadingAdminFileId(null);
    }
  };

  const handleReview = async (
    req: PaymentRequest,
    decision: 'approved' | 'rejected',
  ) => {
    setReviewingId(req.id);
    try {
      await reviewPaymentRequest(user, req, decision);
      onToast(
        decision === 'approved'
          ? `Approved and unlocked "${req.strategyTitle}" for ${req.memberName}.`
          : `Rejected payment request from ${req.memberName}.`,
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update request.');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {isAdmin ? (
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setAdminSubTab('catalog')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                adminSubTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Strategies ({paidStrategies.length})
            </button>
            <button
              type="button"
              onClick={() => setAdminSubTab('requests')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap font-mono tabular-nums ${
                adminSubTab === 'requests'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Requests ({pendingCount > 0 ? `${pendingCount} pending` : paymentRequests.length})
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Unlock premium XAUUSD playbooks via UPI. Files unlock immediately upon admin verification.
          </p>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUpiModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              {paymentSettings ? 'Edit UPI & QR' : 'Set Up UPI & QR'}
            </button>
            <button
              type="button"
              onClick={() => setEditingStrategy('new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Paid Strategy
            </button>
          </div>
        )}
      </div>

      {/* Admin UPI Configuration Status Banner (if missing) */}
      {isAdmin && !paymentSettings && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-sm text-amber-950">
            <strong className="font-semibold">UPI Payment Details Not Configured:</strong>{' '}
            Upload your UPI ID and QR code so members can pay to unlock strategies.
          </div>
          <button
            type="button"
            onClick={() => setUpiModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Configure UPI
          </button>
        </div>
      )}

      {/* STRATEGIES CATALOG VIEW (Visible to Members always, and Admin when adminSubTab === 'catalog') */}
      {(!isAdmin || adminSubTab === 'catalog') && (
        <>
          {paidStrategies.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-sm text-slate-600 mb-4">
                No paid strategies have been published yet.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEditingStrategy('new')}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  Create First Paid Strategy
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paidStrategies.map((strategy) => {
                const unlock = myUnlockByStrategy.get(strategy.id);
                const latestReq = myRequestByStrategy.get(strategy.id);
                const isUnlocked = Boolean(unlock);

                return (
                  <article
                    key={strategy.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                          <span>{strategy.fileType === 'pdf' ? 'PDF Guide' : 'Chart Image'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{strategy.date}</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                          {formatInr(strategy.priceInr)}
                        </div>
                      </div>

                      <h2 className="text-lg font-semibold text-slate-900 leading-snug mb-2">
                        {strategy.title}
                      </h2>

                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {strategy.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      {isAdmin ? (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleAdminPreviewFile(strategy)}
                            disabled={loadingAdminFileId === strategy.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {loadingAdminFileId === strategy.id ? 'Loading...' : 'View File'}
                          </button>
                          <AdminRowActions
                            itemLabel={strategy.title}
                            onEdit={() => setEditingStrategy(strategy)}
                            onDelete={async () => {
                              await deletePaidStrategy(strategy.id);
                              onToast('Paid strategy deleted.');
                            }}
                          />
                        </div>
                      ) : isUnlocked && unlock ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Status: Approved · File Unlocked</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setViewerFile({
                                  title: strategy.title,
                                  fileName: unlock.fileName,
                                  fileType: unlock.fileType,
                                  fileUrl: unlock.fileUrl,
                                })
                              }
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View File
                            </button>
                            <a
                              href={unlock.fileUrl}
                              download={unlock.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          </div>
                        </div>
                      ) : latestReq?.status === 'pending' ? (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-amber-800">
                            Status: Pending Admin Verification
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            Submitted {latestReq.date}
                            {latestReq.transactionId
                              ? ` · Ref: ${latestReq.transactionId}`
                              : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {latestReq?.status === 'rejected' && (
                            <div className="text-xs text-red-700">
                              Status: Rejected
                              {latestReq.adminNote
                                ? ` · ${latestReq.adminNote}`
                                : ' — Please check your payment proof and resubmit.'}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Lock className="w-3.5 h-3.5" />
                              File locked
                            </span>
                            <button
                              type="button"
                              onClick={() => setUnlockTarget(strategy)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              {latestReq?.status === 'rejected' ? 'Resubmit Payment' : 'Unlock'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Member's own request history table (if any) */}
          {!isAdmin && paymentRequests.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Your Payment Requests
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 pr-4 font-medium">Strategy</th>
                      <th className="py-2.5 px-4 font-medium">Amount</th>
                      <th className="py-2.5 px-4 font-medium">Date</th>
                      <th className="py-2.5 px-4 font-medium">Transaction ID</th>
                      <th className="py-2.5 pl-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentRequests.map((req) => (
                      <tr key={req.id}>
                        <td className="py-3 pr-4 font-medium text-slate-900">
                          {req.strategyTitle}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                          {formatInr(req.priceInr)}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-600 text-xs">
                          {req.date}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600">
                          {req.transactionId || '—'}
                        </td>
                        <td className="py-3 pl-4 text-right text-xs font-medium">
                          <span
                            className={
                              req.status === 'approved'
                                ? 'text-emerald-700'
                                : req.status === 'rejected'
                                  ? 'text-red-700'
                                  : 'text-amber-800'
                            }
                          >
                            {req.status === 'approved'
                              ? 'Approved'
                              : req.status === 'rejected'
                                ? 'Rejected'
                                : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* ADMIN PAYMENT REQUESTS LIST */}
      {isAdmin && adminSubTab === 'requests' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Payment Requests
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify UPI payment screenshots and approve to unlock strategies for individual members
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRequestStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                    requestStatusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-600">
              No payment requests in this view.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="py-4 first:pt-1 last:pb-1 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={() => setScreenshotLightbox(req)}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 hover:border-amber-600 transition-colors"
                      title="View full payment screenshot"
                    >
                      <img
                        src={req.screenshotUrl}
                        alt={`Payment screenshot from ${req.memberName}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                        <span
                          className={`font-semibold ${
                            req.status === 'approved'
                              ? 'text-emerald-700'
                              : req.status === 'rejected'
                                ? 'text-red-700'
                                : 'text-amber-800'
                          }`}
                        >
                          {req.status === 'approved'
                            ? 'Approved'
                            : req.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{req.date}</span>
                        {req.transactionId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">UTR: {req.transactionId}</span>
                          </>
                        )}
                      </div>

                      <div className="text-sm font-semibold text-slate-900">
                        {req.memberName}{' '}
                        <span className="font-normal text-slate-500">
                          ({req.memberEmail})
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 mt-1">
                        Strategy: <strong>{req.strategyTitle}</strong> ·{' '}
                        <span className="font-mono tabular-nums">
                          {formatInr(req.priceInr)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setScreenshotLightbox(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Screenshot
                    </button>
                    {req.status !== 'approved' && (
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => handleReview(req, 'approved')}
                        className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors"
                      >
                        {reviewingId === req.id ? 'Updating...' : 'Approve'}
                      </button>
                    )}
                    {req.status !== 'rejected' && (
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => handleReview(req, 'rejected')}
                        className="px-3.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL 1: Admin Add / Edit Paid Strategy */}
      {editingStrategy !== null && (
        <PaidStrategyModal
          user={user}
          strategy={editingStrategy === 'new' ? undefined : editingStrategy}
          onClose={() => setEditingStrategy(null)}
          onSaved={(msg) => {
            onToast(msg);
            setEditingStrategy(null);
          }}
        />
      )}

      {/* MODAL 2: Admin UPI ID & QR Settings */}
      {upiModalOpen && (
        <UpiSettingsModal
          user={user}
          existing={paymentSettings}
          onClose={() => setUpiModalOpen(false)}
          onSaved={(msg) => {
            onToast(msg);
            setUpiModalOpen(false);
          }}
        />
      )}

      {/* MODAL 3: Member Unlock & UPI Payment Submission */}
      {unlockTarget && (
        <UnlockPaymentModal
          user={user}
          strategy={unlockTarget}
          paymentSettings={paymentSettings}
          onClose={() => setUnlockTarget(null)}
          onSubmitted={(msg) => {
            onToast(msg);
            setUnlockTarget(null);
          }}
        />
      )}

      {/* MODAL 4: Unlocked Strategy File Viewer */}
      {viewerFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
          onClick={() => setViewerFile(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 truncate">
                  {viewerFile.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {viewerFile.fileName}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={viewerFile.fileUrl}
                  download={viewerFile.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setViewerFile(null)}
                  aria-label="Close file viewer"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center min-h-[420px]">
              {viewerFile.fileType === 'image' ? (
                <img
                  src={viewerFile.fileUrl}
                  alt={viewerFile.title}
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[72vh] rounded-lg border border-slate-200 bg-white object-contain"
                />
              ) : (
                <iframe
                  title={viewerFile.title}
                  src={viewerFile.fileUrl}
                  className="w-full h-[70vh] rounded-lg border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Admin Screenshot Review Lightbox */}
      {screenshotLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-4"
          onClick={() => setScreenshotLightbox(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 truncate">
                  Payment Proof · {screenshotLightbox.memberName}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {screenshotLightbox.memberEmail} · {screenshotLightbox.strategyTitle} ({formatInr(screenshotLightbox.priceInr)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScreenshotLightbox(null)}
                aria-label="Close screenshot"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center">
              <img
                src={screenshotLightbox.screenshotUrl}
                alt={`Payment screenshot by ${screenshotLightbox.memberName}`}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[65vh] rounded-lg border border-slate-200 bg-white object-contain"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="text-xs text-slate-600 font-mono">
                Date: {screenshotLightbox.date}
                {screenshotLightbox.transactionId
                  ? ` · Transaction ID: ${screenshotLightbox.transactionId}`
                  : ''}
              </div>
              <div className="flex items-center gap-2">
                {screenshotLightbox.status !== 'approved' && (
                  <button
                    type="button"
                    disabled={reviewingId === screenshotLightbox.id}
                    onClick={async () => {
                      await handleReview(screenshotLightbox, 'approved');
                      setScreenshotLightbox(null);
                    }}
                    className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60"
                  >
                    Approve & Unlock
                  </button>
                )}
                {screenshotLightbox.status !== 'rejected' && (
                  <button
                    type="button"
                    disabled={reviewingId === screenshotLightbox.id}
                    onClick={async () => {
                      await handleReview(screenshotLightbox, 'rejected');
                      setScreenshotLightbox(null);
                    }}
                    className="px-4 py-2 text-xs font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-modal: Admin Create / Edit Paid Strategy ---
const PaidStrategyModal: React.FC<{
  user: User;
  strategy?: PaidStrategy;
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ user, strategy, onClose, onSaved }) => {
  const [title, setTitle] = useState(strategy?.title ?? '');
  const [description, setDescription] = useState(strategy?.description ?? '');
  const [priceInr, setPriceInr] = useState(
    strategy ? String(strategy.priceInr) : '',
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsedPrice = Number(priceInr);
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Title and short description are required.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setErrorMsg('Please enter a valid price in INR.');
      return;
    }
    if (!strategy && !file) {
      setErrorMsg('Please upload the full strategy PDF or image file.');
      return;
    }

    setSaving(true);
    try {
      await savePaidStrategy(
        user,
        {
          title,
          description,
          priceInr: parsedPrice,
        },
        file,
        strategy,
      );
      onSaved(strategy ? 'Paid strategy updated.' : 'Paid strategy published.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save strategy.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {strategy ? 'Edit Paid Strategy' : 'Add Paid Strategy'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Strategy Title
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., XAUUSD London Session Liquidity Scalp Playbook"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Short Description
            </label>
            <textarea
              required
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize what members learn inside this file..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Price (INR ₹)
            </label>
            <input
              type="number"
              required
              min={0}
              max={10000000}
              step={1}
              value={priceInr}
              onChange={(e) => setPriceInr(e.target.value)}
              placeholder="1499"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Strategy File (PDF or Image)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
              {file?.type === 'application/pdf' ? (
                <FileText className="w-5 h-5 text-slate-500 shrink-0" />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-500 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-900 truncate">
                  {file
                    ? file.name
                    : strategy
                      ? `Current: ${strategy.fileName} (click to replace)`
                      : 'Choose PDF or PNG/JPG file (max 25 MB)'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Hidden from members until payment is approved
                </div>
              </div>
              <Upload className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="file"
                accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Uploading & Saving...' : strategy ? 'Save Changes' : 'Publish Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Sub-modal: Admin UPI Settings ---
const UpiSettingsModal: React.FC<{
  user: User;
  existing: PaymentSettings | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}> = ({ user, existing, onClose, onSaved }) => {
  const [upiId, setUpiId] = useState(existing?.upiId ?? '');
  const [payeeName, setPayeeName] = useState(existing?.payeeName ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string>(existing?.qrImageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (f: File | null) => {
    setQrFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setQrPreview(reader.result);
      };
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!upiId.trim()) {
      setErrorMsg('Please enter your UPI ID.');
      return;
    }
    setSaving(true);
    try {
      await saveUpiSettings(
        user,
        { upiId, payeeName, instructions },
        qrFile,
        existing,
      );
      onSaved('UPI payment settings saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save UPI settings.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            UPI Payment Details & QR Code
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              UPI ID
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g., tradername@okicici"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Payee Display Name (optional)
            </label>
            <input
              type="text"
              maxLength={120}
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g., Scalping Psych fx"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              UPI QR Code Image
            </label>
            <div className="flex items-center gap-4">
              {qrPreview && (
                <img
                  src={qrPreview}
                  alt="UPI QR code preview"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-lg border border-slate-200 object-contain bg-white shrink-0"
                />
              )}
              <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                <QrCode className="w-5 h-5 text-slate-500 shrink-0" />
                <span className="text-xs font-medium text-slate-800 truncate">
                  {qrFile ? qrFile.name : 'Upload QR code image (PNG/JPG)'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Member Instructions (optional)
            </label>
            <textarea
              rows={2}
              maxLength={1000}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Scan the QR or copy UPI ID, pay the exact amount, and upload your screenshot."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save UPI Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Sub-modal: Member Unlock & Payment Proof Upload ---
const UnlockPaymentModal: React.FC<{
  user: User;
  strategy: PaidStrategy;
  paymentSettings: PaymentSettings | null;
  onClose: () => void;
  onSubmitted: (msg: string) => void;
}> = ({ user, strategy, paymentSettings, onClose, onSubmitted }) => {
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCopyUpi = async () => {
    if (!paymentSettings?.upiId) return;
    try {
      await navigator.clipboard.writeText(paymentSettings.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!screenshot) {
      setErrorMsg('Please upload your UPI payment screenshot.');
      return;
    }
    setSubmitting(true);
    try {
      await submitPaymentRequest(user, strategy, screenshot, transactionId);
      onSubmitted('Payment proof submitted. Status is now Pending.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to submit payment proof.',
      );
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">
              Unlock Strategy
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {strategy.title} · {formatInr(strategy.priceInr)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          {!paymentSettings ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              The admin has not uploaded UPI payment details yet. Please check back shortly.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-[#F8F8F6] p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Pay Exact Amount</div>
                  <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                    {formatInr(strategy.priceInr)}
                  </div>
                </div>
                {paymentSettings.payeeName && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Payee</div>
                    <div className="text-xs font-semibold text-slate-900">
                      {paymentSettings.payeeName}
                    </div>
                  </div>
                )}
              </div>

              {paymentSettings.qrImageUrl && (
                <div className="flex justify-center bg-white rounded-lg border border-slate-200 p-4">
                  <img
                    src={paymentSettings.qrImageUrl}
                    alt="Admin UPI QR Code"
                    referrerPolicy="no-referrer"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-500">UPI ID</div>
                  <div className="text-sm font-mono font-medium text-slate-900 truncate">
                    {paymentSettings.upiId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {paymentSettings.instructions && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {paymentSettings.instructions}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Upload Payment Screenshot (Required)
            </label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
              <ImageIcon className="w-5 h-5 text-slate-500 shrink-0" />
              <span className="text-xs font-medium text-slate-800 truncate flex-1">
                {screenshot
                  ? screenshot.name
                  : 'Select payment screenshot (PNG, JPG, WebP)'}
              </span>
              <Upload className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              UPI Transaction / UTR ID (Optional)
            </label>
            <input
              type="text"
              maxLength={120}
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g., 432910582910"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              Visible only to you & Admin
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !paymentSettings}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Payment Proof'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
