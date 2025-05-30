import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

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
    const { prompt, languageCode = 'ja', model = 'gpt-4o' } = req.body;
    const systemPrompt = getPromptFromFile(languageCode);

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
    return res.status(200).json({ result });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Error processing request' });
  }
}
