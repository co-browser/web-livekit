import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

async function generateLiveKitTokenForViewer(roomName: string): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    return null;
  }

  const viewerIdentity = `viewer-${Math.random().toString(36).substring(7)}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: viewerIdentity,
    name: 'Viewer',
    ttl: '24h',
  });

  // Viewer needs permissions to subscribe to avatar's tracks
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: true,
    canPublish: false,
    canPublishData: false,
  });

  console.log(`Generated VIEWER token for room: ${roomName}, identity: ${viewerIdentity}`);
  return await token.toJwt();
}

export async function POST(request: NextRequest) {
  try {
    // Handle empty body
    const text = await request.text();
    if (!text) {
      return NextResponse.json(
        { error: 'Empty request body' },
        { status: 400 }
      );
    }
    
    const body = JSON.parse(text);
    let { avatarId, livekitUrl, roomName } = body;

    if (!avatarId || !livekitUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Use provided room name or generate one with avatar prefix
    // The Python agent will join rooms with "avatar-room-" prefix
    if (!roomName) {
      roomName = `avatar-room-${Date.now()}`;
    }
    
    // Generate viewer token for the room
    const viewerToken = await generateLiveKitTokenForViewer(roomName);
    
    if (!viewerToken) {
      return NextResponse.json(
        { 
          error: 'Unable to generate viewer token',
          help: 'Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env.local'
        },
        { status: 400 }
      );
    }

    console.log(`Generated viewer token for room: ${roomName}`);

    // Simplified: Python agent handles avatar creation
    // We just need to inform the frontend about the room to join
    console.log('Python agent will handle avatar creation for room:', roomName);

    // Return session data with VIEWER token for the frontend
    return NextResponse.json({
      id: `session-${Date.now()}`,
      avatarId: avatarId,
      livekitToken: viewerToken,
      livekitUrl: livekitUrl,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      roomName: roomName,
      message: 'Frontend viewer token generated. Python agent should be running to handle avatar.'
    });

  } catch (error: any) {
    console.error('Failed to create BeyondPresence session:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      cause: error.cause,
      stack: error.stack
    });
    
    // Check if it's a BeyondPresence API error
    if (error.status === 400) {
      console.error('Bad request to BeyondPresence - check avatar_id and token validity');
    } else if (error.status === 401) {
      console.error('Authentication failed - check BeyondPresence API key');
    } else if (error.message?.includes('timeout')) {
      console.error('Request timed out - BeyondPresence might be having issues validating the LiveKit token');
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create session',
        details: error.toString(),
        status: error.status,
        hint: 'Check server logs for detailed error information'
      },
      { status: error.status || 500 }
    );
  }
}