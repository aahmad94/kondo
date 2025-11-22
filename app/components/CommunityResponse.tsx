'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusIcon, 
  XCircleIcon, 
  ChevronDownIcon, 
  ArrowPathIcon, 
  PauseCircleIcon,
  PlayCircleIcon,
  XMarkIcon,
  CheckIcon,
  TableCellsIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  UserIcon,
  HeartIcon,
  ShareIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import DecksModal from './DecksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import EnhancedDeleteModal from './EnhancedDeleteModal';
import BreakdownModal from './BreakdownModal';
import ErrorModal from './ErrorModal';
import NoteModal from './NoteModal';
import RankContainer from './ui/RankContainer';
import IconButton from './ui/IconButton';
import { 
  StyledMarkdown, 
  DeleteIcon, 
  UserAliasContainer,
  SpeakerButton,
  BreakdownButton,
  QuoteButton,
  ImportBadgeButton,
  ConfirmationModal,
  AliasBadge,
  ExpandableContent,
  DeckNavigationModal
} from './ui';
import Tooltip from './Tooltip';
import { trackBreakdownClick, trackPauseToggle, trackChangeRank, trackAddToDeck } from '@/lib/analytics';
import { extractExpressions, prepareTextForSpeech, getAliasCSSVars, parseClarificationResponse } from '@/lib/utils';
import { useTheme } from '../contexts/ThemeContext';
import { deleteCommunityResponseAction } from '../../actions/community';
import { useIsMobile } from '../hooks/useIsMobile';
import StandardResponse from './StandardResponse';

import type { 
  ResponseProps, 
  GPTResponseProps, 
  CommunityResponseProps
} from '../../types/response';
import { 
  isGPTResponseProps,
  isCommunityResponseProps 
} from '../../types/response';

