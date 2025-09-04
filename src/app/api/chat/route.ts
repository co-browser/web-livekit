import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { Persona } from '@kontext.dev/kontext-sdk';

export async function POST(req: Request) {
  try {
    const {
      prompt,
      userId,
      privacyLevel = 'none',
    }: {
      prompt: string;
      userId?: string;
      privacyLevel?: 'strict' | 'moderate' | 'none';
    } = await req.json();

    let systemPrompt = 'You are a helpful assistant.';

    // Use Kontext for personalized context if API key and user ID are provided
    if (
      userId &&
      process.env.KONTEXT_API_KEY
    ) {
      try {
        const apiKey = process.env.KONTEXT_API_KEY;
        const apiUrl = process.env.KONTEXT_API_URL || 'https://api.kontext.dev';

        const persona = new Persona({
          apiKey,
          apiUrl,
        });

        const context = await persona.getContext({
          userId,
          task: 'chat',
          maxTokens: 500,
          privacyLevel,
        });

        systemPrompt = context.systemPrompt;
        console.log(`Updated system prompt with Kontext for user: ${userId}`);
        
      } catch (error) {
        console.error('Kontext API error:', error);
        // Continue without personalization
      }
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt,
    });

    return result.toDataStreamResponse();
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Chat API error:', error);

    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}