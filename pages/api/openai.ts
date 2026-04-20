import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { authOptions } from './auth/[...nextauth]';
import { checkResponseQuota, quotaExceededResponse } from '@/lib/stripe/subscriptionService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Read prompts from files
const getPromptFromFile = (languageCode: string): string => {
  const promptPath = path.join(process.cwd(), 'prompts', `${languageCode}_gpt_prompt.txt`);
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
    const session = await getServerSession(req, res, authOptions);
    const userId = (session as any)?.userId || (session?.user as any)?.id;

    // Only enforce quota for authenticated users
    if (userId) {
      const quota = await checkResponseQuota(userId);
      if (!quota.allowed) {
        return res.status(429).json(quotaExceededResponse('responses', quota));
      }
    }

    const { prompt, languageCode = 'ja', model = 'gpt-4o', systemPrompt: customSystemPrompt, responseType = 'response' } = req.body;

    // Use custom system prompt if provided, otherwise use default language prompt
    const systemPrompt = customSystemPrompt || getPromptFromFile(languageCode);

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const result = completion.choices[0]?.message?.content || 'No response generated';
    return res.status(200).json({ result, responseType });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Error processing request' });
  }
}
