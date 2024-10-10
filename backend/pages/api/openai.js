import * as OpenAI from 'openai';

const configuration = new OpenAI.Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAI.OpenAIApi(configuration);

console.log("API KEY:", process.env.OPENAI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Only POST requests allowed' });
    return;
  }

  const { prompt } = req.body;

  try {
    const completion = await openai.createCompletion({
      model: 'gpt-4o', // or any model you choose
      messages: [
        { role: 'system', content: 'You are a helpful assistant for learning Japanese.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    console.log(completion.data.choices[0].message.content);
    res.status(200).json({ result: completion.data.choices[0].message.content });
  } catch (error) {
    console.error('Error fetching from OpenAI:', error);
    res.status(500).json({ message: 'Error generating completion' });
  }
}