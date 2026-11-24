import React, { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { addAdminEmail, removeAdminEmail } from '../lib/adminService';
import { BACKUP_ADMIN_EMAIL, normalizeAdminEmail } from '../lib/portalService';
import type { AdminEmailRecord } from '../types';

interface AdminSettingsViewProps {
  user: User;
  adminEmails: AdminEmailRecord[];
  onToast: (msg: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  user,
  adminEmails,
  onToast,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('Co-Admin');
  const [submitting, setSubmitting] = useState(false);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const myEmail = normalizeAdminEmail(user.email);

  const activeAdmins = useMemo(
    () => adminEmails.filter((a) => a.status === 'active'),
    [adminEmails],
  );

  const revokedAdmins = useMemo(
    () => adminEmails.filter((a) => a.status === 'revoked'),
    [adminEmails],
  );

  const canRemoveAny = activeAdmins.length > 1;

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const added = await addAdminEmail(user, newEmail, roleLabel);
      setNewEmail('');
      setRoleLabel('Co-Admin');
      onToast(`Admin access granted to ${added}.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to add admin email.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!canRemoveAny) {
      setErrorMsg(
        'Cannot remove the last remaining admin. At least one admin must stay active.',
      );
      return;
    }
    setErrorMsg(null);
    setBusyEmail(email);
    try {
      await removeAdminEmail(user, email);
      setConfirmRemoveEmail(null);
      onToast(`Removed admin access for ${email}.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to remove admin email.',
      );
    } finally {
      setBusyEmail(null);
    }
  };

  const handleRestoreAdmin = async (record: AdminEmailRecord) => {
    setErrorMsg(null);
    setBusyEmail(record.email);
    try {
      await addAdminEmail(user, record.email, record.roleLabel || 'Co-Admin');
      onToast(`Restored admin access for ${record.email}.`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to restore admin email.',
      );
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">Active Admins</div>
          <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
            {activeAdmins.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Full edit &amp; payment approval access
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">Signed-In Admin</div>
          <div className="text-sm font-semibold text-slate-900 truncate font-mono">
            {myEmail || user.email}
          </div>
          <div className="text-xs text-emerald-700 mt-1 inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Google Account
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 mb-1">Backup Admin</div>
          <div className="text-sm font-semibold text-slate-900 truncate font-mono">
            {BACKUP_ADMIN_EMAIL}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {activeAdmins.some((a) => a.email === BACKUP_ADMIN_EMAIL)
              ? 'Active on admin roster'
              : 'Not currently active'}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Add Admin Email Form */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Add Admin Email
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Grant full admin access to another verified Google account. They will receive identical permissions across all portal sections, Paid Strategies, and Admin Settings.
            </p>
          </div>

          <form onSubmit={handleAddAdmin} className="pt-5 space-y-4">
            <div>
              <label
                htmlFor="new-admin-email"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Google Email Address
              </label>
              <input
                id="new-admin-email"
                type="email"
                required
                maxLength={200}
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g., partner@gmail.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
              />
            </div>

            <div>
              <label
                htmlFor="new-admin-role-label"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Label (optional)
              </label>
              <input
                id="new-admin-role-label"
                type="text"
                maxLength={80}
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="e.g., Backup Admin or Co-Admin"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Granting Access...' : 'Add Admin'}
            </button>
          </form>
        </section>

        {/* Active Admin List */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Authorized Admins
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  At least one active admin must remain at all times.
                </p>
              </div>
              {!canRemoveAny && (
                <span className="text-xs font-medium text-amber-800">
                  Last remaining admin locked
                </span>
              )}
            </div>

            {activeAdmins.length === 0 ? (
              <div className="py-8 text-sm text-slate-600">
                Initializing admin roster...
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {activeAdmins.map((record) => {
                  const isSelf = record.email === myEmail;
                  const isBusy = busyEmail === record.email;
                  const isConfirming = confirmRemoveEmail === record.email;

                  return (
                    <div
                      key={record.id}
                      className="py-4 first:pt-4 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 font-mono truncate">
                            {record.email}
                          </span>
                          {isSelf && (
                            <span className="text-xs font-medium text-amber-800">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          <span className="font-medium text-slate-700">
                            {record.roleLabel || 'Admin'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Added by {record.addedByEmail}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isConfirming ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-red-700">
                              {isSelf
                                ? 'Remove your own access?'
                                : 'Confirm removal?'}
                            </span>
                            <button
                              type="button"
                              disabled={isBusy || !canRemoveAny}
                              onClick={() => handleRemoveAdmin(record.email)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50"
                            >
                              {isBusy ? 'Removing...' : 'Confirm Remove'}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmRemoveEmail(null)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canRemoveAny || isBusy}
                            onClick={() => setConfirmRemoveEmail(record.email)}
                            title={
                              canRemoveAny
                                ? `Remove ${record.email}`
                                : 'Cannot remove the last remaining admin'
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-slate-300 rounded-lg hover:border-red-300 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {revokedAdmins.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-900 pb-3 border-b border-slate-200">
                Previously Removed Admins
              </h3>
              <div className="divide-y divide-slate-100">
                {revokedAdmins.map((record) => (
                  <div
                    key={record.id}
                    className="py-3 first:pt-3 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-mono text-slate-600 truncate">
                        {record.email}
                      </div>
                      <div className="text-xs text-slate-400">Revoked</div>
                    </div>
                    <button
                      type="button"
                      disabled={busyEmail === record.email}
                      onClick={() => handleRestoreAdmin(record)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {busyEmail === record.email ? 'Restoring...' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
