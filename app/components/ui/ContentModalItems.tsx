// ContentModalItems.tsx
// Reusable content components for ContentModal (e.g., tips lists, help, etc.)

import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PauseCircleIcon, ShareIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { useSession } from "next-auth/react";

// Color constants for consistent styling - now using CSS custom properties for theme awareness
const COLORS = {
  primary: 'hsl(var(--primary))',           // Main theme primary color
  error: 'hsl(var(--destructive))',        // Error red color
  primaryTransparent: 'hsl(var(--primary) / 0.6)', // Semi-transparent primary for optional args
  secondary: 'hsl(var(--muted-foreground))', // Muted color for numbering and descriptions
  accent: 'hsl(var(--accent))',            // Accent color for icons
  // Rank colors (keeping original for consistency)
  rank1: '#d93900',             // Red for hard/rank 1
  rank2: '#b59f3b',             // Yellow for medium/rank 2  
  rank3: '#2ea149',             // Green for easy/rank 3
};

interface StatsContentProps {
  selectedLanguage: string;
}

interface StatsData {
  total: number;
  rank1: { count: number; percentage: number };
  rank2: { count: number; percentage: number };
  rank3: { count: number; percentage: number };
}

interface StreakData {
  currentStreak: number;
  maxStreak: number;
}

