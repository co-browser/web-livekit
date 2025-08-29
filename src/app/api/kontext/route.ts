import { Persona } from '@kontext.dev/kontext-sdk';

export async function POST(req: Request) {
  try {
    const {
      userId,
      task = 'voice_chat',
      maxTokens = 500,
      privacyLevel = 'none',
    }: {
      userId: string;
      task?: string;
      maxTokens?: number;
      privacyLevel?: 'strict' | 'moderate' | 'none';
    } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let systemPrompt = 'You are a helpful and friendly AI assistant. Engage in natural conversation with users. Be concise and clear in your responses.';

    // Use Kontext for personalized context if API key is available
    if (process.env.KONTEXT_API_KEY) {
      try {
        const apiKey = process.env.KONTEXT_API_KEY;
        const apiUrl = process.env.KONTEXT_API_URL || 'https://api.kontext.dev';

        const persona = new Persona({
          apiKey,
          apiUrl,
        });

        const context = await persona.getContext({
          userId,
          task,
          maxTokens,
          privacyLevel,
        });

        systemPrompt = context.systemPrompt;
        
        console.log(`Retrieved Kontext context for user: ${userId}`);
        
        return new Response(
          JSON.stringify({ 
            systemPrompt, 
            metadata: context.metadata,
            success: true 
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        
      } catch (error) {
        console.error('Kontext API error:', error);
        // Fall through to return default context
      }
    }

    // Return default context if Kontext is not available or failed
    return new Response(
      JSON.stringify({ 
        systemPrompt, 
        metadata: { userId, timestamp: new Date(), providers: [] },
        success: false,
        message: 'Using default context - Kontext API not available'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Kontext endpoint error:', error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}