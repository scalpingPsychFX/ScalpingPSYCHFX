import React, { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import {
  checkIsAdmin,
  sortAnnouncementsLatestFirst,
  subscribeCollection,
} from './lib/portalService';
import {
  subscribePaidStrategies,
  subscribePaymentRequests,
  subscribePaymentSettings,
  subscribeStrategyUnlocks,
} from './lib/paidStrategiesService';
import {
  ensureAdminRosterSeeded,
  subscribeAdminEmails,
  subscribeMyAdminEmailStatus,
} from './lib/adminService';
import type {
  AdminEmailRecord,
  Announcement,
  GoldAnalysis,
  Meeting,
  PaidStrategy,
  PaymentRequest,
  PaymentSettings,
  PortalNote,
  StrategyUnlock,
  StrategyUpdate,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { PortalWorkspace } from './components/PortalWorkspace';
import { SignInView } from './components/SignInView';

const PortalRoot: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [roleReady, setRoleReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<Error | null>(null);

  const [goldAnalyses, setGoldAnalyses] = useState<GoldAnalysis[]>([]);
  const [strategyUpdates, setStrategyUpdates] = useState<StrategyUpdate[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [portalNotes, setPortalNotes] = useState<PortalNote[]>([]);
  const [paidStrategies, setPaidStrategies] = useState<PaidStrategy[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [strategyUnlocks, setStrategyUnlocks] = useState<StrategyUnlock[]>([]);
  const [adminEmails, setAdminEmails] = useState<AdminEmailRecord[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSplashDone(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setRoleReady(false);
      setUser(nextUser);
      if (nextUser) {
        try {
          const adminStatus = await checkIsAdmin(nextUser);
          setIsAdmin(adminStatus);
          if (adminStatus) {
            void ensureAdminRosterSeeded(nextUser);
          }
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setRoleReady(true);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !roleReady || !user || !user.emailVerified) return;
    return subscribeMyAdminEmailStatus(user, async () => {
      try {
        const nextAdmin = await checkIsAdmin(user);
        setIsAdmin(nextAdmin);
      } catch {
        // ignore transient check failure
      }
    });
  }, [authReady, roleReady, user]);

  useEffect(() => {
    if (!authReady || !roleReady || !user || !user.emailVerified) {
      setGoldAnalyses([]);
      setStrategyUpdates([]);
      setMeetings([]);
      setAnnouncements([]);
      setPortalNotes([]);
      setPaidStrategies([]);
      setPaymentSettings(null);
      setPaymentRequests([]);
      setStrategyUnlocks([]);
      setAdminEmails([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setDataError(null);

    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount += 1;
      if (loadedCount >= 5) {
        setLoadingData(false);
      }
    };

    const handleErr = (err: Error) => {
      setDataError(err);
      setLoadingData(false);
    };

    const unsubGold = subscribeCollection<GoldAnalysis>(
      'gold_analyses',
      (items) => {
        setGoldAnalyses(items);
        markLoaded();
      },
      handleErr,
    );

    const unsubStrategy = subscribeCollection<StrategyUpdate>(
      'strategy_updates',
      (items) => {
        setStrategyUpdates(items);
        markLoaded();
      },
      handleErr,
    );

    const unsubMeetings = subscribeCollection<Meeting>(
      'meetings',
      (items) => {
        setMeetings(items);
        markLoaded();
      },
      handleErr,
    );

    const unsubAnnouncements = subscribeCollection<Announcement>(
      'announcements',
      (items) => {
        setAnnouncements(items);
        markLoaded();
      },
      handleErr,
      sortAnnouncementsLatestFirst,
    );

    const unsubNotes = subscribeCollection<PortalNote>(
      'portal_notes',
      (items) => {
        setPortalNotes(items);
        markLoaded();
      },
      handleErr,
    );

    const unsubPaid = subscribePaidStrategies(
      (items) => setPaidStrategies(items),
      handleErr,
    );

    const unsubPaySettings = subscribePaymentSettings(
      (settings) => setPaymentSettings(settings),
      handleErr,
    );

    const unsubPayReqs = subscribePaymentRequests(
      user,
      isAdmin,
      (items) => setPaymentRequests(items),
      handleErr,
    );

    const unsubUnlocks = subscribeStrategyUnlocks(
      user,
      isAdmin,
      (items) => setStrategyUnlocks(items),
      handleErr,
    );

    let unsubAdmins: (() => void) | null = null;
    if (isAdmin) {
      unsubAdmins = subscribeAdminEmails(
        (items) => setAdminEmails(items),
        handleErr,
      );
    } else {
      setAdminEmails([]);
    }

    return () => {
      unsubGold();
      unsubStrategy();
      unsubMeetings();
      unsubAnnouncements();
      unsubNotes();
      unsubPaid();
      unsubPaySettings();
      unsubPayReqs();
      unsubUnlocks();
      if (unsubAdmins) unsubAdmins();
    };
  }, [authReady, roleReady, user, isAdmin]);

  if (dataError) {
    throw dataError;
  }

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google sign-in failed. Please try again.',
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  if (!splashDone || !authReady || (user && !roleReady)) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-slate-900">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <img
            src="/logo.png"
            alt="Scalping Psych fx logo"
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-contain mb-4 shadow-sm"
          />
          <div className="text-lg font-bold tracking-tight text-slate-900 font-[var(--font-display)]">
            Scalping Psych fx
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Loading community portal...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return <SignInView onSignIn={handleGoogleSignIn} authError={authError} />;
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F8F6] text-slate-900">
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8">
            <h1 className="text-lg font-semibold text-slate-900 mb-2">
              Email Verification Required
            </h1>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Please sign in with a verified Google account to access the community portal.
            </p>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              Return to Sign In
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <PortalWorkspace
      user={user}
      isAdmin={isAdmin}
      loadingData={loadingData}
      goldAnalyses={goldAnalyses}
      strategyUpdates={strategyUpdates}
      meetings={meetings}
      announcements={announcements}
      portalNotes={portalNotes}
      paidStrategies={paidStrategies}
      paymentSettings={paymentSettings}
      paymentRequests={paymentRequests}
      strategyUnlocks={strategyUnlocks}
      adminEmails={adminEmails}
      onSignOut={handleSignOut}
    />
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <PortalRoot />
    </ErrorBoundary>
  );
}

export default App;
