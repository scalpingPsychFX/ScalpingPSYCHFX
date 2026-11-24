import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  LogOut,
  Plus,
  Search,
  Video,
} from 'lucide-react';
import {
  deleteAnnouncement,
  deleteGoldAnalysis,
  deleteMeeting,
  deletePortalNote,
  deleteStrategyUpdate,
} from '../lib/portalService';
import type {
  AdminEmailRecord,
  Announcement,
  GoldAnalysis,
  MarketBias,
  Meeting,
  PaidStrategy,
  PaymentRequest,
  PaymentSettings,
  PortalNote,
  StrategyUnlock,
  StrategyUpdate,
} from '../types';
import { AdminEditorModal, type EditorTarget } from './AdminEditorModal';
import { AdminRowActions } from './AdminRowActions';
import { AdminSettingsView } from './AdminSettingsView';
import { DetailModal, type DetailItem } from './DetailModal';
import { Footer } from './Footer';
import { MarkdownContent } from './MarkdownContent';
import { PaidStrategiesView } from './PaidStrategiesView';
import { TradingViewGoldChart } from './TradingViewGoldChart';
import { TradingViewTechnicalSummary } from './TradingViewTechnicalSummary';

type ViewTab =
  | 'dashboard'
  | 'gold'
  | 'strategy'
  | 'meetings'
  | 'announcements'
  | 'paid'
  | 'notes'
  | 'admin_settings';

interface PortalWorkspaceProps {
  user: User;
  isAdmin: boolean;
  loadingData: boolean;
  goldAnalyses: GoldAnalysis[];
  strategyUpdates: StrategyUpdate[];
  meetings: Meeting[];
  announcements: Announcement[];
  portalNotes: PortalNote[];
  paidStrategies: PaidStrategy[];
  paymentSettings: PaymentSettings | null;
  paymentRequests: PaymentRequest[];
  strategyUnlocks: StrategyUnlock[];
  adminEmails: AdminEmailRecord[];
  onSignOut: () => Promise<void>;
}

const BIAS_COLOR: Record<MarketBias, string> = {
  Bullish: 'text-emerald-700',
  Bearish: 'text-red-700',
  Neutral: 'text-slate-600',
};

