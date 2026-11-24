import React, { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Footer } from './Footer';

interface SignInViewProps {
  onSignIn: () => Promise<void>;
  authError: string | null;
}

export const SignInView: React.FC<SignInViewProps> = ({
  onSignIn,
  authError,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async () => {
    setSubmitting(true);
    try {
      await onSignIn();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-slate-900">
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <div className="inline-flex items-center gap-2.5 shrink-0">
            <img
              src="/logo.png"
              alt="Scalping Psych fx logo"
              className="h-8 sm:h-10 w-auto rounded-md object-contain shrink-0"
            />
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap font-[var(--font-display)]">
              Scalping Psych fx
            </span>
          </div>
          <span className="hidden sm:inline text-xs text-slate-500 whitespace-nowrap">
            Member Community Portal
          </span>
          <button
            type="button"
            onClick={handleClick}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            {submitting ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-amber-800 mb-3">
                XAUUSD Research & Community Portal
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-slate-900 leading-[1.12] mb-5">
                Structured Gold Analysis and Desk Updates for Members
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
                Sign in with your Google account to access full XAUUSD trade
                strategy notes, playbook updates, live group meeting schedules,
                and community announcements.
              </p>

              {authError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 max-w-xl">
                  {authError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 mb-10">
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={submitting}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
                >
                  <span>
                    {submitting
                      ? 'Connecting to Google...'
                      : 'Sign in with Google'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  Read-only member access
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200 max-w-xl">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    XAUUSD Notes
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Levels & strategy
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Strategy Log
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Playbook updates
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Live Meetings
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Schedule & recaps
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Desk Briefs
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Alerts & notes
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                <img
                  src="/src/assets/images/gold_market_hero_1795499242705.jpg"
                  alt="Obsidian stone and 24k gold bullion editorial visual"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-xs font-mono text-amber-300 mb-1">
                    XAUUSD · Institutional Discipline
                  </p>
                  <p className="text-sm text-slate-200 leading-relaxed max-w-md">
                    Centralized archive for gold market breakdowns, session
                    reviews, and risk execution rules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
