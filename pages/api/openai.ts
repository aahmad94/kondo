import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Read the prompt from the external file
const promptPath = path.join(process.cwd(), 'japanese_gpt_prompt.txt');
const systemPrompt = fs.readFileSync(promptPath, 'utf8');
export const maxDuration = 30; // This function can run for a maximum of 5 seconds

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST requests allowed' });
    return;
  }

  const { prompt } = req.body as { prompt: string };

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // or any model you choose
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    if (!completion.choices[0].message.content) {
      throw new Error('No content in OpenAI response');
    }

    res.status(200).json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error fetching from OpenAI:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ message: 'Error generating completion' });
  }
}
