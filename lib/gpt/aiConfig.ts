/**
 * Study-content model, served by xAI's OpenAI-compatible API from pages/api/openai.ts.
 *
 * Non-reasoning on purpose. Reasoning models (grok-4.5 and later) run past the
 * function time limit, and the OpenAI account this route used to call has no
 * credits, so every gpt-4o request failed before a response was produced.
 */
export const XAI_BASE_URL = 'https://api.x.ai/v1';

export const DEFAULT_LLM_MODEL = 'grok-4.20-0309-non-reasoning';

/** Per attempt. One retry still finishes inside the 60s function limit. */
export const LLM_REQUEST_TIMEOUT_MS = 20_000;

/** Browser wait, just past the function limit, so a killed request still shows an error. */
export const LLM_CLIENT_TIMEOUT_MS = 70_000;
