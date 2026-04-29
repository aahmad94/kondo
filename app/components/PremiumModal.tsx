'use client';

import React, { useState, useEffect } from 'react';
import { FREE_LIMITS } from '@/lib/stripe/quotaLimits';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium?: boolean;
  /** ISO date string of when the current billing period ends */
  subscriptionEndsAt?: string | null;
  /** True when the user has canceled but still has access until period end */
  cancelAtPeriodEnd?: boolean;
  /** Optional label shown above the headline, e.g. "You've hit your limit" */
  triggerContext?: string;
}

function formatPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

type UsageKey =
  | 'responsesThisWeek'
  | 'voiceChatsThisWeek'
  | 'breakdownsToday'
  | 'ttsToday';

interface FeatureRow {
  label: string;
  free: string;
  premium: string;
  usageKey?: UsageKey;
  limit?: number;
}

const FEATURES: FeatureRow[] = [
  {
    label: 'Responses',
    free: `${FREE_LIMITS.RESPONSES_PER_WEEK}/week`,
    premium: 'Unlimited',
    usageKey: 'responsesThisWeek',
    limit: FREE_LIMITS.RESPONSES_PER_WEEK,
  },
  {
    label: 'Voice chat',
    free: `${FREE_LIMITS.VOICE_CHATS_PER_WEEK}/week`,
    premium: 'Unlimited',
    usageKey: 'voiceChatsThisWeek',
    limit: FREE_LIMITS.VOICE_CHATS_PER_WEEK,
  },
  {
    label: 'Breakdown analysis',
    free: `${FREE_LIMITS.BREAKDOWNS_PER_DAY}/day`,
    premium: 'Unlimited',
    usageKey: 'breakdownsToday',
    limit: FREE_LIMITS.BREAKDOWNS_PER_DAY,
  },
  {
    label: 'Audio / TTS',
    free: `${FREE_LIMITS.TTS_PER_DAY}/day`,
    premium: 'Unlimited',
    usageKey: 'ttsToday',
    limit: FREE_LIMITS.TTS_PER_DAY,
  },
  { label: 'Community feed', free: '✓', premium: '✓' },
  { label: 'Daily Dojo', free: '✓', premium: '✓' },
  { label: 'Email summaries', free: '✓', premium: '✓' },
];

type UsageMap = Record<UsageKey, number>;

const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  isPremium = false,
  subscriptionEndsAt = null,
  cancelAtPeriodEnd = false,
  triggerContext,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageMap | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Fetch current usage when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/stripe/subscription-status');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.usage) return;
        setUsage({
          responsesThisWeek: data.usage.responsesThisWeek ?? 0,
          voiceChatsThisWeek: data.usage.voiceChatsThisWeek ?? 0,
          breakdownsToday: data.usage.breakdownsToday ?? 0,
          ttsToday: data.usage.ttsToday ?? 0,
        });
      } catch {
        // non-fatal — usage column will just stay blank
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to open billing portal');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[70] px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-sm shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div>
            {triggerContext && (
              <p className="text-xs font-medium text-amber-500 uppercase tracking-wide mb-1">
                {triggerContext}
              </p>
            )}
            <h2 className="text-lg font-semibold text-card-foreground">
              {isPremium ? 'Your Premium Plan' : 'Upgrade to Premium'}
            </h2>
            {!isPremium && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Unlock unlimited access to all features
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-card-foreground transition-colors ml-4 mt-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Subscription status banner */}
        {isPremium && (() => {
          const endsLabel = formatPeriodEnd(subscriptionEndsAt);
          if (!endsLabel) return null;
          return cancelAtPeriodEnd ? (
            <div className="mx-6 mt-4 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
              Your premium plan ends on <span className="font-semibold">{endsLabel}</span>.
            </div>
          ) : (
            <div className="mx-6 mt-4 rounded border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Renews on <span className="font-semibold text-card-foreground">{endsLabel}</span>.
            </div>
          );
        })()}

        {/* Feature table */}
        <div className="px-6 pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-muted-foreground font-normal pb-2 w-[40%]" />
                <th className="text-center text-muted-foreground font-medium pb-2 w-[20%]">Free</th>
                <th className="text-center text-muted-foreground font-medium pb-2 w-[20%]">Usage</th>
                <th className="text-center font-semibold text-amber-500 pb-2 w-[20%]">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {FEATURES.map((row) => {
                const hasQuota = row.usageKey != null && row.limit != null;
                const current = hasQuota && usage ? usage[row.usageKey!] : null;
                // Premium users see their counts but never get the red "maxed out" treatment.
                const maxedOut =
                  !isPremium && hasQuota && current != null && current >= (row.limit as number);
                let usageCell: React.ReactNode = '—';
                if (hasQuota) {
                  if (current == null) {
                    usageCell = <span className="text-muted-foreground/60">…</span>;
                  } else {
                    usageCell = current;
                  }
                }
                return (
                  <tr key={row.label}>
                    <td className="py-2.5 text-card-foreground">{row.label}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{row.free}</td>
                    <td
                      className={`py-2.5 text-center font-medium ${
                        maxedOut ? 'text-red-500' : 'text-card-foreground'
                      }`}
                    >
                      {usageCell}
                    </td>
                    <td className="py-2.5 text-center font-medium text-card-foreground">{row.premium}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="p-6 pt-5">
          {!isPremium && (
            <div className="text-center mb-4">
              <span className="text-2xl font-bold text-card-foreground">$1.99</span>
              <span className="text-muted-foreground text-sm"> / month</span>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive mb-3 text-center">{error}</p>
          )}

          {isPremium ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center mb-3">
                You have full access to all features.
              </p>
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded border border-border text-card-foreground hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Manage subscription'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Redirecting to checkout...' : 'Subscribe now'}
            </button>
          )}

          <p className="text-xs text-muted-foreground text-center mt-3">
            {isPremium
              ? 'Manage billing, update payment method, or cancel anytime.'
              : 'Secure payment via Stripe. Cancel anytime.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