// --- Stats ---
export function StatsContent({ selectedLanguage }: StatsContentProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats when component mounts
  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.userId) return;

      setIsLoading(true);
      setError(null);
      
      try {
        const [statsRes, streakRes] = await Promise.all([
          fetch(`/api/getUserResponseStats?userId=${session.userId}&language=${selectedLanguage}`),
          fetch(`/api/getUserStreak?userId=${session.userId}`)
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        } else {
          setError('Failed to fetch stats');
        }

        if (streakRes.ok) {
          const streakData = await streakRes.json();
          setStreakData(streakData);
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

  const formatStats = (stats: StatsData, streakData: StreakData | null) => {
    const padLeft = (str: string, length: number) => str.padStart(length);
    const padRight = (str: string, length: number) => str.padEnd(length);
    
    let output = '';

    // Streak section
    if (streakData) {
      const currentStreakStr = `<span style="color: ${COLORS.primary};">${padLeft(streakData.currentStreak.toString(), 3)}</span>`;
      const maxStreakStr = `<span style="color: ${COLORS.primary};">${padLeft(streakData.maxStreak.toString(), 3)}</span>`;
      const currentLabel = `<span style="color: ${COLORS.primaryTransparent};">${padRight('current', 15)}</span>`;
      const bestLabel = `<span style="color: ${COLORS.primaryTransparent};">${padRight('best', 15)}</span>`;

      output += `<span style="color: ${COLORS.primary};">Streak (days) 🔥</span>\n`;
      output += `${currentLabel} ${currentStreakStr}\n`;
      output += `${bestLabel} ${maxStreakStr}\n\n`;
    }
    
    // Rank composition section
    const rank1Str = `<span style="color: ${COLORS.rank1};">${padLeft(stats.rank1.count.toString(), 3)}</span>`;
    const rank2Str = `<span style="color: ${COLORS.rank2};">${padLeft(stats.rank2.count.toString(), 3)}</span>`;
    const rank3Str = `<span style="color: ${COLORS.rank3};">${padLeft(stats.rank3.count.toString(), 3)}</span>`;
    const totalStr = `<span style="color: ${COLORS.secondary};">${padLeft(stats.total.toString(), 3)}</span>`;
    const pct1Str = `<span style="color: ${COLORS.rank1};">${padLeft(`${stats.rank1.percentage}%`, 4)}</span>`;
    const pct2Str = `<span style="color: ${COLORS.rank2};">${padLeft(`${stats.rank2.percentage}%`, 4)}</span>`;
    const pct3Str = `<span style="color: ${COLORS.rank3};">${padLeft(`${stats.rank3.percentage}%`, 4)}</span>`;

    // Color the descriptions according to their rank colors
    const hardLabel = `<span style="color: ${COLORS.primaryTransparent};">${padRight('hard', 15)}</span>`;
    const mediumLabel = `<span style="color: ${COLORS.primaryTransparent};">${padRight('medium', 15)}</span>`;
    const easyLabel = `<span style="color: ${COLORS.primaryTransparent};">${padRight('easy', 15)}</span>`;
    const totalLabel = `<span style="color: ${COLORS.secondary};">${padRight('total', 15)}</span>`;

    output += `<span style="color: ${COLORS.primary};">Rank composition</span>\n`;
    output += `${hardLabel} ${rank1Str} ${pct1Str}\n`;
    output += `${mediumLabel} ${rank2Str} ${pct2Str}\n`;
    output += `${easyLabel} ${rank3Str} ${pct3Str}\n`;
    output += `${totalLabel} ${totalStr}`;

    return output;
  };

  if (isLoading) {
    return (
      <div className="max-w-none flex items-center justify-center py-8 text-primary">
        <span className="ml-3">Loading stats</span>
        <span className="dots-animation">
          <style jsx>{`
            .dots-animation::after {
              content: '';
              animation: dots 1.5s steps(4, end) infinite;
            }
            
            @keyframes dots {
              0%, 20% { content: '.'; }
              40% { content: '..'; }
              60% { content: '...'; }
              80%, 100% { content: ''; }
            }
          `}</style>
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-none text-center py-8 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-none text-center py-8 text-primary">
        <p>No stats available</p>
      </div>
    );
  }

  const formattedStats = formatStats(stats, streakData);

  return (
    <div className="max-w-none text-primary">
      <pre 
        className="whitespace-pre-wrap font-mono text-base"
        style={{ fontFamily: 'monospace' }}
        dangerouslySetInnerHTML={{ 
          __html: formattedStats 
        }}
      />
    </div>
  );
}

// --- Dojo Tips ---
export function DojoTipsList() {
  const tips = [
    {
      title: 'Study with flashcards',
      description: 'test yourself after reviewing the daily material in dojo'
    },
    {
      title: 'Hide romanization',
      description: 'challenge yourself by removing pronunciation aids',
      icon: <ChevronDownIcon className="h-5 w-5 inline text-card-foreground" style={{ verticalAlign: 'middle' }} />
    },
    {
      title: 'Pause strategically',
      description: 'remove mastered content to focus on challenging material',
      icon: <PauseCircleIcon className="inline h-5 w-5 text-primary align-text-bottom" style={{ verticalAlign: 'middle' }} />
    }
  ];

  return (
    <div className="max-w-none text-primary">
      {tips.map((tip, index) => (
        <div key={index} style={{ marginBottom: '1rem' }}>
          <strong className="text-muted-foreground">{index + 1}.</strong>{' '}
          <strong className="text-primary">{tip.title}</strong>
          {tip.icon && <>{' '}{tip.icon}</>}
          <span className="text-muted-foreground"> {tip.description}</span>
        </div>
      ))}
    </div>
  );
}

// --- Additional Commands ---
interface AdditionalCommandsProps {
  selectedLanguage: string;
}

export function AdditionalCommands({ selectedLanguage }: AdditionalCommandsProps) {
  const generateCommandsHTML = (language: string) => {
    const commands = [
      {
        command: '<strong>random</strong>',
        args: `<em style="color: ${COLORS.primaryTransparent};">(optional topic) (optional difficulty level)</em>`,
        description: 'generate random phrases for practice'
      },
      {
        command: '<strong>verb</strong>',
        args: `<em style="color: ${COLORS.primaryTransparent};">(verb)</em>`,
        description: 'get a table for all verb tenses'
      },
      {
        command: '<strong>terms</strong>',
        args: `<em style="color: ${COLORS.primaryTransparent};">(topic)</em>`,
        description: `list of related words in ${getLanguageName(language)}`
      },
      {
        command: '<strong>alphabet</strong>',
        args: getAlphabetArgs(language),
        description: getAlphabetDescription(language)
      },
      {
        command: '<strong>*</strong>',
        args: `<em style="color: ${COLORS.primaryTransparent};">(question)</em>`,
        description: 'inquire about anything else'
      }
    ];

    return commands.map((cmd, index) => 
      `<div style="margin-bottom: 1rem;">
        <strong style="color: ${COLORS.secondary};">${index + 1}.</strong> ${cmd.command} ${cmd.args} <span style="color: ${COLORS.secondary};">${cmd.description}</span>
      </div>`
    ).join('');
  };

  const getLanguageName = (language: string) => {
    const names: Record<string, string> = {
      'ja': 'Japanese',
      'ko': 'Korean', 
      'es': 'Spanish',
      'ar': 'Arabic',
      'zh': 'Chinese'
    };
    return names[language] || 'Japanese';
  };

  const getAlphabetArgs = (language: string) => {
    if (language === 'zh') {
      return `<em style="color: ${COLORS.primaryTransparent};">(optional # or range)</em>`;
    }
    return '';
  };

  const getAlphabetDescription = (language: string) => {
    const descriptions: Record<string, string> = {
      'ja': 'phonetic table of hiragana/katakana and romaji',
      'ko': 'phonetic table of Hangul and romanization',
      'es': 'phonetic table of Spanish script and romanization', 
      'ar': 'phonetic table of Arabic script and romanization',
      'zh': 'table of common Chinese characters'
    };
    return descriptions[language] || 'phonetic table of hiragana/katakana and romaji';
  };

  return (
    <div 
      className="max-w-none text-primary" 
      dangerouslySetInnerHTML={{ 
        __html: generateCommandsHTML(selectedLanguage) 
      }}
    />
  );
}

// --- Community Instructions ---
export function CommunityInstructions() {
  return (
    <div className="max-w-none text-primary" style={{ color: COLORS.secondary, lineHeight: 1.6 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ color: COLORS.primary, marginBottom: '0.8rem', fontSize: '1rem' }}>Learn from content created by the community:</h4>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Browse</strong> responses shared by the community
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Filter</strong> by deck titles, creators, or popularity
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Import</strong> interesting responses to your decks
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Share</strong> your own responses to help others learn
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ color: COLORS.primary, marginBottom: '0.8rem', fontSize: '1rem' }}>How to share your content:</h4>
        <p style={{ marginBottom: '0.5rem' }}>
          Click the share button on the bottom of any the material in your decks
        </p>
      </div>
    </div>
  );
}

// --- Create Instructions ---
export function CreateInstructions() {
  return (
    <div className="max-w-none text-primary" style={{ color: COLORS.secondary, lineHeight: 1.6 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ color: COLORS.primary, marginBottom: '0.8rem', fontSize: '1rem' }}>Chat w/ AI to create study material:</h4>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Generate material</strong> – enter a phrase or an AI command
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Breakdown + audio guides</strong> are automatically generated
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Add to deck</strong> to rank and organize your learning materials
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ color: COLORS.primary, marginBottom: '0.8rem', fontSize: '1rem' }}>Review and study:</h4>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Adjust rank</strong> (1-3) based on how well you know the material
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Frequency</strong> of material shown adjusts based on your ranking
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong>Study with flashcards</strong> in decks for active review and practice
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ color: COLORS.primary, marginBottom: '0.8rem', fontSize: '1rem' }}>Share with the community:</h4>
        <p style={{ marginBottom: '0.5rem' }}>
          Click the share button on any response in your deck to share it with the community and help others learn
        </p>
      </div>
    </div>
  );
} 