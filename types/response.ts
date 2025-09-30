// Shared response data interface
export interface BaseResponseData {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  languageId: string;
  breakdown?: string | null;
  mobileBreakdown?: string | null;
  furigana?: string | null;
  audio?: string | null;
  audioMimeType?: string | null;
}

// GPT Response specific data
export interface GPTResponseData extends BaseResponseData {
  userId: string;
  rank: number;
  isPaused: boolean;
  isFuriganaEnabled: boolean;
  isPhoneticEnabled: boolean;
  isKanaEnabled: boolean;
  source: 'local' | 'imported';
  communityResponseId?: string | null;
  decks?: Record<string, string>;
}

// Community Response specific data
export interface CommunityResponseData extends BaseResponseData {
  originalResponseId: string;
  creatorAlias: string;
  creatorUserId: string;
  deckTitle: string;
  isActive: boolean;
  importCount: number;
  sharedAt: Date;
  hasUserImported?: boolean;
}

// Shared props for both response types
interface BaseResponseProps {
  selectedDeckTitle: string | null;
  selectedLanguage?: string;
  hideContent?: boolean;
  showAnswer?: boolean;
  onToggleAnswer?: () => void;
  onQuote?: (response: string, type: 'submit' | 'breakdown' | 'input') => void;
  onBreakdownClick?: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
  containerWidth?: number;
}

// GPT Response specific props
export interface GPTResponseProps extends BaseResponseProps {
  type: 'gpt';
  data: GPTResponseData;
  selectedDeckId: string | null;
  reservedDeckTitles: string[];
  onDelete?: (responseId: string, decks: Record<string, string>) => Promise<void>;
  onDeckCreated?: (newDeck: { id: string, title: string }) => void;
  onRankUpdate?: (responseId: string, newRank: number) => Promise<void>;
  onPauseToggle?: (responseId: string, isPaused: boolean) => Promise<void>;
  onFuriganaToggle?: (responseId: string, isFuriganaEnabled: boolean) => Promise<void>;
  onPhoneticToggle?: (responseId: string, isPhoneticEnabled: boolean) => Promise<void>;
  onKanaToggle?: (responseId: string, isKanaEnabled: boolean) => Promise<void>;
  onGenerateSummary?: (forceRefresh?: boolean) => Promise<void>;
  onDeckSelect?: (id: string | null, title: string | null) => void;
  onBreakdownToggle?: React.MutableRefObject<(() => void) | null>;
  onShare?: (responseId: string) => void;
  onDecksRefresh?: () => void;
}

// Community Response specific props
export interface CommunityResponseProps extends BaseResponseProps {
  type: 'community';
  data: CommunityResponseData;
  onImport?: (communityResponseId: string) => Promise<void>;
  onImportWithModal?: (communityResponse: CommunityResponseData) => void;
  onDelete?: (communityResponseId: string) => Promise<void>;
  onViewProfile?: (userId: string) => void;
  onAliasClick?: (alias: string) => void;
  onDeckClick?: (deckTitle: string) => void;
  onDeckSelect?: (id: string | null, title: string | null) => void;
  currentUserId?: string;
  currentUserHasAlias?: boolean;
  isImporting?: boolean;
  aliasColor?: string;
  onDecksRefresh?: () => void;
}

// Union type for all response props
export type ResponseProps = GPTResponseProps | CommunityResponseProps;

// Type guard functions
export function isGPTResponseProps(props: ResponseProps): props is GPTResponseProps {
  return props.type === 'gpt';
}

export function isCommunityResponseProps(props: ResponseProps): props is CommunityResponseProps {
  return props.type === 'community';
}
