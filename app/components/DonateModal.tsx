'use client';

import React, { useState, useEffect } from 'react';
import {
  DONATION_PRESETS_CENTS,
  DEFAULT_DONATION_CENTS,
  MIN_DONATION_CENTS,
  MAX_DONATION_CENTS,
  DONATION_MESSAGE_MAX,
  formatCents,
} from '@/lib/stripe/donationConstants';
import { trackDonateCheckoutStart } from '@/lib/analytics';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When true, render the post-checkout thank-you state instead of the picker. */
  showThanks?: boolean;
}

const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose, showThanks = false }) => {
  const [selectedCents, setSelectedCents] = useState<number>(DEFAULT_DONATION_CENTS);
  const [customValue, setCustomValue] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Reset transient state whenever the modal is (re)opened for a fresh donation.
  useEffect(() => {
    if (isOpen && !showThanks) {
      setSelectedCents(DEFAULT_DONATION_CENTS);
      setCustomValue('');
      setIsCustom(false);
      setMessage('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen, showThanks]);

  if (!isOpen) return null;

  // Resolve the effective amount in cents from either a preset or the custom input.
  const customCents = (() => {
    const dollars = parseFloat(customValue);
    if (Number.isNaN(dollars)) return NaN;
    return Math.round(dollars * 100);
  })();
  const effectiveCents = isCustom ? customCents : selectedCents;
  const amountValid =
    Number.isInteger(effectiveCents) &&
    effectiveCents >= MIN_DONATION_CENTS &&
    effectiveCents <= MAX_DONATION_CENTS;

  const handleDonate = async () => {
    if (!amountValid) {
      setError(
        `Please enter an amount between ${formatCents(MIN_DONATION_CENTS)} and ${formatCents(MAX_DONATION_CENTS)}.`,
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      trackDonateCheckoutStart(effectiveCents);
      const res = await fetch('/api/stripe/create-donation-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: effectiveCents, message: message.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
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
      <div className="bg-card border border-border rounded-sm shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              {showThanks ? 'Thank you! ☕' : 'Buy me a coffee ☕'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {showThanks
                ? 'Your support genuinely helps keep Kondo running.'
                : 'Kondo is a passion project. A one-time tip helps cover the AI costs.'}
            </p>
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

        {showThanks ? (
          <div className="p-6">
            <p className="text-sm text-card-foreground text-center">
              Your payment went through. Thank you for supporting the project — it means a lot.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 pt-5">
            {/* Preset amounts */}
            <div className="grid grid-cols-4 gap-2">
              {DONATION_PRESETS_CENTS.map((cents) => {
                const active = !isCustom && selectedCents === cents;
                return (
                  <button
                    key={cents}
                    onClick={() => { setIsCustom(false); setSelectedCents(cents); setError(null); }}
                    className={`py-2 rounded border text-sm font-medium transition-colors ${
                      active
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-border text-card-foreground hover:bg-accent'
                    }`}
                  >
                    {formatCents(cents)}
                  </button>
                );
              })}
            </div>

            {/* Custom amount */}
            <div className="mt-3">
              <div
                className={`flex items-center rounded border px-3 transition-colors ${
                  isCustom ? 'border-amber-500' : 'border-border'
                }`}
              >
                <span className="text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={MIN_DONATION_CENTS / 100}
                  max={MAX_DONATION_CENTS / 100}
                  step="1"
                  placeholder="Other amount"
                  value={customValue}
                  onChange={(e) => { setCustomValue(e.target.value); setIsCustom(true); setError(null); }}
                  onFocus={() => setIsCustom(true)}
                  className="w-full bg-transparent py-2 px-2 text-sm text-card-foreground outline-none"
                />
              </div>
            </div>

            {/* Optional message */}
            <div className="mt-3">
              <input
                type="text"
                maxLength={DONATION_MESSAGE_MAX}
                placeholder="Leave a note (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded border border-border bg-transparent py-2 px-3 text-sm text-card-foreground outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {error && <p className="text-sm text-destructive mt-3 text-center">{error}</p>}

            <button
              onClick={handleDonate}
              disabled={loading || !amountValid}
              className="mt-5 w-full py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {loading
                ? 'Redirecting to checkout...'
                : `Continue${amountValid ? ` — ${formatCents(effectiveCents)}` : ''}`}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Secure payment via Stripe. One-time, non-refundable, and not tax-deductible.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonateModal;
