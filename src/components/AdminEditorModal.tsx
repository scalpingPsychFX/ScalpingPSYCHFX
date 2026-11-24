import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { X } from 'lucide-react';
import {
  saveAnnouncement,
  saveGoldAnalysis,
  saveMeeting,
  savePortalNote,
  saveStrategyUpdate,
  todayIsoDate,
} from '../lib/portalService';
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

export type EditorTarget =
  | { kind: 'gold'; item?: GoldAnalysis }
  | { kind: 'strategy'; item?: StrategyUpdate }
  | { kind: 'meeting'; item?: Meeting }
  | { kind: 'announcement'; item?: Announcement }
  | { kind: 'note'; noteType: PortalNoteType; item?: PortalNote };

interface AdminEditorModalProps {
  target: EditorTarget | null;
  user: User;
  onClose: () => void;
  onSaved?: (message: string) => void;
}

export const AdminEditorModal: React.FC<AdminEditorModalProps> = ({
  target,
  user,
  onClose,
  onSaved,
}) => {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Gold Analysis fields
  const [gTitle, setGTitle] = useState('');
  const [gDate, setGDate] = useState(todayIsoDate());
  const [gPair, setGPair] = useState('XAUUSD');
  const [gBias, setGBias] = useState<MarketBias>('Bullish');
  const [gTimeframe, setGTimeframe] = useState('H4 / M15');
  const [gEntryZone, setGEntryZone] = useState('');
  const [gInvalidation, setGInvalidation] = useState('');
  const [gTargets, setGTargets] = useState('');
  const [gNotes, setGNotes] = useState('');

  // Strategy Update fields
  const [sTitle, setSTitle] = useState('');
  const [sDate, setSDate] = useState(todayIsoDate());
  const [sCategory, setSCategory] = useState<StrategyCategory>('Execution Rule');
  const [sSummary, setSSummary] = useState('');
  const [sDetails, setSDetails] = useState('');

  // Meeting fields
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(todayIsoDate());
  const [mTime, setMTime] = useState('14:00 UTC');
  const [mLink, setMLink] = useState('');
  const [mStatus, setMStatus] = useState<MeetingStatus>('upcoming');
  const [mAgendaOrRecap, setMAgendaOrRecap] = useState('');
  const [mRecordingLink, setMRecordingLink] = useState('');

  // Announcement fields
  const [aTitle, setATitle] = useState('');
  const [aDate, setADate] = useState(todayIsoDate());
  const [aPriority, setAPriority] = useState<AnnouncementPriority>('Normal');
  const [aPinned, setAPinned] = useState(false);
  const [aBody, setABody] = useState('');

  // Portal Note / Personal Details fields
  const [nType, setNType] = useState<PortalNoteType>('important_note');
  const [nTitle, setNTitle] = useState('');
  const [nDate, setNDate] = useState(todayIsoDate());
  const [nContent, setNContent] = useState('');
  const [nTraderName, setNTraderName] = useState('');
  const [nTradingStyle, setNTradingStyle] = useState('');
  const [nActiveSessions, setNActiveSessions] = useState('');
  const [nContactChannel, setNContactChannel] = useState('');
  const [nRiskRules, setNRiskRules] = useState('');

  useEffect(() => {
    if (!target) return;
    setErrorMsg(null);
    setSaving(false);

    if (target.kind === 'gold') {
      const it = target.item;
      setGTitle(it?.title ?? '');
      setGDate(it?.date ?? todayIsoDate());
      setGPair(it?.pair ?? 'XAUUSD');
      setGBias(it?.bias ?? 'Bullish');
      setGTimeframe(it?.timeframe ?? 'H4 / M15');
      setGEntryZone(it?.entryZone ?? '');
      setGInvalidation(it?.invalidation ?? '');
      setGTargets(it?.targets ?? '');
      setGNotes(it?.strategyNotes ?? '');
    } else if (target.kind === 'strategy') {
      const it = target.item;
      setSTitle(it?.title ?? '');
      setSDate(it?.date ?? todayIsoDate());
      setSCategory(it?.category ?? 'Execution Rule');
      setSSummary(it?.summary ?? '');
      setSDetails(it?.details ?? '');
    } else if (target.kind === 'meeting') {
      const it = target.item;
      setMTitle(it?.title ?? '');
      setMDate(it?.date ?? todayIsoDate());
      setMTime(it?.time ?? '14:00 UTC');
      setMLink(it?.link ?? '');
      setMStatus(it?.status ?? 'upcoming');
      setMAgendaOrRecap(it?.agendaOrRecap ?? '');
      setMRecordingLink(it?.recordingLink ?? '');
    } else if (target.kind === 'announcement') {
      const it = target.item;
      setATitle(it?.title ?? '');
      setADate(it?.date ?? todayIsoDate());
      setAPriority(it?.priority ?? 'Normal');
      setAPinned(it?.pinned ?? false);
      setABody(it?.body ?? '');
    } else if (target.kind === 'note') {
      const it = target.item;
      setNType(it?.noteType ?? target.noteType);
      setNTitle(
        it?.title ??
          (target.noteType === 'profile'
            ? 'Lead Trader & Desk Profile'
            : ''),
      );
      setNDate(it?.date ?? todayIsoDate());
      setNContent(it?.content ?? '');
      setNTraderName(it?.traderName ?? '');
      setNTradingStyle(it?.tradingStyle ?? '');
      setNActiveSessions(it?.activeSessions ?? '');
      setNContactChannel(it?.contactChannel ?? '');
      setNRiskRules(it?.riskRules ?? '');
    }
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [target, saving, onClose]);

  if (!target) return null;

  const isEditing = Boolean(target.item);

  const heading = (() => {
    if (target.kind === 'gold')
      return isEditing ? 'Edit Gold (XAUUSD) Analysis' : 'New Gold (XAUUSD) Analysis';
    if (target.kind === 'strategy')
      return isEditing ? 'Edit Strategy Update' : 'New Strategy Update';
    if (target.kind === 'meeting')
      return isEditing ? 'Edit Group Meeting' : 'Schedule Group Meeting';
    if (target.kind === 'announcement')
      return isEditing ? 'Edit Announcement' : 'New Announcement';
    return target.noteType === 'profile'
      ? 'Edit Personal & Trading Desk Details'
      : isEditing
        ? 'Edit Important Note'
        : 'New Important Note';
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);
    try {
      if (target.kind === 'gold') {
        if (!gTitle.trim() || !gNotes.trim()) {
          setErrorMsg('Title and trade strategy notes are required.');
          setSaving(false);
          return;
        }
        await saveGoldAnalysis(
          user,
          {
            title: gTitle,
            date: gDate,
            pair: gPair,
            bias: gBias,
            timeframe: gTimeframe,
            entryZone: gEntryZone,
            invalidation: gInvalidation,
            targets: gTargets,
            strategyNotes: gNotes,
          },
          target.item?.id,
        );
        onSaved?.(isEditing ? 'Gold analysis updated.' : 'Gold analysis published.');
      } else if (target.kind === 'strategy') {
        if (!sTitle.trim() || !sSummary.trim() || !sDetails.trim()) {
          setErrorMsg('Title, summary, and detailed notes are required.');
          setSaving(false);
          return;
        }
        await saveStrategyUpdate(
          user,
          {
            title: sTitle,
            date: sDate,
            category: sCategory,
            summary: sSummary,
            details: sDetails,
          },
          target.item?.id,
        );
        onSaved?.(isEditing ? 'Strategy update saved.' : 'Strategy update published.');
      } else if (target.kind === 'meeting') {
        if (!mTitle.trim() || !mTime.trim()) {
          setErrorMsg('Meeting title and time are required.');
          setSaving(false);
          return;
        }
        await saveMeeting(
          user,
          {
            title: mTitle,
            date: mDate,
            time: mTime,
            link: mLink,
            status: mStatus,
            agendaOrRecap: mAgendaOrRecap,
            recordingLink: mRecordingLink,
          },
          target.item?.id,
        );
        onSaved?.(isEditing ? 'Meeting updated.' : 'Meeting saved.');
      } else if (target.kind === 'announcement') {
        if (!aTitle.trim() || !aBody.trim()) {
          setErrorMsg('Title and announcement message are required.');
          setSaving(false);
          return;
        }
        await saveAnnouncement(
          user,
          {
            title: aTitle,
            date: aDate,
            priority: aPriority,
            pinned: aPinned,
            body: aBody,
          },
          target.item?.id,
        );
        onSaved?.(isEditing ? 'Announcement updated.' : 'Announcement published.');
      } else if (target.kind === 'note') {
        if (!nTitle.trim() || !nContent.trim()) {
          setErrorMsg('Title and content are required.');
          setSaving(false);
          return;
        }
        await savePortalNote(
          user,
          {
            noteType: nType,
            title: nTitle,
            date: nDate,
            content: nContent,
            traderName: nTraderName,
            tradingStyle: nTradingStyle,
            activeSessions: nActiveSessions,
            contactChannel: nContactChannel,
            riskRules: nRiskRules,
          },
          target.item?.id,
        );
        onSaved?.(isEditing ? 'Details updated.' : 'Note saved.');
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to save changes. Verify your admin permissions.',
      );
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20';
  const labelClass = 'block text-xs font-medium text-slate-700 mb-1.5';

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
        aria-labelledby="admin-editor-title"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2
            id="admin-editor-title"
            className="text-lg font-semibold text-slate-900"
          >
            {heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close editor"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          {target.kind === 'gold' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Analysis Title</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={gTitle}
                    onChange={(e) => setGTitle(e.target.value)}
                    placeholder="e.g., XAUUSD London Open Liquidity Sweep & H4 Orderblock"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    required
                    value={gDate}
                    onChange={(e) => setGDate(e.target.value)}
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Instrument</label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={gPair}
                    onChange={(e) => setGPair(e.target.value.toUpperCase())}
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Directional Bias</label>
                  <select
                    value={gBias}
                    onChange={(e) => setGBias(e.target.value as MarketBias)}
                    className={inputClass}
                  >
                    <option value="Bullish">Bullish</option>
                    <option value="Bearish">Bearish</option>
                    <option value="Neutral">Neutral</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Timeframes</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={gTimeframe}
                    onChange={(e) => setGTimeframe(e.target.value)}
                    placeholder="H4 / M15 / M5"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Entry Zone (optional)</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={gEntryZone}
                    onChange={(e) => setGEntryZone(e.target.value)}
                    placeholder="2642.00 - 2646.50"
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Invalidation (optional)</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={gInvalidation}
                    onChange={(e) => setGInvalidation(e.target.value)}
                    placeholder="Below 2636.00 H1 close"
                    className={`${inputClass} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Targets (optional)</label>
                  <input
                    type="text"
                    maxLength={160}
                    value={gTargets}
                    onChange={(e) => setGTargets(e.target.value)}
                    placeholder="2660.00 / 2675.00"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Trade Strategy Notes (Markdown supported)
                </label>
                <textarea
                  required
                  rows={8}
                  maxLength={15000}
                  value={gNotes}
                  onChange={(e) => setGNotes(e.target.value)}
                  placeholder="Write your full XAUUSD bias breakdown, liquidity levels, session timing, confirmation criteria, and risk management plan..."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </div>
            </>
          )}

          {target.kind === 'strategy' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Strategy Update Title</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={sTitle}
                    onChange={(e) => setSTitle(e.target.value)}
                    placeholder="e.g., NY Session News Filter & Spread Buffer"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    required
                    value={sDate}
                    onChange={(e) => setSDate(e.target.value)}
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={sCategory}
                  onChange={(e) =>
                    setSCategory(e.target.value as StrategyCategory)
                  }
                  className={inputClass}
                >
                  <option value="Execution Rule">Execution Rule</option>
                  <option value="Risk Management">Risk Management</option>
                  <option value="Session Playbook">Session Playbook</option>
                  <option value="Market Regime">Market Regime</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Short Summary</label>
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={sSummary}
                  onChange={(e) => setSSummary(e.target.value)}
                  placeholder="One-sentence takeaway for quick reference..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Full Strategy Details</label>
                <textarea
                  required
                  rows={7}
                  maxLength={12000}
                  value={sDetails}
                  onChange={(e) => setSDetails(e.target.value)}
                  placeholder="Document the exact entry checklist, invalidation rule, or parameter adjustment..."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </div>
            </>
          )}

          {target.kind === 'meeting' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Session Title</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={mTitle}
                    onChange={(e) => setMTitle(e.target.value)}
                    placeholder="e.g., Weekly XAUUSD Outlook & Live Chart Review"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={mStatus}
                    onChange={(e) =>
                      setMStatus(e.target.value as MeetingStatus)
                    }
                    className={inputClass}
                  >
                    <option value="upcoming">Upcoming Schedule</option>
                    <option value="completed">Completed (History)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    required
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Time (with Timezone)</label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={mTime}
                    onChange={(e) => setMTime(e.target.value)}
                    placeholder="e.g., 14:00 UTC / 09:00 EST"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Meeting Join Link</label>
                <input
                  type="url"
                  maxLength={500}
                  value={mLink}
                  onChange={(e) => setMLink(e.target.value)}
                  placeholder="https://meet.google.com/... or https://zoom.us/..."
                  className={inputClass}
                />
              </div>

              {mStatus === 'completed' && (
                <div>
                  <label className={labelClass}>
                    Recording / Replay Link (optional)
                  </label>
                  <input
                    type="url"
                    maxLength={500}
                    value={mRecordingLink}
                    onChange={(e) => setMRecordingLink(e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>
                  {mStatus === 'upcoming'
                    ? 'Meeting Agenda & Prep Notes'
                    : 'Meeting History Recap & Key Takeaways'}
                </label>
                <textarea
                  rows={6}
                  maxLength={8000}
                  value={mAgendaOrRecap}
                  onChange={(e) => setMAgendaOrRecap(e.target.value)}
                  placeholder="Outline topics, pairs reviewed, and Q&A summary..."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </div>
            </>
          )}

          {target.kind === 'announcement' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Announcement Title</label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={aTitle}
                    onChange={(e) => setATitle(e.target.value)}
                    placeholder="e.g., FOMC Week Schedule Adjustment"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    required
                    value={aDate}
                    onChange={(e) => setADate(e.target.value)}
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    value={aPriority}
                    onChange={(e) =>
                      setAPriority(e.target.value as AnnouncementPriority)
                    }
                    className={inputClass}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Important">Important</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <label className="flex items-center gap-2.5 pt-5 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aPinned}
                    onChange={(e) => setAPinned(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-600"
                  />
                  Pin announcement to top
                </label>
              </div>

              <div>
                <label className={labelClass}>Message</label>
                <textarea
                  required
                  rows={6}
                  maxLength={8000}
                  value={aBody}
                  onChange={(e) => setABody(e.target.value)}
                  placeholder="Share schedule changes, community updates, or market alerts..."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </div>
            </>
          )}

          {target.kind === 'note' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    {nType === 'profile' ? 'Profile Headline' : 'Note Title'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={nTitle}
                    onChange={(e) => setNTitle(e.target.value)}
                    placeholder={
                      nType === 'profile'
                        ? 'Lead Analyst & Desk Overview'
                        : 'e.g., Broker Spread & Slippage Guidelines'
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="date"
                    required
                    value={nDate}
                    onChange={(e) => setNDate(e.target.value)}
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </div>
              </div>

              {nType === 'profile' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className={labelClass}>Trader / Mentor Name</label>
                    <input
                      type="text"
                      maxLength={120}
                      value={nTraderName}
                      onChange={(e) => setNTraderName(e.target.value)}
                      placeholder="Your display name or desk alias"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Primary Style</label>
                    <input
                      type="text"
                      maxLength={160}
                      value={nTradingStyle}
                      onChange={(e) => setNTradingStyle(e.target.value)}
                      placeholder="e.g., XAUUSD Intraday Scalping & Liquidity"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Active Sessions</label>
                    <input
                      type="text"
                      maxLength={160}
                      value={nActiveSessions}
                      onChange={(e) => setNActiveSessions(e.target.value)}
                      placeholder="e.g., London Open & NY Overlap (07:00-16:00 UTC)"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact / Community Handle</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={nContactChannel}
                      onChange={(e) => setNContactChannel(e.target.value)}
                      placeholder="e.g., Telegram / Discord / Desk Email"
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Core Risk Parameters</label>
                    <input
                      type="text"
                      maxLength={2000}
                      value={nRiskRules}
                      onChange={(e) => setNRiskRules(e.target.value)}
                      placeholder="e.g., Max 0.5%-1% risk per trade, hard daily drawdown stop at 2%"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  {nType === 'profile'
                    ? 'Personal Bio & Desk Philosophy'
                    : 'Important Note Content (Markdown supported)'}
                </label>
                <textarea
                  required
                  rows={6}
                  maxLength={10000}
                  value={nContent}
                  onChange={(e) => setNContent(e.target.value)}
                  placeholder="Write detailed guidance, personal trading details, or essential community rules..."
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
