'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
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
  CalendarIcon,
  HeartIcon,
  ShareIcon
} from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import BookmarksModal from './BookmarksModal';
import DeleteGPTResponseModal from './DeleteGPTResponseModal';
import EnhancedDeleteModal from './EnhancedDeleteModal';
import BreakdownModal from './BreakdownModal';
import ErrorModal from './ErrorModal';
import RankContainer from './ui/RankContainer';
import IconButton from './ui/IconButton';
import { 
  StyledMarkdown, 
  DeleteIcon, 
  UserAliasContainer,
  SpeakerButton,
  BreakdownButton,
  QuoteButton,
  ImportButton,
  ImportBadgeButton,
  ConfirmationModal
} from './ui';
import Tooltip from './Tooltip';
import { trackBreakdownClick, trackPauseToggle, trackChangeRank, trackAddToBookmark } from '@/lib/analytics';
import { extractExpressions, prepareTextForSpeech, getAliasCSSVars } from '@/lib/utils';
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
  const { type, data, selectedBookmarkTitle, selectedLanguage = 'ja', hideContent = false, showAnswer, onToggleAnswer, onQuote, onBreakdownClick, onLoadingChange, containerWidth } = props;

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

  // GPT-specific state
  const [newRank, setNewRank] = useState(isGPTResponseProps(props) ? props.data.rank : 1);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localFuriganaEnabled, setLocalFuriganaEnabled] = useState(isGPTResponseProps(props) ? props.data.isFuriganaEnabled : false);
  const [localPhoneticEnabled, setLocalPhoneticEnabled] = useState(isGPTResponseProps(props) ? props.data.isPhoneticEnabled : false);
  const [localKanaEnabled, setLocalKanaEnabled] = useState(isGPTResponseProps(props) ? props.data.isKanaEnabled : false);
  const [showFuriganaDropdown, setShowFuriganaDropdown] = useState(false);

  // Community-specific state
  const [isImporting, setIsImporting] = useState(false);
  const [isDeletingCommunity, setIsDeletingCommunity] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showEnhancedDeleteModal, setShowEnhancedDeleteModal] = useState(false);

  // Refs and other hooks
  const router = useRouter();
  const { isMobile, mobileOffset } = useIsMobile();
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const speakerButtonRef = useRef<HTMLButtonElement>(null);
  const quoteButtonRef = useRef<HTMLButtonElement>(null);
  const breakdownButtonRef = useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const furiganaDropdownRef = useRef<HTMLDivElement>(null);

  // Hover states
  const [isQuoteHovered, setIsQuoteHovered] = useState(false);
  const [isBookmarkHovered, setIsBookmarkHovered] = useState(false);

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
      const result = await deleteCommunityResponseAction(data.id);
      
      if (result.success) {
        setShowDeleteConfirmModal(false);
        setShowEnhancedDeleteModal(false);
        // Trigger any parent refresh logic if needed
        // Use a different approach to refresh the community feed
        window.location.reload(); // Simple refresh for now
      } else {
        console.error('Error deleting community response:', result.error);
        // TODO: Show error modal
      }
    } catch (error) {
      console.error('Error deleting community response:', error);
      // TODO: Show error modal
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

  const parsedBlocks = parseResponse(data.content);

  // Standard response detection (shared logic)
  const isStandardResponse = (items: string[]) => {
    const numberedItems = items.filter(item => item.match(/^\s*\d+\/\s*/));
    return numberedItems.length >= 2 && numberedItems.length <= 4 && numberedItems.length === items.length;
  };

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

      const response = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: data.content,
          language: selectedLanguage,
          responseId: data.id,
          isMobile
        }),
      });

      if (!response.ok) throw new Error('Failed to generate breakdown');

      const result = await response.json();
      const breakdown = isMobile ? result.mobileBreakdown : result.desktopBreakdown;
      
      setCurrentBreakdownContent(breakdown);
      if (isMobile) {
        setMobileBreakdownContent(breakdown);
      } else {
        setDesktopBreakdownContent(breakdown);
      }
      
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

  const handleBreakdownFormatToggle = () => {
    setIsBreakdownTextView(!isBreakdownTextView);
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
      await props.onDelete(data.id, props.data.bookmarks || {});
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

  const handleBookmarkClick = () => {
    if (!isGPTResponseProps(props)) return;
    
    const bookmarks = props.data.bookmarks;
    if (bookmarks && Object.keys(bookmarks).length > 0) {
      const nonReservedBookmarkEntry = Object.entries(bookmarks).find(([id, title]) => 
        !props.reservedBookmarkTitles.includes(title)
      );
      
      if (nonReservedBookmarkEntry) {
        const [bookmarkId, bookmarkTitle] = nonReservedBookmarkEntry;
        router.push(`/?bookmarkId=${bookmarkId}&bookmarkTitle=${encodeURIComponent(bookmarkTitle)}`);
        props.onBookmarkSelect?.(bookmarkId, bookmarkTitle);
      } else {
        const [bookmarkId, bookmarkTitle] = Object.entries(bookmarks)[0];
        router.push(`/?bookmarkId=${bookmarkId}&bookmarkTitle=${encodeURIComponent(bookmarkTitle)}`);
        props.onBookmarkSelect?.(bookmarkId, bookmarkTitle);
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

    const { selectedBookmarkId, onDelete, onQuote } = props;

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
                  if (selectedBookmarkId && props.onBookmarkSelect) {
                    props.onBookmarkSelect(null, null);
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
                if (selectedBookmarkId && props.onBookmarkSelect) {
                  props.onBookmarkSelect(null, null);
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
        {selectedBookmarkId && data.id && onDelete && (
          <button 
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive/80 disabled:opacity-50 transition-colors duration-200"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        )}

        {/* Add to bookmark button */}
        {!selectedBookmarkId && (
          !isMobile ? (
            <Tooltip
              content="Add to bookmark"
              isVisible={isBookmarkHovered}
              buttonRef={bookmarkButtonRef}
            >
              <button 
                ref={bookmarkButtonRef}
                onClick={() => setIsBookmarkModalOpen(true)} 
                onMouseEnter={() => setIsBookmarkHovered(true)}
                onMouseLeave={() => setIsBookmarkHovered(false)}
                className="text-foreground hover:text-blue-400 transition-colors duration-200"
              >
                <PlusIcon className="h-6 w-6" />
              </button>
            </Tooltip>
          ) : (
            <button 
              ref={bookmarkButtonRef}
              onClick={() => setIsBookmarkModalOpen(true)} 
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
            onClick={() => onQuote(data.content, 'input')}
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

    const { data: gptData, selectedBookmarkId, onPauseToggle, reservedBookmarkTitles } = props;
    const bookmarks = gptData.bookmarks;

    return (
      <>
        {/* Bookmark badge with pause toggle */}
        {bookmarks && Object.keys(bookmarks).length > 0 && selectedBookmarkTitle !== 'flashcard' && (
          <div className="mt-2 pt-1 flex items-center gap-2">
            {(() => {
              const nonReservedTitle = Object.values(bookmarks).find(title => 
                !reservedBookmarkTitles.includes(title)
              );
              const displayTitle = nonReservedTitle || Object.values(bookmarks)[0];
              const finalDisplayTitle = displayTitle === 'daily summary' ? 'Dojo' : displayTitle;
              const isCurrentBookmark = finalDisplayTitle === selectedBookmarkTitle || 
                                      (displayTitle === 'daily summary' && selectedBookmarkTitle === 'daily summary') ||
                                      (finalDisplayTitle === 'Dojo' && selectedBookmarkTitle === 'daily summary');
              
              return (
                <span 
                  onClick={isCurrentBookmark ? undefined : handleBookmarkClick}
                  className={`text-xs px-2 py-1 rounded-sm transition-all duration-200 max-w-[120px] truncate ${
                    isCurrentBookmark 
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : 'bg-[hsl(var(--badge-bg))] text-[hsl(var(--badge-text))] cursor-pointer hover:opacity-80'
                  }`}
                >
                  {finalDisplayTitle}
                </span>
              );
            })()}
            
            {/* Pause button */}
            {selectedBookmarkId && data.id && onPauseToggle && (
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
        <span className="text-xs px-2 py-1 rounded-sm bg-muted text-muted-foreground">
          {communityData.bookmarkTitle}
        </span>

        {/* Shared date - muted theme colors */}
        <span className="text-xs px-2 py-1 rounded-sm bg-muted text-muted-foreground flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />
          {format(communityData.sharedAt, 'MMM d')}
        </span>

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

        {/* Import button - badge style (disabled for creators and already imported) */}
        {(props.onImport || props.onImportWithModal) && (
          <ImportBadgeButton
            onClick={handleImport}
            disabled={isDeletingCommunity || isCreator || communityData.hasUserImported}
            isImporting={isImporting}
            buttonRef={quoteButtonRef}
          />
        )}
      </div>
    );
  };

  // Main render - Match GPTResponse structure exactly
  return (
    <div className={`px-3 py-3 rounded text-foreground w-full ${selectedBookmarkTitle !== 'flashcard' ? 'border-b-2 border-border' : ''}`}>
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
            <span 
              onClick={isCommunityResponseProps(props) ? () => props.onViewProfile?.(props.data.creatorUserId) : undefined}
              className="text-xs px-2 py-1 rounded-sm cursor-pointer hover:opacity-80 transition-all duration-200"
              style={
                isCommunityResponseProps(props) && props.aliasColor
                  ? {
                      backgroundColor: props.aliasColor,
                      borderColor: props.aliasColor,
                      color: '#333333',
                      border: '1px solid',
                      opacity: 0.9
                    }
                  : isCommunityResponseProps(props) 
                    ? getAliasCSSVars(props.data.creatorAlias)
                    : undefined
              }
            >
              @{isCommunityResponseProps(props) ? props.data.creatorAlias : ''}
            </span>
          )}

          {/* Breakdown and Speaker on the left (matching GPTResponse) */}
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
            cachedAudio={data.audio && data.audioMimeType ? { audio: data.audio, mimeType: data.audioMimeType } : null}
            onLoadingChange={onLoadingChange}
          />
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
      <div className={`whitespace-pre-wrap overflow-x-auto ${selectedBookmarkTitle === 'flashcard' ? 'w-full flex justify-center items-center' : 'w-[90%]'}`}>
        {parsedBlocks.some(items => items && items.length > 0) ? (
          parsedBlocks.map((items, blockIdx) =>
            items && items.length > 0 ? (
              <React.Fragment key={blockIdx}>
                {items.some(item => item.match(/^\s*\d+\/\s*/)) ? (
                  isStandardResponse(items) ? (
                    <StandardResponse 
                      items={items.filter(item => item.match(/^\s*\d+\/\s*/))} 
                      selectedLanguage={selectedLanguage}
                      responseId={data.id || null}
                      cachedFurigana={currentFurigana}
                      onFuriganaGenerated={(furigana) => setCurrentFurigana(furigana)}
                      isFuriganaEnabled={localFuriganaEnabled}
                      isPhoneticEnabled={localPhoneticEnabled}
                      isKanaEnabled={localKanaEnabled}
                      hideContent={hideContent}
                      containerWidth={containerWidth}
                      isFlashcard={selectedBookmarkTitle === 'flashcard'}
                    />
                  ) : (
                    <div className="pr-3 text-primary">
                      {items.map((item, idx) => {
                        const numberMatch = item.match(/^\s*(\d+)\/\s*/);
                        if (numberMatch) {
                          const originalNumber = numberMatch[1];
                          const cleanedItem = item.replace(/^\s*\d+\/\s*/, '').trim();
                          return (
                            <div key={idx} className="mb-2">
                              <span className="font-semibold text-accent-foreground">{originalNumber}. </span>
                              <span>{cleanedItem}</span>
                            </div>
                          );
                        }
                        return <div key={idx} className="mb-2">{item}</div>;
                      })}
                    </div>
                  )
                ) : (
                  <div className="pr-3 text-primary">
                    <div className="overflow-x-auto w-full">
                      <StyledMarkdown>
                        {items.join('\n')}
                      </StyledMarkdown>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ) : null
          )
        ) : (
          <div className="pr-3 text-primary">
            <div className="overflow-x-auto w-full">
              <StyledMarkdown>
                {data.content}
              </StyledMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Metadata badges */}
      {renderMetadata()}

      {/* Modals */}
      {isGPTResponseProps(props) && (
        <>
          {isBookmarkModalOpen && (
            <BookmarksModal
              isOpen={isBookmarkModalOpen}
              onClose={() => setIsBookmarkModalOpen(false)}
              response={data.content}
              reservedBookmarkTitles={props.reservedBookmarkTitles}
              cachedAudio={null}
              desktopBreakdownContent={desktopBreakdownContent}
              mobileBreakdownContent={mobileBreakdownContent}
              furigana={currentFurigana}
              isFuriganaEnabled={localFuriganaEnabled}
              isPhoneticEnabled={localPhoneticEnabled}
              isKanaEnabled={localKanaEnabled}
              onBookmarkCreated={props.onBookmarkCreated}
              onBookmarkSelect={props.onBookmarkSelect}
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
          selectedBookmarkTitle={selectedBookmarkTitle}
          onRankUpdate={isGPTResponseProps(props) ? props.onRankUpdate : undefined}
          onPauseToggle={isGPTResponseProps(props) ? props.onPauseToggle : undefined}
          selectedLanguage={selectedLanguage}
          onLoadingChange={onLoadingChange}
          onError={(error) => {
            setErrorMessage(error);
            setIsErrorModalOpen(true);
          }}
          onToggleView={handleBreakdownFormatToggle}
        />
      )}

      {/* Error Modal */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        error={errorMessage}
      />
    </div>
  );
}
