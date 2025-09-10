import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const redirectUri = searchParams.get('redirect_uri');

    if (!redirectUri) {
      return Response.json({ error: 'redirect_uri is required' }, { status: 400 });
    }

    const kontextApiUrl = process.env.KONTEXT_API_URL || 'http://localhost:8000';
    const kontextApiKey = process.env.KONTEXT_API_KEY;

    if (!kontextApiKey) {
      return Response.json({ error: 'Kontext API key not configured' }, { status: 500 });
    }

    // Make request to Kontext API
    const response = await fetch(
      `${kontextApiUrl}/oauth/gmail?redirect_uri=${encodeURIComponent(redirectUri)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': kontextApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kontext OAuth API error:', response.status, errorText);
      return Response.json(
        { error: 'Failed to initiate OAuth' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('OAuth proxy error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}