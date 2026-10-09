const GENERIC_FAILURE = 'The language model request failed. Try again.';
const TIMEOUT_FAILURE = 'The language model took too long to respond. Try again.';
const QUOTA_FAILURE = 'Study responses are unavailable because the language model account has no credits.';

type CompletionErrorLike = {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
};

function asCompletionError(error: unknown): CompletionErrorLike {
  if (!error || typeof error !== 'object') return {};
  return error as CompletionErrorLike;
}

/** Map a provider failure to a status and a message safe to show in the chat. */
export function completionFailureResponse(error: unknown): { status: number; message: string } {
  const err = asCompletionError(error);
  const code = err.code || '';
  const name = err.name || '';

  if (
    err.status === 429 ||
    code === 'insufficient_quota' ||
    code === 'credit_balance_exhausted'
  ) {
    return { status: 503, message: QUOTA_FAILURE };
  }

  if (name === 'APIConnectionTimeoutError' || name === 'TimeoutError' || code === 'ETIMEDOUT') {
    return { status: 504, message: TIMEOUT_FAILURE };
  }

  return { status: 502, message: GENERIC_FAILURE };
}

/** Pull a user-facing message out of a failed /api/openai body. */
export function messageFromFailedCompletion(bodyText: string): string {
  try {
    const body = JSON.parse(bodyText) as { message?: unknown };
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Platform timeouts return an HTML page, not JSON.
  }
  return GENERIC_FAILURE;
}
