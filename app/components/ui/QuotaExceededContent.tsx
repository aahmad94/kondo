'use client';

import React from 'react';
import { FREE_LIMITS } from '@/lib/stripe/subscriptionService';

export type QuotaFeature = 'breakdown' | 'tts' | 'responses';

interface QuotaExceededContentProps {
  feature: QuotaFeature;
  onUpgradeClick: () => void;
}

const FEATURE_COPY: Record<QuotaFeature, { heading: string; detail: string; limit: string }> = {
  breakdown: {
    heading: "Daily breakdown limit reached",
    detail: "Breakdown analysis uses AI to explain grammar and structure.",
    limit: `Free accounts get ${FREE_LIMITS.BREAKDOWNS_PER_DAY} breakdowns per day.`,
  },
  tts: {
    heading: "Daily audio limit reached",
    detail: "Audio pronunciation is generated with text-to-speech.",
    limit: `Free accounts get ${FREE_LIMITS.TTS_PER_DAY} audio generations per day.`,
  },
  responses: {
    heading: "Weekly response limit reached",
    detail: "Each response you generate or import counts toward your weekly quota.",
    limit: `Free accounts get ${FREE_LIMITS.RESPONSES_PER_WEEK} responses per week.`,
  },
};

export default function QuotaExceededContent({ feature, onUpgradeClick }: QuotaExceededContentProps) {
  const copy = FEATURE_COPY[feature];

  return (
    <div className="flex flex-col items-center text-center gap-4 py-2 px-2">
      <div className="text-3xl">✦</div>
      <div>
        <p className="font-semibold text-card-foreground text-base">{copy.heading}</p>
        <p className="text-sm text-muted-foreground mt-1">{copy.detail}</p>
        <p className="text-sm text-muted-foreground">{copy.limit}</p>
      </div>
      <div className="w-full border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-3">
          Upgrade to Premium for unlimited breakdowns, audio, and responses.
        </p>
        <button
          onClick={onUpgradeClick}
          className="w-full py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors text-sm"
        >
          Upgrade to Premium — $5.99 / month
        </button>
      </div>
    </div>
  );
}
