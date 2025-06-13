// ContentModalItems.tsx
// Reusable content components for ContentModal (e.g., tips lists, help, etc.)

import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PauseCircleIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { useSession } from "next-auth/react";

interface StatsMarkdownProps {
  selectedLanguage: string;
}

interface StatsData {
  total: number;
  rank1: { count: number; percentage: number };
  rank2: { count: number; percentage: number };
  rank3: { count: number; percentage: number };
}

export function StatsMarkdown({ selectedLanguage }: StatsMarkdownProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats when component mounts
  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.userId) return;

      setIsLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/getUserResponseStats?userId=${session.userId}&language=${selectedLanguage}`);
        if (res.ok) {
          const statsData = await res.json();
          setStats(statsData);
        } else {
          setError('Failed to fetch stats');
        }
      } catch (error) {
        console.error('Error fetching response stats:', error);
        setError('Error loading stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [session?.userId, selectedLanguage]);

  const formatStats = (stats: StatsData) => {
    const padLeft = (str: string, length: number) => str.padStart(length);
    const padRight = (str: string, length: number) => str.padEnd(length);
    
    // Pad the visible text first, then apply HTML formatting
    const rank1Str = `<strong>${padLeft(stats.rank1.count.toString(), 3)}</strong>`;
    const rank2Str = `<strong>${padLeft(stats.rank2.count.toString(), 3)}</strong>`;
    const rank3Str = `<strong>${padLeft(stats.rank3.count.toString(), 3)}</strong>`;
    const totalStr = `<strong>${padLeft(stats.total.toString(), 3)}</strong>`;
    const pct1Str = `<strong>${padLeft(`${stats.rank1.percentage}%`, 4)}</strong>`;
    const pct2Str = `<strong>${padLeft(`${stats.rank2.percentage}%`, 4)}</strong>`;
    const pct3Str = `<strong>${padLeft(`${stats.rank3.percentage}%`, 4)}</strong>`;

    return `<strong>Rank composition</strong>\n` +
           `${padRight('hard', 15)} ${rank1Str} ${pct1Str}\n` +
           `${padRight('medium', 15)} ${rank2Str} ${pct2Str}\n` +
           `${padRight('easy', 15)} ${rank3Str} ${pct3Str}\n` +
           `${padRight('total', 15)} ${totalStr}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-none flex items-center justify-center py-8" style={{ color: '#b59f3b' }}>
        <div className="animate-spin h-6 w-6 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
        <span className="ml-3">Loading stats...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-none text-center py-8" style={{ color: '#d93900' }}>
        <p>{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-none text-center py-8" style={{ color: '#b59f3b' }}>
        <p>No stats available</p>
      </div>
    );
  }

  const formattedStats = formatStats(stats);

  return (
    <div className="max-w-none" style={{ color: '#b59f3b' }}>
      <pre 
        className="whitespace-pre-wrap font-mono text-lg"
        style={{ fontFamily: 'monospace' }}
        dangerouslySetInnerHTML={{ 
          __html: formattedStats 
        }}
      />
    </div>
  );
}

export function DojoTipsList() {
  return (
    <ol style={{ paddingLeft: '1.5em', color: '#b59f3b' }} className="list-decimal space-y-2">
      <li><strong>Use flashcard mode</strong>: test yourself after reviewing the daily material in dojo</li>
      <li><strong>
        Hide romanization{' '}
        (
          <ChevronDownIcon 
            className="h-5 w-5 inline text-white" 
            style={{ verticalAlign: 'middle' }} 
          />
        )
        </strong>
        {' '}challenge yourself by removing pronunciation aids</li>
      <li>
        <strong>
            Pause strategically{' '}(
            <PauseCircleIcon 
                className="inline h-5 w-5 text-yellow-400 align-text-bottom"
                style={{ verticalAlign: 'middle' }} 
            />
            )
        </strong>
        {' '}remove mastered content to focus on challenging material
      </li>
    </ol>
  );
} 