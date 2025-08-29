import { NextRequest, NextResponse } from 'next/server';
import BeyondPresence from '@bey-dev/sdk';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

async function generateLiveKitTokenForAvatar(avatarId: string): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  
  if (!apiKey || !apiSecret || apiSecret === 'REPLACE_WITH_YOUR_SECRET') {
    return null;
  }

  // Use a simple, consistent room name  
  // Using timestamp ensures each session gets a unique room
  const roomName = `room-${Date.now()}`;
  // BeyondPresence might expect the avatar identity to match a specific format
  const avatarIdentity = `avatar-${avatarId}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: avatarIdentity,
    name: 'BeyondPresence Avatar',
    ttl: '24h',
  });

  // Avatar needs full permissions to publish video/audio
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  console.log(`Generated AVATAR token for room: ${roomName}, identity: ${avatarIdentity}`);
  
  // Return both token and room name so viewer can join the same room
  return JSON.stringify({ token: await token.toJwt(), roomName });
}

async function generateLiveKitTokenForViewer(roomName: string): Promise<string | null> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  
  if (!apiKey || !apiSecret || apiSecret === 'REPLACE_WITH_YOUR_SECRET') {
    return null;
  }

  const viewerIdentity = `viewer-${Math.random().toString(36).substring(7)}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity: viewerIdentity,
    name: 'Viewer',
    ttl: '24h',
  });

  // Viewer needs SUBSCRIBE permissions and ability to send data/audio
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: true, // Viewer needs to subscribe to avatar's tracks
    canPublish: true, // Viewer needs to publish audio for the avatar
    canPublishData: true, // Viewer needs to send data to avatar
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

    // Generate token for avatar with room name
    const avatarTokenData = await generateLiveKitTokenForAvatar(avatarId);
    
    if (!avatarTokenData) {
      return NextResponse.json(
        { 
          error: 'Unable to generate LiveKit tokens',
          help: 'Please set LIVEKIT_API_KEY and LIVEKIT_API_SECRET in .env.local'
        },
        { status: 400 }
      );
    }

    // Parse the avatar token data
    const { token: avatarToken, roomName } = JSON.parse(avatarTokenData);
    
    // Generate viewer token for the SAME room
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

    // Use the avatar token for BeyondPresence session creation
    const tokenForBeyondPresence = avatarToken;
    console.log(`Using room name: ${roomName} for both avatar and viewer`);

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
      room_name: roomName,
      token_length: tokenForBeyondPresence.length
    });

    // Decode both tokens to verify they're using the same room
    console.log('\n=== TOKEN VERIFICATION ===');
    
    // Decode avatar token
    const avatarTokenParts = tokenForBeyondPresence.split('.');
    if (avatarTokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(avatarTokenParts[1], 'base64').toString());
        console.log('Avatar token payload:', {
          identity: payload.sub,
          room: payload.video?.room,
          canPublish: payload.video?.canPublish,
          canSubscribe: payload.video?.canSubscribe
        });
      } catch (e) {
        console.log('Could not decode avatar token');
      }
    }
    
    // Decode viewer token
    const viewerTokenParts = viewerToken.split('.');
    if (viewerTokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(viewerTokenParts[1], 'base64').toString());
        console.log('Viewer token payload:', {
          identity: payload.sub,
          room: payload.video?.room,
          canPublish: payload.video?.canPublish,
          canSubscribe: payload.video?.canSubscribe
        });
      } catch (e) {
        console.log('Could not decode viewer token');
      }
    }
    
    console.log('=== END TOKEN VERIFICATION ===\n');

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
    
    // Wait for avatar to join with periodic checks
    console.log('Waiting for avatar to join the room (checking every 5 seconds)...');
    
    // Set up periodic room checks if we have the credentials
    if (process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && roomName) {
      const roomService = new RoomServiceClient(
        livekitUrl.replace('wss://', 'https://'),
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET
      );
      
      let avatarJoined = false;
      for (let i = 0; i < 6; i++) { // Check 6 times over 30 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          const participants = await roomService.listParticipants(roomName);
          console.log(`[Check ${i+1}/6] Participants in room:`, participants.map(p => p.identity));
          
          // Check if avatar has joined
          const avatarParticipant = participants.find(p => 
            p.identity.includes('avatar') || 
            p.identity.includes('beyondpresence')
          );
          
          if (avatarParticipant) {
            console.log('🎉 Avatar has joined the room!', {
              identity: avatarParticipant.identity,
              state: avatarParticipant.state,
              tracks: avatarParticipant.tracks?.length || 0
            });
            avatarJoined = true;
            break;
          }
        } catch (error) {
          console.log(`[Check ${i+1}/6] Room might not exist yet`);
        }
      }
      
      if (!avatarJoined) {
        console.log('⚠️ Avatar did not join the room after 30 seconds');
      }
    } else {
      // Fallback to simple wait if we don't have credentials
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    // Check LiveKit room status using RoomServiceClient
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
    
    if (livekitApiKey && livekitApiSecret && roomName) {
      try {
        // Create RoomServiceClient to check room status
        const roomService = new RoomServiceClient(
          livekitUrl.replace('wss://', 'https://'),
          livekitApiKey,
          livekitApiSecret
        );
        
        console.log('Checking LiveKit room status for room:', roomName);
        
        // List all rooms to see if our room exists
        try {
          const rooms = await roomService.listRooms();
          console.log('All LiveKit rooms:', rooms.map(r => ({ name: r.name, numParticipants: r.numParticipants })));
          
          const ourRoom = rooms.find(r => r.name === roomName);
          if (ourRoom) {
            console.log('Found our room:', {
              name: ourRoom.name,
              sid: ourRoom.sid,
              numParticipants: ourRoom.numParticipants,
              maxParticipants: ourRoom.maxParticipants,
              creationTime: ourRoom.creationTime,
              emptyTimeout: ourRoom.emptyTimeout
            });
          } else {
            console.log('Room not found in LiveKit! Room name:', roomName);
          }
        } catch (listError) {
          console.log('Error listing rooms:', listError);
        }
        
        // Try to list participants in the room
        try {
          const participants = await roomService.listParticipants(roomName);
          console.log(`Participants in room ${roomName}:`, participants.map(p => ({
            identity: p.identity,
            sid: p.sid,
            state: p.state,
            joinedAt: p.joinedAt,
            tracks: p.tracks?.map(t => ({ sid: t.sid, type: t.type, source: t.source }))
          })));
        } catch (error) {
          console.log('Error listing participants (room might not exist):', error);
        }
      } catch (error) {
        console.log('Error checking LiveKit room status:', error);
      }
    }

    // Check session status after waiting
    if (response && response.id) {
      console.log('Checking session status...');
      const sessionStatusResponse = await fetch(`https://api.bey.dev/v1/session/${response.id}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      });
      
      if (sessionStatusResponse.ok) {
        const sessionStatus = await sessionStatusResponse.json();
        console.log('Session status after wait:', JSON.stringify(sessionStatus, null, 2));
        
        // Check if there's additional info about the avatar's status
        if (!sessionStatus.livekit_token || sessionStatus.livekit_token !== tokenForBeyondPresence) {
          console.log('WARNING: BeyondPresence returned a different token than we provided!');
          console.log('Our token:', tokenForBeyondPresence.substring(0, 50) + '...');
          console.log('Their token:', sessionStatus.livekit_token?.substring(0, 50) + '...');
        }
      } else {
        console.log('Failed to get session status:', sessionStatusResponse.status);
      }
    }

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
      agentId: agentId,
      debug: {
        avatarToken: tokenForBeyondPresence,
        viewerToken: viewerToken,
        roomName: roomName
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