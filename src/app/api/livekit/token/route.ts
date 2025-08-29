import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const room = searchParams.get('room') || 'default-room';
    const identity = searchParams.get('identity') || 'user-' + Math.random().toString(36).substring(7);

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY || process.env.NEXT_PUBLIC_DEMO_LIVEKIT_TOKEN || 'APIRrwVkRxp62tg';
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiSecret) {
      return NextResponse.json(
        { 
          error: 'LiveKit API secret not configured',
          help: 'Please set LIVEKIT_API_SECRET in your .env.local file with your LiveKit API secret'
        },
        { status: 500 }
      );
    }

    // Create a new token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: identity,
      ttl: '24h', // Token valid for 24 hours
    });

    // Grant permissions
    token.addGrant({
      room: room,
      roomJoin: true,
      canSubscribe: true,
      canPublish: false, // Set to true if you need to publish
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      url: process.env.NEXT_PUBLIC_DEMO_LIVEKIT_URL || 'wss://cdtm-hack-msw7nj13.livekit.cloud',
      room: room,
      identity: identity
    });

  } catch (error: any) {
    console.error('Failed to generate LiveKit token:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate token',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}