export const PortalWorkspace: React.FC<PortalWorkspaceProps> = ({
  user,
  isAdmin,
  loadingData,
  goldAnalyses,
  strategyUpdates,
  meetings,
  announcements,
  portalNotes,
  paidStrategies,
  paymentSettings,
  paymentRequests,
  strategyUnlocks,
  adminEmails,
  onSignOut,
}) => {
  const [activeView, setActiveView] = useState<ViewTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [biasFilter, setBiasFilter] = useState<'All' | MarketBias>('All');
  const [meetingFilter, setMeetingFilter] = useState<
    'all' | 'upcoming' | 'completed'
  >('all');

  useEffect(() => {
    if (!isAdmin && activeView === 'admin_settings') {
      setActiveView('dashboard');
    }
  }, [isAdmin, activeView]);

  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.status === 'upcoming')
        .sort((a, b) => a.date.localeCompare(b.date)),
    [meetings],
  );

  const completedMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.status === 'completed')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [meetings],
  );

  const profileNote = useMemo(
    () => portalNotes.find((n) => n.noteType === 'profile') ?? null,
    [portalNotes],
  );

  const importantNotes = useMemo(
    () => portalNotes.filter((n) => n.noteType === 'important_note'),
    [portalNotes],
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredGold = useMemo(() => {
    return goldAnalyses.filter((item) => {
      if (biasFilter !== 'All' && item.bias !== biasFilter) return false;
      if (!normalizedSearch) return true;
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.strategyNotes.toLowerCase().includes(normalizedSearch) ||
        item.pair.toLowerCase().includes(normalizedSearch) ||
        item.date.includes(normalizedSearch)
      );
    });
  }, [goldAnalyses, biasFilter, normalizedSearch]);

  const filteredStrategy = useMemo(() => {
    return strategyUpdates.filter((item) => {
      if (!normalizedSearch) return true;
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.summary.toLowerCase().includes(normalizedSearch) ||
        item.details.toLowerCase().includes(normalizedSearch) ||
        item.category.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [strategyUpdates, normalizedSearch]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((item) => {
      if (meetingFilter !== 'all' && item.status !== meetingFilter) return false;
      if (!normalizedSearch) return true;
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.agendaOrRecap.toLowerCase().includes(normalizedSearch) ||
        item.date.includes(normalizedSearch)
      );
    });
  }, [meetings, meetingFilter, normalizedSearch]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (!normalizedSearch) return true;
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.body.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [announcements, normalizedSearch]);

  const filteredNotes = useMemo(() => {
    return importantNotes.filter((item) => {
      if (!normalizedSearch) return true;
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.content.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [importantNotes, normalizedSearch]);

  const filteredPaidStrategies = useMemo(() => {
    return paidStrategies.filter((item) => {
      if (!normalizedSearch) return true;
      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [paidStrategies, normalizedSearch]);

  const navItems: Array<{ id: ViewTab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'gold', label: 'Gold Analysis' },
    { id: 'strategy', label: 'Strategy' },
    { id: 'meetings', label: 'Meetings' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'paid', label: 'Paid Strategies' },
    ...(isAdmin
      ? [{ id: 'admin_settings' as const, label: 'Admin Settings' }]
      : []),
  ];

  const handleOpenEditFromDetail = (detail: DetailItem) => {
    if (detail.kind === 'gold')
      setEditorTarget({ kind: 'gold', item: detail.item });
    else if (detail.kind === 'strategy')
      setEditorTarget({ kind: 'strategy', item: detail.item });
    else if (detail.kind === 'meeting')
      setEditorTarget({ kind: 'meeting', item: detail.item });
    else if (detail.kind === 'announcement')
      setEditorTarget({ kind: 'announcement', item: detail.item });
    else
      setEditorTarget({
        kind: 'note',
        noteType: detail.item.noteType,
        item: detail.item,
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-slate-900">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="w-full border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className="inline-flex items-center gap-2.5 text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-[var(--font-display)] hover:text-amber-800 transition-colors"
          >
            <img
              src="/logo.png"
              alt="Scalping Psych fx logo"
              className="h-8 sm:h-10 w-auto rounded-md object-contain shrink-0"
            />
            <span>Scalping Psych fx</span>
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6"
          >
            {navItems.map((nav) => {
              const isActive = activeView === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveView(nav.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-amber-700 text-slate-900'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {nav.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden lg:inline text-xs text-slate-500 truncate max-w-[180px]">
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {navItems.map((nav) => {
            const isActive = activeView === nav.id;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => setActiveView(nav.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {nav.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActiveView('notes')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              activeView === 'notes'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Notes & Desk
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Workspace Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{isAdmin ? 'Admin Desk' : 'Member Portal (Read-Only)'}</span>
              <span aria-hidden="true">·</span>
              <span>{user.email}</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setActiveView('notes')}
                className="text-amber-800 hover:underline font-medium"
              >
                Personal Details & Notes
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {activeView === 'dashboard' && 'Community Dashboard'}
              {activeView === 'gold' && 'Gold (XAUUSD) Analysis'}
              {activeView === 'strategy' && 'Strategy Updates'}
              {activeView === 'meetings' && 'Group Meetings & History'}
              {activeView === 'announcements' && 'Community Announcements'}
              {activeView === 'paid' && 'Paid Strategies'}
              {activeView === 'notes' && 'Important Notes & Personal Details'}
              {isAdmin && activeView === 'admin_settings' && 'Admin Settings'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, levels, dates..."
                className="w-full sm:w-60 pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
              />
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditorTarget({ kind: 'gold' })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Gold Analysis
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTarget({ kind: 'strategy' })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Strategy
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTarget({ kind: 'meeting' })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Meeting
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTarget({ kind: 'announcement' })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Announcement
                </button>
              </div>
            )}
          </div>
        </div>

        {toastMessage && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {toastMessage}
          </div>
        )}

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-24 rounded-xl bg-white border border-slate-200 animate-pulse p-5"
              />
            ))}
          </div>
        ) : (
          <>
            {/* DASHBOARD VIEW */}
            {activeView === 'dashboard' && (
              <div className="space-y-8">
                {/* 4-Column KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveView('gold')}
                    className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                  >
                    <div className="text-xs text-slate-500 mb-1">
                      Gold Analysis (XAUUSD)
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                      {goldAnalyses.length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                      {goldAnalyses[0]
                        ? `Latest ${goldAnalyses[0].date}`
                        : 'No posts yet'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView('strategy')}
                    className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                  >
                    <div className="text-xs text-slate-500 mb-1">
                      Strategy Updates
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                      {strategyUpdates.length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {strategyUpdates[0]
                        ? `${strategyUpdates[0].category}`
                        : 'No updates yet'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView('meetings')}
                    className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                  >
                    <div className="text-xs text-slate-500 mb-1">
                      Upcoming Meetings
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                      {upcomingMeetings.length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums truncate">
                      {upcomingMeetings[0]
                        ? `${upcomingMeetings[0].date} · ${upcomingMeetings[0].time}`
                        : `${completedMeetings.length} past sessions`}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView('announcements')}
                    className="text-left bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                  >
                    <div className="text-xs text-slate-500 mb-1">
                      Announcements
                    </div>
                    <div className="text-2xl font-semibold text-slate-900 font-mono tabular-nums">
                      {announcements.length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
                      {announcements[0]
                        ? `Latest ${announcements[0].date}`
                        : 'No announcements'}
                    </div>
                  </button>
                </div>

                {/* Main 2-Column Portal Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Primary Content Column: Gold Analysis, Strategy Updates, Meetings */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* 1. Gold Analysis Section */}
                    <section className="bg-white border border-slate-200 rounded-xl p-6">
                      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Gold Analysis (XAUUSD)
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Latest market breakdowns and trade strategy notes
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditorTarget({ kind: 'gold' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Post
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveView('gold')}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-amber-800 whitespace-nowrap"
                          >
                            View all
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="pt-5">
                        <TradingViewGoldChart heightClass="h-[380px] sm:h-[440px]" />
                      </div>

                      {filteredGold.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-slate-600 mb-3">
                            {normalizedSearch
                              ? 'No Gold Analysis posts match your search.'
                              : 'No XAUUSD analysis posts have been published yet.'}
                          </p>
                          {isAdmin && !normalizedSearch && (
                            <button
                              type="button"
                              onClick={() => setEditorTarget({ kind: 'gold' })}
                              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              Publish First XAUUSD Analysis
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {filteredGold.slice(0, 3).map((post) => (
                            <article key={post.id} className="py-5 first:pt-5 last:pb-1">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums mb-1.5">
                                    <span className="font-semibold text-amber-800">
                                      {post.pair}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{post.date}</span>
                                    <span aria-hidden="true">·</span>
                                    <span
                                      className={`font-medium ${BIAS_COLOR[post.bias]}`}
                                    >
                                      {post.bias} Bias
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>{post.timeframe}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetailItem({ kind: 'gold', item: post })
                                    }
                                    className="text-left group"
                                  >
                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-amber-800 transition-colors">
                                      {post.title}
                                    </h3>
                                  </button>

                                  {(post.entryZone ||
                                    post.invalidation ||
                                    post.targets) && (
                                    <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono tabular-nums text-slate-600">
                                      {post.entryZone && (
                                        <span>
                                          Entry:{' '}
                                          <strong className="text-slate-900 font-medium">
                                            {post.entryZone}
                                          </strong>
                                        </span>
                                      )}
                                      {post.invalidation && (
                                        <span>
                                          Invalidation:{' '}
                                          <strong className="text-red-700 font-medium">
                                            {post.invalidation}
                                          </strong>
                                        </span>
                                      )}
                                      {post.targets && (
                                        <span>
                                          Targets:{' '}
                                          <strong className="text-emerald-700 font-medium">
                                            {post.targets}
                                          </strong>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  <p className="mt-2.5 text-sm text-slate-600 line-clamp-3 leading-relaxed">
                                    {post.strategyNotes}
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetailItem({ kind: 'gold', item: post })
                                    }
                                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline"
                                  >
                                    Read full strategy notes
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>

                                {isAdmin && (
                                  <AdminRowActions
                                    itemLabel={post.title}
                                    onEdit={() =>
                                      setEditorTarget({ kind: 'gold', item: post })
                                    }
                                    onDelete={async () => {
                                      await deleteGoldAnalysis(post.id);
                                      showToast('Gold analysis deleted.');
                                    }}
                                  />
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* 2. Strategy Updates Section */}
                    <section className="bg-white border border-slate-200 rounded-xl p-6">
                      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Strategy Updates
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Playbook adjustments, session rules, and execution standards
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditorTarget({ kind: 'strategy' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Post
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveView('strategy')}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-amber-800 whitespace-nowrap"
                          >
                            View all
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {filteredStrategy.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-slate-600 mb-3">
                            No strategy updates recorded yet.
                          </p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditorTarget({ kind: 'strategy' })}
                              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              Add Strategy Update
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {filteredStrategy.slice(0, 3).map((upd) => (
                            <article key={upd.id} className="py-4 first:pt-5 last:pb-1">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                                    <span className="font-medium text-amber-800">
                                      {upd.category}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono tabular-nums">
                                      {upd.date}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetailItem({ kind: 'strategy', item: upd })
                                    }
                                    className="text-left group"
                                  >
                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-amber-800 transition-colors">
                                      {upd.title}
                                    </h3>
                                  </button>
                                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                                    {upd.summary}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetailItem({ kind: 'strategy', item: upd })
                                    }
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline"
                                  >
                                    Read details
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                                {isAdmin && (
                                  <AdminRowActions
                                    itemLabel={upd.title}
                                    onEdit={() =>
                                      setEditorTarget({ kind: 'strategy', item: upd })
                                    }
                                    onDelete={async () => {
                                      await deleteStrategyUpdate(upd.id);
                                      showToast('Strategy update deleted.');
                                    }}
                                  />
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* 3. Meetings Section (Upcoming Schedule + History) */}
                    <section className="bg-white border border-slate-200 rounded-xl p-6">
                      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Meetings
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Upcoming group sessions and past meeting history
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditorTarget({ kind: 'meeting' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Post
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveView('meetings')}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-amber-800 whitespace-nowrap"
                          >
                            All meetings
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {meetings.length === 0 ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-slate-600 mb-3">
                            No group meetings scheduled yet.
                          </p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setEditorTarget({ kind: 'meeting' })}
                              className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              Schedule First Meeting
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="pt-5 space-y-6">
                          <div>
                            <h3 className="text-xs font-semibold text-slate-500 mb-3">
                              Upcoming Schedule
                            </h3>
                            {upcomingMeetings.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No upcoming sessions scheduled.
                              </p>
                            ) : (
                              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg px-4">
                                {upcomingMeetings.slice(0, 3).map((m) => (
                                  <div
                                    key={m.id}
                                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-amber-800 mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>{m.date}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{m.time}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDetailItem({ kind: 'meeting', item: m })
                                        }
                                        className="text-left text-sm font-semibold text-slate-900 hover:text-amber-800"
                                      >
                                        {m.title}
                                      </button>
                                      {m.agendaOrRecap && (
                                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                          {m.agendaOrRecap}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {m.link && (
                                        <a
                                          href={m.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
                                        >
                                          <Video className="w-3.5 h-3.5" />
                                          Join Link
                                        </a>
                                      )}
                                      {isAdmin && (
                                        <AdminRowActions
                                          itemLabel={m.title}
                                          onEdit={() =>
                                            setEditorTarget({ kind: 'meeting', item: m })
                                          }
                                          onDelete={async () => {
                                            await deleteMeeting(m.id);
                                            showToast('Meeting removed.');
                                          }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-xs font-semibold text-slate-500 mb-3">
                              Recent Meeting History
                            </h3>
                            {completedMeetings.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Completed meetings and recaps will appear here.
                              </p>
                            ) : (
                              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg px-4">
                                {completedMeetings.slice(0, 3).map((m) => (
                                  <div
                                    key={m.id}
                                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500 mb-1">
                                        <span>{m.date}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{m.time}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>Completed</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDetailItem({ kind: 'meeting', item: m })
                                        }
                                        className="text-left text-sm font-semibold text-slate-900 hover:text-amber-800"
                                      >
                                        {m.title}
                                      </button>
                                      {m.agendaOrRecap && (
                                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                          {m.agendaOrRecap}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {m.recordingLink && (
                                        <a
                                          href={m.recordingLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                                        >
                                          Replay
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                      {isAdmin && (
                                        <AdminRowActions
                                          itemLabel={m.title}
                                          onEdit={() =>
                                            setEditorTarget({ kind: 'meeting', item: m })
                                          }
                                          onDelete={async () => {
                                            await deleteMeeting(m.id);
                                            showToast('Meeting removed.');
                                          }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </section>
                  </div>

                  {/* Secondary Column: Announcements + Personal Details + Important Notes */}
                  <aside className="lg:col-span-4 space-y-8">
                    {/* 4. Announcements Section */}
                    <section className="bg-white border border-slate-200 rounded-xl p-6">
                      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">
                            Announcements
                          </h2>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Latest notices and schedule updates
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditorTarget({ kind: 'announcement' })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Post
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveView('announcements')}
                            className="text-xs font-medium text-slate-700 hover:text-amber-800 whitespace-nowrap"
                          >
                            All
                          </button>
                        </div>
                      </div>

                      {filteredAnnouncements.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-sm text-slate-600 mb-3">
                            No announcements posted yet.
                          </p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditorTarget({ kind: 'announcement' })
                              }
                              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                            >
                              Post Announcement
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {filteredAnnouncements.slice(0, 4).map((ann) => (
                            <article key={ann.id} className="py-4 first:pt-4 last:pb-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                                    {ann.pinned && (
                                      <>
                                        <span className="font-semibold text-amber-800">
                                          Pinned
                                        </span>
                                        <span aria-hidden="true">·</span>
                                      </>
                                    )}
                                    <span
                                      className={
                                        ann.priority === 'Urgent'
                                          ? 'font-semibold text-red-700'
                                          : ann.priority === 'Important'
                                            ? 'font-medium text-amber-800'
                                            : 'text-slate-600'
                                      }
                                    >
                                      {ann.priority}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono tabular-nums">
                                      {ann.date}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetailItem({
                                        kind: 'announcement',
                                        item: ann,
                                      })
                                    }
                                    className="text-left text-sm font-semibold text-slate-900 hover:text-amber-800"
                                  >
                                    {ann.title}
                                  </button>
                                  <p className="mt-1 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                    {ann.body}
                                  </p>
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="mt-2.5">
                                  <AdminRowActions
                                    itemLabel={ann.title}
                                    onEdit={() =>
                                      setEditorTarget({
                                        kind: 'announcement',
                                        item: ann,
                                      })
                                    }
                                    onDelete={async () => {
                                      await deleteAnnouncement(ann.id);
                                      showToast('Announcement deleted.');
                                    }}
                                  />
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* 5. Personal Details & Desk Profile */}
                    <section className="bg-white border border-slate-200 rounded-xl p-6">
                      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          <img
                            src="/src/assets/images/xauusd_emblem_1795499252933.jpg"
                            alt="Scalping Psych fx emblem"
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <h2 className="text-base font-semibold text-slate-900">
                              Personal & Desk Details
                            </h2>
                            <p className="text-xs text-slate-500">
                              Lead trader profile & trading hours
                            </p>
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditorTarget({
                                kind: 'note',
                                noteType: 'profile',
                                item: profileNote ?? undefined,
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                          >
                            {profileNote ? 'Edit' : 'Set Up'}
                          </button>
                        )}
                      </div>

                      {!profileNote ? (
                        <div className="py-6 text-sm text-slate-600">
                          <p className="mb-3">
                            Personal trader details and desk rules have not been
                            configured yet.
                          </p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditorTarget({
                                  kind: 'note',
                                  noteType: 'profile',
                                })
                              }
                              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                            >
                              Add Personal Details
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="pt-4 space-y-3 text-sm">
                          {profileNote.traderName && (
                            <div>
                              <div className="text-xs text-slate-500">
                                Lead Trader
                              </div>
                              <div className="font-medium text-slate-900">
                                {profileNote.traderName}
                              </div>
                            </div>
                          )}
                          {profileNote.tradingStyle && (
                            <div>
                              <div className="text-xs text-slate-500">
                                Focus & Style
                              </div>
                              <div className="text-slate-800">
                                {profileNote.tradingStyle}
                              </div>
                            </div>
                          )}
                          {profileNote.activeSessions && (
                            <div>
                              <div className="text-xs text-slate-500">
                                Active Sessions
                              </div>
                              <div className="text-slate-800 font-mono text-xs tabular-nums">
                                {profileNote.activeSessions}
                              </div>
                            </div>
                          )}
                          {profileNote.contactChannel && (
                            <div>
                              <div className="text-xs text-slate-500">
                                Direct Contact
                              </div>
                              <div className="text-slate-800">
                                {profileNote.contactChannel}
                              </div>
                            </div>
                          )}
                          {profileNote.riskRules && (
                            <div>
                              <div className="text-xs text-slate-500">
                                Risk Rules
                              </div>
                              <div className="text-slate-800 text-xs leading-relaxed">
                                {profileNote.riskRules}
                              </div>
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
                              {profileNote.content}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setDetailItem({ kind: 'note', item: profileNote })
                              }
                              className="mt-2 text-xs font-medium text-amber-800 hover:underline"
                            >
                              Read full profile
                            </button>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* 6. Important Notes Section */}
                    <section className="bg-white border border-slate-200 rounded-xl p-6">
                      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900">
                            Important Notes
                          </h2>
                          <p className="text-xs text-slate-500">
                            Essential member reminders
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditorTarget({
                                  kind: 'note',
                                  noteType: 'important_note',
                                })
                              }
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Post
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveView('notes')}
                            className="text-xs font-medium text-slate-700 hover:text-amber-800"
                          >
                            All
                          </button>
                        </div>
                      </div>

                      {importantNotes.length === 0 ? (
                        <div className="py-6 text-sm text-slate-600">
                          <p className="mb-3">No important notes posted yet.</p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditorTarget({
                                  kind: 'note',
                                  noteType: 'important_note',
                                })
                              }
                              className="px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                            >
                              Add Important Note
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200">
                          {importantNotes.slice(0, 3).map((note) => (
                            <div key={note.id} className="py-3.5 first:pt-4 last:pb-1">
                              <div className="text-xs font-mono tabular-nums text-slate-500 mb-1">
                                {note.date}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setDetailItem({ kind: 'note', item: note })
                                }
                                className="text-left text-sm font-semibold text-slate-900 hover:text-amber-800"
                              >
                                {note.title}
                              </button>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                {note.content}
                              </p>
                              {isAdmin && (
                                <div className="mt-2">
                                  <AdminRowActions
                                    itemLabel={note.title}
                                    onEdit={() =>
                                      setEditorTarget({
                                        kind: 'note',
                                        noteType: 'important_note',
                                        item: note,
                                      })
                                    }
                                    onDelete={async () => {
                                      await deletePortalNote(note.id);
                                      showToast('Note deleted.');
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </aside>
                </div>
              </div>
            )}

            {/* GOLD ANALYSIS FULL VIEW */}
            {activeView === 'gold' && (
              <div className="space-y-6">
                <TradingViewGoldChart heightClass="h-[440px] sm:h-[520px] lg:h-[580px]" />

                <TradingViewTechnicalSummary />

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    {(['All', 'Bullish', 'Bearish', 'Neutral'] as const).map(
                      (bias) => (
                        <button
                          key={bias}
                          type="button"
                          onClick={() => setBiasFilter(bias)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                            biasFilter === bias
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {bias === 'All' ? 'All Setups' : `${bias} Bias`}
                        </button>
                      ),
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditorTarget({ kind: 'gold' })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Post
                    </button>
                  )}
                </div>

                {filteredGold.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-sm text-slate-600 mb-4">
                      No Gold Analysis posts match your current filter.
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditorTarget({ kind: 'gold' })}
                        className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                      >
                        Create Gold Analysis Post
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGold.map((post) => (
                      <article
                        key={post.id}
                        className="bg-white border border-slate-200 rounded-xl p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums mb-1.5">
                              <span className="font-semibold text-amber-800">
                                {post.pair}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{post.date}</span>
                              <span aria-hidden="true">·</span>
                              <span className={`font-medium ${BIAS_COLOR[post.bias]}`}>
                                {post.bias} Bias
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{post.timeframe}</span>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">
                              {post.title}
                            </h2>
                          </div>
                          {isAdmin && (
                            <AdminRowActions
                              itemLabel={post.title}
                              onEdit={() =>
                                setEditorTarget({ kind: 'gold', item: post })
                              }
                              onDelete={async () => {
                                await deleteGoldAnalysis(post.id);
                                showToast('Gold analysis deleted.');
                              }}
                            />
                          )}
                        </div>

                        {(post.entryZone || post.invalidation || post.targets) && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-b border-slate-100 text-xs font-mono tabular-nums">
                            <div>
                              <span className="text-slate-500 block mb-0.5">
                                Entry Zone
                              </span>
                              <span className="text-slate-900 font-medium">
                                {post.entryZone || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block mb-0.5">
                                Invalidation
                              </span>
                              <span className="text-red-700 font-medium">
                                {post.invalidation || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block mb-0.5">
                                Targets
                              </span>
                              <span className="text-emerald-700 font-medium">
                                {post.targets || '—'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="pt-4">
                          <MarkdownContent content={post.strategyNotes} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STRATEGY UPDATES FULL VIEW */}
            {activeView === 'strategy' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-600">
                    Ordered latest first · {filteredStrategy.length} updates
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditorTarget({ kind: 'strategy' })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Post
                    </button>
                  )}
                </div>

                {filteredStrategy.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-sm text-slate-600 mb-4">
                      No strategy updates found.
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditorTarget({ kind: 'strategy' })}
                        className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                      >
                        Add Strategy Update
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredStrategy.map((upd) => (
                      <article
                        key={upd.id}
                        className="bg-white border border-slate-200 rounded-xl p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                              <span className="font-medium text-amber-800">
                                {upd.category}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {upd.date}
                              </span>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">
                              {upd.title}
                            </h2>
                            <p className="text-sm font-medium text-slate-700 mt-1.5">
                              {upd.summary}
                            </p>
                          </div>
                          {isAdmin && (
                            <AdminRowActions
                              itemLabel={upd.title}
                              onEdit={() =>
                                setEditorTarget({ kind: 'strategy', item: upd })
                              }
                              onDelete={async () => {
                                await deleteStrategyUpdate(upd.id);
                                showToast('Strategy update deleted.');
                              }}
                            />
                          )}
                        </div>
                        <div className="pt-4">
                          <MarkdownContent content={upd.details} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MEETINGS FULL VIEW */}
            {activeView === 'meetings' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    {(
                      [
                        { id: 'all', label: 'All Meetings' },
                        { id: 'upcoming', label: 'Upcoming Schedule' },
                        { id: 'completed', label: 'Meeting History' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMeetingFilter(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                          meetingFilter === tab.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditorTarget({ kind: 'meeting' })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Post
                    </button>
                  )}
                </div>

                {filteredMeetings.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-sm text-slate-600 mb-4">
                      No meetings found for this filter.
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditorTarget({ kind: 'meeting' })}
                        className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                      >
                        Schedule Meeting
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredMeetings.map((m) => (
                      <article
                        key={m.id}
                        className="bg-white border border-slate-200 rounded-xl p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-500 mb-1.5">
                              <span
                                className={
                                  m.status === 'upcoming'
                                    ? 'font-semibold text-emerald-700'
                                    : 'text-slate-600'
                                }
                              >
                                {m.status === 'upcoming'
                                  ? 'Upcoming'
                                  : 'Completed'}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{m.date}</span>
                              <span aria-hidden="true">·</span>
                              <span>{m.time}</span>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">
                              {m.title}
                            </h2>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {m.link && (
                              <a
                                href={m.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
                              >
                                <Video className="w-3.5 h-3.5" />
                                Meeting Link
                              </a>
                            )}
                            {m.recordingLink && (
                              <a
                                href={m.recordingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                              >
                                Recording
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {isAdmin && (
                              <AdminRowActions
                                itemLabel={m.title}
                                onEdit={() =>
                                  setEditorTarget({ kind: 'meeting', item: m })
                                }
                                onDelete={async () => {
                                  await deleteMeeting(m.id);
                                  showToast('Meeting deleted.');
                                }}
                              />
                            )}
                          </div>
                        </div>

                        {m.agendaOrRecap && (
                          <div className="pt-4">
                            <MarkdownContent content={m.agendaOrRecap} />
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ANNOUNCEMENTS FULL VIEW */}
            {activeView === 'announcements' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-600">
                    Pinned and latest announcements first ·{' '}
                    {filteredAnnouncements.length} total
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditorTarget({ kind: 'announcement' })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Post
                    </button>
                  )}
                </div>

                {filteredAnnouncements.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-sm text-slate-600 mb-4">
                      No announcements posted yet.
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setEditorTarget({ kind: 'announcement' })}
                        className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                      >
                        Post Announcement
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAnnouncements.map((ann) => (
                      <article
                        key={ann.id}
                        className="bg-white border border-slate-200 rounded-xl p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1.5">
                              {ann.pinned && (
                                <>
                                  <span className="font-semibold text-amber-800">
                                    Pinned
                                  </span>
                                  <span aria-hidden="true">·</span>
                                </>
                              )}
                              <span
                                className={
                                  ann.priority === 'Urgent'
                                    ? 'font-semibold text-red-700'
                                    : ann.priority === 'Important'
                                      ? 'font-medium text-amber-800'
                                      : 'text-slate-600'
                                }
                              >
                                {ann.priority}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {ann.date}
                              </span>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">
                              {ann.title}
                            </h2>
                          </div>
                          {isAdmin && (
                            <AdminRowActions
                              itemLabel={ann.title}
                              onEdit={() =>
                                setEditorTarget({
                                  kind: 'announcement',
                                  item: ann,
                                })
                              }
                              onDelete={async () => {
                                await deleteAnnouncement(ann.id);
                                showToast('Announcement deleted.');
                              }}
                            />
                          )}
                        </div>
                        <div className="pt-4">
                          <MarkdownContent content={ann.body} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* IMPORTANT NOTES & PERSONAL DETAILS FULL VIEW */}
            {activeView === 'notes' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <img
                        src="/src/assets/images/xauusd_emblem_1795499252933.jpg"
                        alt="Scalping Psych fx emblem"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Personal & Trading Desk Details
                        </h2>
                        <p className="text-xs text-slate-500">
                          Mentor profile, active hours, and contact details
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditorTarget({
                            kind: 'note',
                            noteType: 'profile',
                            item: profileNote ?? undefined,
                          })
                        }
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
                      >
                        {profileNote ? 'Edit Profile' : 'Set Up Profile'}
                      </button>
                    )}
                  </div>

                  {!profileNote ? (
                    <div className="py-8 text-sm text-slate-600">
                      No personal details saved yet.
                    </div>
                  ) : (
                    <div className="pt-5 space-y-4 text-sm">
                      {profileNote.traderName && (
                        <div>
                          <div className="text-xs text-slate-500">Lead Trader</div>
                          <div className="font-semibold text-slate-900">
                            {profileNote.traderName}
                          </div>
                        </div>
                      )}
                      {profileNote.tradingStyle && (
                        <div>
                          <div className="text-xs text-slate-500">Trading Style</div>
                          <div className="text-slate-800">
                            {profileNote.tradingStyle}
                          </div>
                        </div>
                      )}
                      {profileNote.activeSessions && (
                        <div>
                          <div className="text-xs text-slate-500">Active Sessions</div>
                          <div className="font-mono text-xs text-slate-800">
                            {profileNote.activeSessions}
                          </div>
                        </div>
                      )}
                      {profileNote.contactChannel && (
                        <div>
                          <div className="text-xs text-slate-500">Contact Channel</div>
                          <div className="text-slate-800">
                            {profileNote.contactChannel}
                          </div>
                        </div>
                      )}
                      {profileNote.riskRules && (
                        <div>
                          <div className="text-xs text-slate-500">Core Risk Rules</div>
                          <div className="text-slate-800">{profileNote.riskRules}</div>
                        </div>
                      )}
                      <div className="pt-4 border-t border-slate-100">
                        <MarkdownContent content={profileNote.content} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Important Notes
                    </h2>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditorTarget({
                            kind: 'note',
                            noteType: 'important_note',
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Post
                      </button>
                    )}
                  </div>

                  {filteredNotes.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                      <p className="text-sm text-slate-600 mb-3">
                        No important notes published yet.
                      </p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditorTarget({
                              kind: 'note',
                              noteType: 'important_note',
                            })
                          }
                          className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                        >
                          Create Important Note
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <article
                        key={note.id}
                        className="bg-white border border-slate-200 rounded-xl p-6"
                      >
                        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                          <div>
                            <div className="text-xs font-mono tabular-nums text-slate-500 mb-1">
                              {note.date}
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {note.title}
                            </h3>
                          </div>
                          {isAdmin && (
                            <AdminRowActions
                              itemLabel={note.title}
                              onEdit={() =>
                                setEditorTarget({
                                  kind: 'note',
                                  noteType: 'important_note',
                                  item: note,
                                })
                              }
                              onDelete={async () => {
                                await deletePortalNote(note.id);
                                showToast('Note deleted.');
                              }}
                            />
                          )}
                        </div>
                        <div className="pt-4">
                          <MarkdownContent content={note.content} />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PAID STRATEGIES VIEW */}
            {activeView === 'paid' && (
              <PaidStrategiesView
                user={user}
                isAdmin={isAdmin}
                paidStrategies={filteredPaidStrategies}
                paymentSettings={paymentSettings}
                paymentRequests={paymentRequests}
                strategyUnlocks={strategyUnlocks}
                onToast={showToast}
              />
            )}

            {/* ADMIN SETTINGS VIEW (Strictly Admins Only) */}
            {isAdmin && activeView === 'admin_settings' && (
              <AdminSettingsView
                user={user}
                adminEmails={adminEmails}
                onToast={showToast}
              />
            )}
          </>
        )}
      </main>

      <Footer />

      <AdminEditorModal
        target={editorTarget}
        user={user}
        onClose={() => setEditorTarget(null)}
        onSaved={showToast}
      />

      <DetailModal
        detail={detailItem}
        isAdmin={isAdmin}
        onClose={() => setDetailItem(null)}
        onEdit={handleOpenEditFromDetail}
      />
    </div>
  );
};
