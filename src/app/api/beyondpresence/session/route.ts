import { NextRequest, NextResponse } from 'next/server';
import BeyondPresence from '@bey-dev/sdk';
import { AccessToken } from 'livekit-server-sdk';

async function generateLiveKitTokenForAvatar(avatarId: string): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  
  if (!apiKey || !apiSecret || apiSecret === 'REPLACE_WITH_YOUR_SECRET') {
    return null;
  }

  // Use a consistent room name
  const roomName = `avatar-room-${avatarId}`;
  // This token is for the AVATAR to publish, not for the viewer
  const avatarIdentity = `avatar-${avatarId}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: avatarIdentity,
    name: 'BeyondPresence Avatar',
    ttl: '24h',
  });

  // Avatar needs BOTH publish and subscribe permissions
  // BeyondPresence might need subscribe to validate the room or for bidirectional communication
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: true, // Avatar needs this for room validation
    canPublish: true, // Avatar MUST be able to publish
    canPublishData: true,
  });

  console.log(`Generated AVATAR token for room: ${roomName}, identity: ${avatarIdentity}`);
  return await token.toJwt();
}

async function generateLiveKitTokenForViewer(avatarId: string): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  
  if (!apiKey || !apiSecret || apiSecret === 'REPLACE_WITH_YOUR_SECRET') {
    return null;
  }

  // Must use the SAME room name as the avatar
  const roomName = `avatar-room-${avatarId}`;
  const viewerIdentity = `viewer-${Math.random().toString(36).substring(7)}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: viewerIdentity,
    name: 'Viewer',
    ttl: '24h',
  });

  // Viewer needs SUBSCRIBE permissions to watch the avatar
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: true, // Viewer needs to subscribe to avatar's tracks
    canPublish: false, // Viewer doesn't need to publish
    canPublishData: true,
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
    let { avatarId, livekitToken, livekitUrl } = body;

    if (!avatarId || !livekitUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Generate tokens for both avatar and viewer
    const avatarToken = await generateLiveKitTokenForAvatar(avatarId);
    const viewerToken = await generateLiveKitTokenForViewer(avatarId);
    
    if (!avatarToken || !viewerToken) {
      return NextResponse.json(
        { 
          error: 'Unable to generate LiveKit tokens',
          help: 'Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env.local'
        },
        { status: 400 }
      );
    }

    // Use the avatar token for BeyondPresence session creation
    // The avatar needs publish permissions
    const tokenForBeyondPresence = avatarToken;

    // Get API key from server-side environment variable
    const apiKey = process.env.BEY_API_KEY || process.env.NEXT_PUBLIC_BEY_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'BeyondPresence API key not configured' },
        { status: 500 }
      );
    }

    // Initialize BeyondPresence client server-side with increased timeout
    const client = new BeyondPresence({
      apiKey: apiKey,
      timeout: 120000 // Increase timeout to 2 minutes (default is 1 minute)
    });

    // Log what we're sending to BeyondPresence
    console.log('Creating BeyondPresence session with:', {
      avatar_id: avatarId,
      livekit_url: livekitUrl,
      token_length: tokenForBeyondPresence.length,
      room_name: `avatar-room-${avatarId}`,
      avatar_identity: `avatar-${avatarId}`
    });

    // Decode the token to verify its contents
    const tokenParts = tokenForBeyondPresence.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('Avatar token payload:', JSON.stringify(payload, null, 2));
      } catch (e) {
        console.log('Could not decode token payload');
      }
    }

    // First, try to list existing agents for this avatar
    console.log('Checking for existing agents...');
    const listAgentsResponse = await fetch('https://api.bey.dev/v1/agent', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    let agentId = null;
    if (listAgentsResponse.ok) {
      const response = await listAgentsResponse.json();
      console.log('List agents response:', response);
      
      // The response has a 'data' array containing the agents
      const agents = response.data || [];
      
      // Find an agent for this avatar
      const existingAgent = agents.find((agent: any) => agent.avatar_id === avatarId);
      if (existingAgent) {
        agentId = existingAgent.id;
        console.log('Using existing agent:', agentId);
      }
    }

    // If no existing agent, create one
    if (!agentId) {
      console.log('Creating new agent for avatar...');
      const agentResponse = await fetch('https://api.bey.dev/v1/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          avatar_id: avatarId,
          system_prompt: 'You are a helpful AI assistant. Engage in natural conversation with users.',
          name: 'AI Assistant',
          language: 'en',
          greeting: 'Hello! How can I help you today?',
          max_session_length_minutes: 30
        })
      });

      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        agentId = agentData.id;
        console.log('Agent created successfully:', agentData);
      } else {
        console.log('Agent creation failed:', agentResponse.status);
        const errorText = await agentResponse.text();
        console.log('Agent error details:', errorText);
      }
    }

    // Skip the SDK session.create and directly use the /v1/session endpoint
    // which is for "Create and start a Real-Time API Session"
    let response;
    
    if (agentId) {
      console.log('Starting real-time session with agent...');
      const startSessionResponse = await fetch('https://api.bey.dev/v1/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          avatar_id: avatarId,  // Use avatar_id, not agent_id!
          livekit_token: tokenForBeyondPresence,
          livekit_url: livekitUrl
        })
      });

      if (startSessionResponse.ok) {
        response = await startSessionResponse.json();
        console.log('Real-time session started successfully:', JSON.stringify(response, null, 2));
      } else {
        console.log('Failed to start real-time session:', startSessionResponse.status);
        const errorText = await startSessionResponse.text();
        console.log('Session start error:', errorText);
        
        // Fall back to SDK method if direct API fails
        console.log('Falling back to SDK session.create...');
        response = await client.session.create({
          avatar_id: avatarId,
          livekit_token: tokenForBeyondPresence,
          livekit_url: livekitUrl
        });
        console.log('SDK session created:', JSON.stringify(response, null, 2));
      }
    } else {
      // If no agent, use SDK method
      console.log('No agent found, using SDK to create session...');
      response = await client.session.create({
        avatar_id: avatarId,
        livekit_token: tokenForBeyondPresence,
        livekit_url: livekitUrl
      });
      console.log('SDK session created:', JSON.stringify(response, null, 2));
    }
    
    // Wait for avatar to join
    console.log('Waiting 5 seconds for avatar to join the room...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Return session data with VIEWER token for the frontend
    // The frontend will use the viewer token to subscribe to the avatar's streams
    return NextResponse.json({
      id: response.id,
      avatarId: avatarId,
      livekitToken: viewerToken, // VIEWER token for subscribing
      livekitUrl: livekitUrl,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      // Include any additional fields from the response
      beyondPresenceResponse: response,
      debug: {
        avatarToken: tokenForBeyondPresence,
        viewerToken: viewerToken,
        roomName: `avatar-room-${avatarId}`
      }
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