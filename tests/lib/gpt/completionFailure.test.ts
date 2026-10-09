import { DEFAULT_LLM_MODEL, LLM_REQUEST_TIMEOUT_MS } from '@/lib/gpt/aiConfig';
import {
  completionFailureResponse,
  messageFromFailedCompletion,
} from '@/lib/gpt/completionFailure';

describe('study model', () => {
  it('stays on a non-reasoning model that answers inside the function budget', () => {
    expect(DEFAULT_LLM_MODEL).toBe('grok-4.20-0309-non-reasoning');
    expect(DEFAULT_LLM_MODEL).not.toMatch(/gpt-|grok-4\.[567]/);
    expect(LLM_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(20_000);
  });
});

describe('completionFailureResponse', () => {
  it('maps an exhausted provider account to a credit message', () => {
    expect(completionFailureResponse({
      status: 429,
      code: 'credit_balance_exhausted',
      message: '429 You have no credits remaining.',
    })).toEqual({
      status: 503,
      message: 'Study responses are unavailable because the language model account has no credits.',
    });
  });

  it('maps insufficient_quota the same way', () => {
    expect(completionFailureResponse({ code: 'insufficient_quota' }).status).toBe(503);
  });

  it('maps a provider timeout without echoing the raw error', () => {
    expect(completionFailureResponse({
      name: 'APIConnectionTimeoutError',
      message: 'Request timed out.',
    })).toEqual({
      status: 504,
      message: 'The language model took too long to respond. Try again.',
    });
  });

  it('hides other provider failures behind a generic message', () => {
    const result = completionFailureResponse({
      status: 401,
      message: 'Incorrect API key sk-secret',
    });
    expect(result.status).toBe(502);
    expect(result.message).not.toMatch(/sk-secret|Incorrect API key/);
  });
});

describe('messageFromFailedCompletion', () => {
  it('uses the JSON message from the route', () => {
    expect(messageFromFailedCompletion(JSON.stringify({
      message: 'The language model took too long to respond. Try again.',
    }))).toBe('The language model took too long to respond. Try again.');
  });

  it('falls back when the body is an HTML timeout page', () => {
    expect(messageFromFailedCompletion('<html>504 Gateway Timeout</html>'))
      .toBe('The language model request failed. Try again.');
  });

  it('falls back when the message is blank', () => {
    expect(messageFromFailedCompletion(JSON.stringify({ message: '   ' })))
      .toBe('The language model request failed. Try again.');
  });
});
