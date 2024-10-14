import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Read the prompt from the external file
const promptPath = path.join(process.cwd(), 'japanese_gpt_prompt.txt');
const systemPrompt = fs.readFileSync(promptPath, 'utf8');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST requests allowed' });
    return;
  }

  const { prompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // or any model you choose
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });
    console.log(completion.choices[0].message.content);
    res.status(200).json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error fetching from OpenAI:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Error generating completion' });
  }
}