export default function CommunityResponse(props: ResponseProps) {
  const { type, data, selectedDeckTitle, selectedLanguage = 'ja', hideContent = false, showAnswer, onToggleAnswer, onQuote, onBreakdownClick, onLoadingChange, containerWidth, onDeckSelect } = props;
  
  // Extract alias-related props for CommunityResponse
  const aliasColor = isCommunityResponseProps(props) ? props.aliasColor : undefined;
  const creatorAlias = isCommunityResponseProps(props) ? props.data.creatorAlias : undefined;

  // Colors
  const red = '#d93900';
  const yellow = '#b59f3b';
  const brightYellow = '#ecc94b';
  const green = '#2ea149';
  const blue = '#3b82f6';
  const lightBlue = '#63b3ed';
  const white = '#fff';

  // Common state
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [desktopBreakdownContent, setDesktopBreakdownContent] = useState(data.breakdown || '');
  const [mobileBreakdownContent, setMobileBreakdownContent] = useState(data.mobileBreakdown || '');
  const [currentBreakdownContent, setCurrentBreakdownContent] = useState('');
  const [isBreakdownLoading, setIsBreakdownLoading] = useState(false);
  const [isBreakdownTextView, setIsBreakdownTextView] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentFurigana, setCurrentFurigana] = useState(data.furigana || '');
  
  // For clarifications: array of furigana strings, one per expression block
  const [clarificationFuriganaArray, setClarificationFuriganaArray] = useState<string[] | null>(() => {
    if (isCommunityResponseProps(props) && props.data.responseType === 'clarification' && data.furigana) {
      try {
        const parsed = JSON.parse(data.furigana);
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // Audio cache state - initialize from props (like breakdown)
  const [cachedAudioData, setCachedAudioData] = useState<{ audio: string; mimeType: string } | null>(
    data.audio && data.audioMimeType ? { audio: data.audio, mimeType: data.audioMimeType } : null
  );

  // GPT-specific state
  const [newRank, setNewRank] = useState(isGPTResponseProps(props) ? props.data.rank : 1);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localFuriganaEnabled, setLocalFuriganaEnabled] = useState(isGPTResponseProps(props) ? props.data.isFuriganaEnabled : selectedLanguage === 'ja');
  const [localPhoneticEnabled, setLocalPhoneticEnabled] = useState(isGPTResponseProps(props) ? props.data.isPhoneticEnabled : true);
  const [localKanaEnabled, setLocalKanaEnabled] = useState(isGPTResponseProps(props) ? props.data.isKanaEnabled : false);
  const [showFuriganaDropdown, setShowFuriganaDropdown] = useState(false);

  // Community-specific state
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingCommunity, setIsDeletingCommunity] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showEnhancedDeleteModal, setShowEnhancedDeleteModal] = useState(false);
  const [showDeckNavigationModal, setShowDeckNavigationModal] = useState(false);
  const [addedDeckInfo, setAddedDeckInfo] = useState<{ id: string; title: string } | null>(null);

  // Note modal state (view only for community responses)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Refs and other hooks
  const router = useRouter();
  const { isMobile, mobileOffset } = useIsMobile();
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const speakerButtonRef = useRef<HTMLButtonElement>(null);
  const quoteButtonRef = useRef<HTMLButtonElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = useRef<HTMLButtonElement>(null);
  const deckButtonRef = useRef<HTMLButtonElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const furiganaDropdownRef = useRef<HTMLDivElement>(null);

  // Hover states
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);
  const [isDeckHovered, setIsBookmarkHovered] = useState(false);

  // Generate and cache furigana array for clarifications
  useEffect(() => {
    const generateClarificationFurigana = async () => {
      // Only for community clarifications in Japanese
      if (!isCommunityResponseProps(props) || props.data.responseType !== 'clarification' || selectedLanguage !== 'ja') return;
      
      // Skip if already cached
      if (clarificationFuriganaArray && clarificationFuriganaArray.length > 0) return;
      
      // Parse the response to get expression blocks
      const blocks = parseClarificationResponse(data.content);
      const expressionBlocks = blocks.filter(b => b.type === 'expression');
      
      if (expressionBlocks.length === 0) return;
      
      try {
        // Extract japanese and hiragana from each expression block
        const blocksData = expressionBlocks.map(block => {
          const lines = block.lines.filter(line => line.match(/^\s*\d+\/\s*/));
          const japaneseText = lines[0]?.replace(/^\s*\d+\/\s*/, '').trim() || '';
          const hiraganaText = lines[1]?.replace(/^\s*\d+\/\s*/, '').trim() || '';
          return { japaneseText, hiraganaText };
        });
        
        const { addFuriganaForClarification } = await import('@/lib/utils');
        const furiganaArrayString = await addFuriganaForClarification(blocksData, data.id);
        const parsed = JSON.parse(furiganaArrayString);
        setClarificationFuriganaArray(parsed);
      } catch (error) {
        console.error('Error generating clarification furigana:', error);
      }
    };
    
    generateClarificationFurigana();
  }, [props, selectedLanguage, data.content, data.id, clarificationFuriganaArray]);

  // Parse response content (shared logic)
  const parseResponse = (response: string) => {
    const lines = response.split('\n');
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      } else {
        currentBlock.push(line);
      }
    }

    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  // Community response deletion handlers
  const handleCommunityDeleteClick = () => {
    if (isCommunityResponseProps(props) && props.data.importCount > 0) {
      // Show enhanced modal for responses with imports
      setShowEnhancedDeleteModal(true);
    } else {
      // Show basic confirmation modal for responses without imports
      setShowDeleteConfirmModal(true);
    }
  };

  const handleCommunityDeleteConfirm = async () => {
    if (!data.id || isDeletingCommunity) return;

    try {
      setIsDeletingCommunity(true);
      
      if (isCommunityResponseProps(props) && props.onDelete) {
        // Delegate deletion to parent component
        await props.onDelete(data.id);
        // Close modals after successful deletion
        setShowDeleteConfirmModal(false);
        setShowEnhancedDeleteModal(false);
      }
    } catch (error) {
      console.error('Error deleting community response:', error);
      // Keep modals open and show error state
      // TODO: Show error modal with the error message
      // For now, just log the error - could add an error state here
    } finally {
      setIsDeletingCommunity(false);
    }
  };

  const handleCommunityDeleteCancel = () => {
    setShowDeleteConfirmModal(false);
  };

  const handleEnhancedDeleteCancel = () => {
    setShowEnhancedDeleteModal(false);
  };

  const cleanResponse = data.content
    .replace(/^\s*<>\s*/gm, '• ')
    .replace(/^\s*-\s*/gm, '• ')
    .replace(/ {2,}$/gm, '');

  const blocks = data.content
    .split(/\r?\n\s*\r?\n/)
    .map(block => block.trim())
    .filter(Boolean);

  const parsedBlocks = blocks.map((block, blockIdx) => {
    const lines = block.split(/\r?\n/);
    const numberedLines = lines
      .map(line => {
        const match = line.match(/^\s*\d+\/\s*(.*)$/);
        return match ? line.trim() : null;
      })
      .filter((item): item is string => !!item);

    if (numberedLines.length >= 2) {
      const firstNumberedIndex = lines.findIndex(line => line.match(/^\s*\d+\/\s*(.*)$/));
      const nonNumberedPrefix = lines.slice(0, firstNumberedIndex).filter(line => line.trim());
      
      if (nonNumberedPrefix.length > 0) {
        return [...nonNumberedPrefix, ...numberedLines];
      }
      return numberedLines;
    }
    
    return [block];
  });

  // Standard response detection (shared logic)
  const isStandardResponse = (items: string[]) => [2, 3, 4].includes(items.filter(item => item.match(/^\s*\d+\/\s*/)).length);

  // Breakdown handling (shared logic)
  const handleBreakdownClick = async () => {
    if (!data.id) return;

    try {
      setIsBreakdownLoading(true);
      onLoadingChange?.(true);
      
      const existingContent = isMobile ? mobileBreakdownContent : desktopBreakdownContent;
      
      if (existingContent) {
        setCurrentBreakdownContent(existingContent);
        setIsBreakdownModalOpen(true);
        return;
      }

      await generateBreakdown(isMobile);
      setIsBreakdownModalOpen(true);
      trackBreakdownClick(data.id || '');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate breakdown');
      setIsErrorModalOpen(true);
    } finally {
      setIsBreakdownLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleBreakdownFormatToggle = async (toTextView?: boolean) => {
    const targetTextView = toTextView !== undefined ? toTextView : !isBreakdownTextView;
    setIsBreakdownTextView(targetTextView);
    
    // Check if we have the content for the requested view
    const neededContent = targetTextView ? mobileBreakdownContent : desktopBreakdownContent;
    
    if (neededContent) {
      // We have the content, switch immediately
      setCurrentBreakdownContent(neededContent);
    } else {
      // We need to generate the content - don't show external spinner for format toggle
      await generateBreakdown(targetTextView, false);
    }
  };

  const generateBreakdown = async (isMobileView: boolean, showExternalLoading: boolean = true) => {
    if (!data.id) return;

    try {
      setIsBreakdownLoading(true);
      if (showExternalLoading) {
        onLoadingChange?.(true);
      }

      const response = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: data.content,
          language: selectedLanguage,
          responseId: data.id,
          isMobile: isMobileView
        }),
      });

      if (!response.ok) throw new Error('Failed to generate breakdown');

      const result = await response.json();
      
      // Cache both breakdowns if available from the API response
      if (result.desktopBreakdown) {
        setDesktopBreakdownContent(result.desktopBreakdown);
      }
      if (result.mobileBreakdown) {
        setMobileBreakdownContent(result.mobileBreakdown);
      }
      
      // Set the current breakdown content for display
      const breakdown = isMobileView ? result.mobileBreakdown : result.desktopBreakdown;
      setCurrentBreakdownContent(breakdown);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to generate breakdown');
      setIsErrorModalOpen(true);
    } finally {
      setIsBreakdownLoading(false);
      if (showExternalLoading) {
        onLoadingChange?.(false);
      }
    }
  };

  // GPT-specific handlers
  const handleDeleteClick = () => {
    if (isGPTResponseProps(props)) {
      setIsDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isGPTResponseProps(props) || !props.onDelete || !data.id) return;

    try {
      setIsDeleting(true);
      await props.onDelete(data.id, props.data.decks || {});
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting response:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePauseToggle = async (responseId: string, isPaused: boolean) => {
    if (isGPTResponseProps(props) && props.onPauseToggle) {
      await props.onPauseToggle(responseId, isPaused);
      trackPauseToggle(isPaused);
    }
  };

  const handleDeckClick = () => {
    if (!isGPTResponseProps(props)) return;
    
    const decks = props.data.decks;
    if (decks && Object.keys(decks).length > 0) {
      const nonReservedDeckEntry = Object.entries(decks).find(([id, title]) => 
        !props.reservedDeckTitles?.includes(title)
      );
      
      if (nonReservedDeckEntry) {
        const [deckId, deckTitle] = nonReservedDeckEntry;
        router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deckTitle)}`);
        props.onDeckSelect?.(deckId, deckTitle);
      } else {
        const [deckId, deckTitle] = Object.entries(decks)[0];
        router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deckTitle)}`);
        props.onDeckSelect?.(deckId, deckTitle);
      }
    }
  };

  // Community-specific handlers
  const handleImport = async () => {
    if (!isCommunityResponseProps(props)) return;

    // Use modal approach if available, otherwise fall back to direct import
    if (props.onImportWithModal) {
      props.onImportWithModal(props.data);
    } else if (props.onImport) {
      try {
        setIsImporting(true);
        await props.onImport(data.id);
      } catch (error) {
        console.error('Error importing response:', error);
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleViewProfile = () => {
    if (isCommunityResponseProps(props) && props.onViewProfile) {
      props.onViewProfile(props.data.creatorUserId);
    }
  };

  const handleCommunityDelete = async () => {
    if (!isCommunityResponseProps(props) || !props.onDelete) return;

    try {
      setIsDeletingCommunity(true);
      await props.onDelete(data.id);
    } catch (error) {
      console.error('Error deleting community response:', error);
    } finally {
      setIsDeletingCommunity(false);
    }
  };

  const handleGPTResponseAdded = (deckId: string, deckTitle: string) => {
    // Store the deck info and show navigation modal
    setAddedDeckInfo({ id: deckId, title: deckTitle });
    setShowDeckNavigationModal(true);
  };

  // Render action buttons based on response type
  const renderActionButtons = () => {
    if (isGPTResponseProps(props)) {
      return renderGPTActionButtons();
    } else {
      return renderCommunityActionButtons();
    }
  };

  const renderGPTActionButtons = () => {
    if (!isGPTResponseProps(props)) return null;

    const { selectedDeckId, onDelete, onQuote } = props;

    return (
      <>
        {/* Breakdown button */}
        <button 
          ref={breakdownButtonRef}
          onClick={handleBreakdownClick}
          disabled={isBreakdownLoading}
          className="text-foreground hover:text-muted-foreground disabled:opacity-50 transition-colors duration-200"
        >
          <TableCellsIcon className="h-6 w-6" />
        </button>

        {/* Quote button */}
        {onQuote && (
          !isMobile ? (
            <Tooltip
              content="Quote this response"
              isVisible={isQuoteHovered}
              buttonRef={quoteButtonRef}
            >
              <button 
                ref={quoteButtonRef}
                onClick={() => {
                  if (selectedDeckId && props.onDeckSelect) {
                    props.onDeckSelect(null, null);
                    router.push('/');
                  }
                  onQuote(data.content, 'input');
                }} 
                onMouseEnter={() => setIsQuoteHovered(true)}
                onMouseLeave={() => setIsQuoteHovered(false)}
                className="text-foreground hover:text-muted-foreground transition-colors duration-200"
              >
                <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
              </button>
            </Tooltip>
          ) : (
            <button 
              ref={quoteButtonRef}
              onClick={() => {
                if (selectedDeckId && props.onDeckSelect) {
                  props.onDeckSelect(null, null);
                  router.push('/');
                }
                onQuote(data.content, 'input');
              }} 
              className="text-foreground hover:text-muted-foreground transition-colors duration-200"
            >
              <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
            </button>
          )
        )}

        {/* Delete button */}
        {selectedDeckId && data.id && onDelete && (
          <button 
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors duration-200"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        )}

        {/* Add to deck button */}
        {!selectedDeckId && (
          !isMobile ? (
            <Tooltip
              content="Add to deck"
              isVisible={isDeckHovered}
              buttonRef={deckButtonRef}
            >
              <button 
                ref={deckButtonRef}
                onClick={() => setIsDeckModalOpen(true)} 
                onMouseEnter={() => setIsBookmarkHovered(true)}
                onMouseLeave={() => setIsBookmarkHovered(false)}
                className="text-foreground hover:text-blue-400 transition-colors duration-200"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </Tooltip>
          ) : (
            <button 
              ref={deckButtonRef}
              onClick={() => setIsDeckModalOpen(true)} 
              className="text-foreground hover:text-primary transition-colors duration-200"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          )
        )}
      </>
    );
  };

  const renderCommunityActionButtons = () => {
    if (!isCommunityResponseProps(props)) return null;

    const isCreator = props.currentUserId === props.data.creatorUserId;

    return (
      <>
        {/* Quote button */}
        {onQuote && (
          <QuoteButton
            onClick={() => {
              // Navigate to main chatbox to enter create mode (same logic as GPTResponse)
              if (isCommunityResponseProps(props) && onDeckSelect) {
                onDeckSelect(null, null);
              }
              router.push('/');
              onQuote(data.content, 'input');
            }}
            buttonRef={quoteButtonRef}
          />
        )}

        {/* Delete button - only show for creator */}
        {isCreator && (
          <DeleteIcon
            onClick={handleCommunityDeleteClick}
            disabled={isDeletingCommunity}
          />
        )}

      </>
    );
  };

  // Render metadata badges
  const renderMetadata = () => {
    if (isGPTResponseProps(props)) {
      return renderGPTMetadata();
    } else {
      return renderCommunityMetadata();
    }
  };

  const renderGPTMetadata = () => {
    if (!isGPTResponseProps(props)) return null;

    const { data: gptData, selectedDeckId, onPauseToggle, reservedDeckTitles } = props;
    const decks = gptData.decks;

    return (
      <>
        {/* Bookmark badge with pause toggle */}
        {decks && Object.keys(decks).length > 0 && selectedDeckTitle !== 'flashcard' && (
          <div className="mt-2 pt-1 flex items-center gap-2">
            {(() => {
              const nonReservedTitle = Object.values(decks).find(title => 
                !reservedDeckTitles?.includes(title)
              );
              const displayTitle = nonReservedTitle || Object.values(decks)[0];
              const finalDisplayTitle = displayTitle === 'daily summary' ? 'Dojo' : displayTitle;
              const isCurrentDeck = finalDisplayTitle === selectedDeckTitle || 
                                      (displayTitle === 'daily summary' && selectedDeckTitle === 'daily summary') ||
                                      (finalDisplayTitle === 'Dojo' && selectedDeckTitle === 'daily summary');
              
              return (
                <span 
                  onClick={isCurrentDeck ? undefined : handleDeckClick}
                  className={`text-xs px-2 py-1 rounded-sm transition-all duration-200 max-w-[120px] truncate ${
                    isCurrentDeck 
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : 'bg-[hsl(var(--badge-bg))] text-[hsl(var(--badge-text))] cursor-pointer hover:opacity-80'
                  }`}
                >
                  {finalDisplayTitle}
                </span>
              );
            })()}
            
            {/* Pause button */}
            {selectedDeckId && data.id && onPauseToggle && (
              <IconButton
                icon={<PauseCircleIcon className={isMobile ? "h-5 w-5" : "h-6 w-6"} />}
                alternateIcon={<PlayCircleIcon className={isMobile ? "h-5 w-5" : "h-6 w-6"} />}
                isAlternateState={gptData.isPaused}
                onClick={() => handlePauseToggle(data.id, !gptData.isPaused)}
                tooltipContent={{
                  default: "Pause cycling this response in dojo",
                  alternate: "Resume cycling this response in dojo"
                }}
                buttonRef={pauseButtonRef}
                colorScheme="green-yellow"
                className="relative group"
              />
            )}
          </div>
        )}
      </>
    );
  };

  const renderCommunityMetadata = () => {
    if (!isCommunityResponseProps(props)) return null;

    const communityData = props.data;
    const isCreator = props.currentUserId === props.data.creatorUserId;

    return (
      <div className="mt-2 pt-1 flex items-center gap-2 flex-wrap">
        {/* Bookmark title badge - muted theme colors */}
        <span 
          onClick={isCommunityResponseProps(props) ? () => props.onDeckClick?.(communityData.deckTitle) : undefined}
          className="text-xs px-2 py-1 rounded-sm bg-muted text-black dark:text-white cursor-pointer hover:opacity-80 transition-all duration-200"
        >
          {communityData.deckTitle}
        </span>

        {/* Import button - badge style (disabled for creators and already imported) */}
        {(props.onImport || props.onImportWithModal) && (
          <ImportBadgeButton
            onClick={handleImport}
            disabled={isDeletingCommunity || isCreator || communityData.hasUserImported}
            isImporting={isImporting}
            buttonRef={importButtonRef}
          />
        )}

        {/* Import count with tooltip - always visible, red heart when > 0 */}
        <span className="text-xs px-2 py-1 rounded-sm bg-muted text-muted-foreground flex items-center gap-1">
          <IconButton
            icon={<HeartIcon className={`h-3 w-3 ${communityData.importCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />}
            onClick={() => {}} // No-op since it's just a display element
            tooltipContent={
              communityData.importCount === 0
                ? "Be the first to import this"
                : communityData.importCount === 1
                ? "This has been imported 1 time"
                : `This has been imported ${communityData.importCount} times`
            }
            className="!p-0 !text-inherit cursor-default"
            colorScheme="custom"
            customColors={{
              default: 'text-inherit',
              hover: 'text-inherit'
            }}
          />
          <span>{communityData.importCount}</span>
        </span>

        {/* View note button - only show if originalResponse has a note */}
        {communityData.note && (
          <span 
            onClick={() => setIsNoteModalOpen(true)}
            className="text-xs px-2 py-1 rounded-sm transition-all duration-200 flex items-center gap-1 bg-muted text-blue-600 dark:text-blue-400 cursor-pointer hover:bg-accent hover:text-blue-400 dark:hover:text-blue-300"
          >
            <DocumentTextIcon className="h-3 w-3" />
            <span>note</span>
          </span>
        )}
      </div>
    );
  };

  // Main render - Match GPTResponse structure exactly
  const expressions = extractExpressions(data.content);
  const hasExpression = expressions.length > 0;

  return (
    <div className={`px-3 py-3 rounded text-foreground w-full ${selectedDeckTitle !== 'flashcard' ? 'border-b-2 border-border' : ''}`}>
      {/* Header with rank/alias and action buttons - matching GPTResponse layout */}
      <div className="flex items-start justify-between mb-4">
        {/* Left side - Rank container for GPT, User alias badge for Community */}
        <div className="flex items-center gap-2">
          {isGPTResponseProps(props) ? (
            <RankContainer 
              rank={newRank}
              onRankClick={async (increment: boolean) => {
                const newRankValue = increment ? newRank + 1 : newRank - 1;
                if (newRankValue >= 1 && newRankValue <= 3) {
                  setNewRank(newRankValue);
                  if (props.onRankUpdate && data.id) {
                    await props.onRankUpdate(data.id, newRankValue);
                  }
                }
              }}
            />
          ) : (
            // User alias badge with custom color
            <AliasBadge 
              alias={isCommunityResponseProps(props) ? props.data.creatorAlias : ''}
              onClick={isCommunityResponseProps(props) ? () => props.onAliasClick?.(props.data.creatorAlias) : undefined}
              customColor={isCommunityResponseProps(props) ? props.aliasColor : undefined}
            />
          )}

          {/* Breakdown and Speaker on the left (matching GPTResponse) */}
          {hasExpression && (
            <>
              <BreakdownButton 
                onClick={handleBreakdownClick}
                disabled={isBreakdownLoading}
                buttonRef={breakdownButtonRef}
              />

              <SpeakerButton 
                responseId={data.id || ''}
                textToSpeak={prepareTextForSpeech(data.content)}
                selectedLanguage={selectedLanguage}
                buttonRef={speakerButtonRef}
                cachedAudio={cachedAudioData}
                onLoadingChange={onLoadingChange}
                onAudioCached={(audioData) => setCachedAudioData(audioData)}
              />
            </>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Furigana controls (GPT only) */}
          {isGPTResponseProps(props) && selectedLanguage === 'ja' && (
            <div className="relative" ref={furiganaDropdownRef}>
              <button 
                onClick={() => setShowFuriganaDropdown(!showFuriganaDropdown)}
                className="text-foreground hover:text-muted-foreground transition-colors duration-200"
              >
                {localFuriganaEnabled ? <EyeIcon className="h-6 w-6" /> : <EyeSlashIcon className="h-6 w-6" />}
              </button>
              
              {showFuriganaDropdown && (
                <div className="absolute right-0 top-8 bg-popover border border-border rounded-md shadow-lg z-10 min-w-[200px]">
                  <div className="p-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input 
                        type="checkbox" 
                        checked={localFuriganaEnabled}
                        onChange={(e) => {
                          setLocalFuriganaEnabled(e.target.checked);
                          if (props.onFuriganaToggle && data.id) {
                            props.onFuriganaToggle(data.id, e.target.checked);
                          }
                        }}
                      />
                      Furigana
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Type-specific action buttons */}
          {renderActionButtons()}
        </div>
      </div>

      {/* Content */}
      <div className={`whitespace-pre-wrap overflow-x-auto ${selectedDeckTitle === 'flashcard' ? 'w-full flex justify-center items-center' : 'w-[90%]'}`}>
        <ExpandableContent maxHeight={262.5} className="overflow-x-auto w-full">
          {isCommunityResponseProps(props) && props.data.responseType === 'clarification' ? (
            // Special handling for community clarifications: parse into blocks and render each appropriately
            (() => {
              const clarificationBlocks = parseClarificationResponse(data.content);
              let expressionIndex = 0; // Track which expression block we're rendering
              
              return clarificationBlocks.map((block, blockIdx) => (
                <React.Fragment key={blockIdx}>
                  {block.type === 'expression' ? (
                    // Render expression blocks as StandardResponse
                    (() => {
                      const currentExpressionIndex = expressionIndex;
                      expressionIndex++; // Increment for next expression block
                      const blockFurigana = clarificationFuriganaArray?.[currentExpressionIndex] || null;
                      
                      return (
                        <StandardResponse 
                          items={block.lines}
                          selectedLanguage={selectedLanguage}
                          responseId={`${data.id}-block-${blockIdx}`}
                          cachedFurigana={blockFurigana}
                          onFuriganaGenerated={() => {}}
                          isFuriganaEnabled={localFuriganaEnabled}
                          isPhoneticEnabled={localPhoneticEnabled}
                          isKanaEnabled={localKanaEnabled}
                          responseType="clarification"
                          hideContent={hideContent}
                          containerWidth={containerWidth}
                          isFlashcard={selectedDeckTitle === 'flashcard'}
                        />
                      );
                    })()
                  ) : (
                    // Render markdown blocks as StyledMarkdown
                    <div className="pr-3 text-primary">
                      <StyledMarkdown>
                        {block.rawText}
                      </StyledMarkdown>
                    </div>
                  )}
                  {/* Add spacing between blocks */}
                  {blockIdx < clarificationBlocks.length - 1 && <div style={{height: '1em'}} />}
                </React.Fragment>
              ));
            })()
          ) : parsedBlocks.some(items => items && items.length > 0) ? (
            parsedBlocks.map((items, blockIdx) =>
              items && items.length > 0 ? (
                <React.Fragment key={blockIdx}>
                  {items.some(item => item.match(/^\s*\d+\/\s*/)) ? (
                    isStandardResponse(items) ? (
                      <StandardResponse 
                        items={items.filter(item => item.match(/^\s*\d+\/\s*/))} 
                        selectedLanguage={selectedLanguage}
                        responseId={data.id ?? null}
                        cachedFurigana={currentFurigana}
                        onFuriganaGenerated={setCurrentFurigana}
                        isFuriganaEnabled={localFuriganaEnabled}
                        isPhoneticEnabled={localPhoneticEnabled}
                        isKanaEnabled={localKanaEnabled}
                        hideContent={hideContent}
                        containerWidth={containerWidth}
                        isFlashcard={selectedDeckTitle === 'flashcard'}
                      />
                    ) : (
                      <div className="pr-3 text-primary">
                        {items.map((item, idx) => {
                          const numberMatch = item.match(/^\s*(\d+)\/\s*(.*)$/);
                          if (numberMatch) {
                            return (
                              <div key={idx} style={{ margin: 0, marginBottom: '0.5em', padding: 0 }}>
                                <span className="text-muted-foreground">{`${numberMatch[1]}.`}</span>{' '}
                                {numberMatch[2]}
                              </div>
                            );
                          } else {
                            return (
                              <div key={idx} style={{ marginBottom: '0.5em' }}>
                                {item}
                              </div>
                            );
                          }
                        })}
                      </div>
                    )
                  ) : (
                    <div className="pr-3 text-primary">
                      <StyledMarkdown>
                        {items.join('\n')}
                      </StyledMarkdown>
                    </div>
                  )}
                  {blockIdx < parsedBlocks.length - 1 && <div style={{height: '1em'}} />}
                </React.Fragment>
              ) : null
            )
          ) : (
            <div className="pr-3 text-primary">
              <StyledMarkdown>
                {cleanResponse}
              </StyledMarkdown>
            </div>
          )}
        </ExpandableContent>
      </div>

      {/* Metadata badges */}
      {renderMetadata()}

      {/* Modals */}
      {isGPTResponseProps(props) && (
        <>
          {isDeckModalOpen && (
            <DecksModal
              isOpen={isDeckModalOpen}
              onClose={() => setIsDeckModalOpen(false)}
              response={data.content}
              reservedDeckTitles={props.reservedDeckTitles}
              cachedAudio={null}
              desktopBreakdownContent={desktopBreakdownContent}
              mobileBreakdownContent={mobileBreakdownContent}
              furigana={currentFurigana}
              isFuriganaEnabled={localFuriganaEnabled}
              isPhoneticEnabled={localPhoneticEnabled}
              isKanaEnabled={localKanaEnabled}
              onDeckCreated={props.onDeckCreated}
              onDeckSelect={props.onDeckSelect}
              onDecksRefresh={props.onDecksRefresh}
              onGPTResponseAdded={handleGPTResponseAdded}
            />
          )}
          {showDeckNavigationModal && addedDeckInfo && (
            <DeckNavigationModal
              isOpen={showDeckNavigationModal}
              title="Added to Deck"
              message={`Successfully added response to '${addedDeckInfo.title}'.`}
              deckInfo={addedDeckInfo}
              onNavigateToDeck={(deckId, deckTitle) => {
                if (props.onDeckSelect) {
                  router.push(`/?deckId=${deckId}&deckTitle=${encodeURIComponent(deckTitle)}`);
                  props.onDeckSelect(deckId, deckTitle);
                }
              }}
              onStayHere={() => {
                setShowDeckNavigationModal(false);
                setAddedDeckInfo(null);
              }}
            />
          )}
          {isDeleteModalOpen && (
            <DeleteGPTResponseModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={handleDeleteConfirm}
            />
          )}
        </>
      )}

      {/* Community delete confirmation modal - basic (for responses without imports) */}
      {showDeleteConfirmModal && (
        <ConfirmationModal
            isOpen={showDeleteConfirmModal}
            onClose={handleCommunityDeleteCancel}
            onConfirm={handleCommunityDeleteConfirm}
            title="Delete Community Response"
            message="Are you sure you want to delete this community response?"
            confirmText="Delete"
            confirmButtonColor="red"
          />
      )}

      {/* Enhanced delete modal - for responses with imports */}
      {showEnhancedDeleteModal && isCommunityResponseProps(props) && (
        <EnhancedDeleteModal
          isOpen={showEnhancedDeleteModal}
          onClose={handleEnhancedDeleteCancel}
          onConfirm={handleCommunityDeleteConfirm}
          importCount={props.data.importCount}
          importerCount={props.data.importCount} // Using importCount as proxy for importerCount
          isDeleting={isDeletingCommunity}
        />
      )}

      {isBreakdownModalOpen && (
        <BreakdownModal
          isOpen={isBreakdownModalOpen}
          onClose={() => setIsBreakdownModalOpen(false)}
          content={currentBreakdownContent}
          isLoading={isBreakdownLoading}
          isTextView={isBreakdownTextView}
          canToggle={!!(mobileBreakdownContent || desktopBreakdownContent) || !!data.id}
          originalResponse={data.content}
          rank={isGPTResponseProps(props) ? props.data.rank : 1}
          isPaused={isGPTResponseProps(props) ? props.data.isPaused : false}
          responseId={data.id || null}
          selectedDeckTitle={selectedDeckTitle}
          onRankUpdate={isGPTResponseProps(props) ? props.onRankUpdate : undefined}
          onPauseToggle={isGPTResponseProps(props) ? props.onPauseToggle : undefined}
          selectedLanguage={selectedLanguage}
          onLoadingChange={onLoadingChange}
          cachedAudio={cachedAudioData}
          onAudioCached={(audioData) => setCachedAudioData(audioData)}
          onError={(error) => {
            setErrorMessage(error);
            setIsErrorModalOpen(true);
          }}
          onToggleView={handleBreakdownFormatToggle}
          source={isGPTResponseProps(props) ? props.data.source : undefined}
          communityResponse={isCommunityResponseProps(props) && creatorAlias ? {
            id: props.data.id,
            isActive: props.data.isActive,
            creatorAlias: creatorAlias
          } : undefined}
          aliasColor={aliasColor}
        />
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        error={errorMessage}
      />

      {/* Note Modal - view only for community responses */}
      {isNoteModalOpen && isCommunityResponseProps(props) && props.data.note && (
        <NoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          note={props.data.note}
          isEditing={false}
          onEdit={() => {}} // No-op since community responses are view-only
        />
      )}
    </div>
  );
}
