import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { authOptions } from './auth/[...nextauth]';
import {
  checkResponseQuota,
  incrementResponseUsage,
  quotaExceededResponse,
} from '@/lib/stripe/subscriptionService';
import {
  DEFAULT_LLM_MODEL,
  LLM_REQUEST_TIMEOUT_MS,
  XAI_BASE_URL,
} from '@/lib/gpt/aiConfig';
import { completionFailureResponse } from '@/lib/gpt/completionFailure';

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: XAI_BASE_URL,
  timeout: LLM_REQUEST_TIMEOUT_MS,
  maxRetries: 1,
});

export const config = {
  maxDuration: 60,
};

const getPromptFromFile = (languageCode: string): string | null => {
  if (!/^[a-z]{2}$/.test(languageCode)) return null;
  const promptPath = path.join(process.cwd(), 'prompts', `${languageCode}_gpt_prompt.txt`);
  if (!fs.existsSync(promptPath)) return null;
  return fs.readFileSync(promptPath, 'utf8');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (!process.env.XAI_API_KEY) {
      return res.status(503).json({ message: 'XAI_API_KEY is not configured' });
    }

    const session = await getServerSession(req, res, authOptions);
    const userId = (session as any)?.userId || (session?.user as any)?.id;

    if (userId) {
      const quota = await checkResponseQuota(userId);
      if (!quota.allowed) {
        return res.status(429).json(quotaExceededResponse('responses', quota));
      }
    }

    const {
      prompt,
      languageCode = 'ja',
      systemPrompt: customSystemPrompt,
      responseType = 'response',
    } = req.body ?? {};

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    // Callers used to send gpt-4o / gpt-4o-mini. Those ids are rejected by xAI
    // and the OpenAI account behind them has no credits, so the server picks
    // the model.
    const systemPrompt = (typeof customSystemPrompt === 'string' && customSystemPrompt.trim())
      ? customSystemPrompt
      : getPromptFromFile(typeof languageCode === 'string' ? languageCode : 'ja');
    if (!systemPrompt) {
      return res.status(400).json({ message: 'Unsupported language' });
    }

    const completion = await openai.chat.completions.create({
      model: DEFAULT_LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const result = completion.choices[0]?.message?.content?.trim();
    if (!result) {
      return res.status(502).json({ message: 'The language model returned an empty response. Try again.' });
    }

    // Count this generation toward the user's weekly response quota.
    // Done after a successful completion so failed calls don't count.
    if (userId) {
      await incrementResponseUsage(userId);
    }

    return res.status(200).json({ result, responseType });
  } catch (error) {
    const failure = completionFailureResponse(error);
    const details = error as { status?: number; code?: string; message?: string };
    console.error('Completion failed', {
      status: details?.status,
      code: details?.code,
      message: details?.message,
    });
    return res.status(failure.status).json({ message: failure.message });
  }
}
