// Quick script to generate a LiveKit JWT token
// Run with: node generate-token.js

const { AccessToken } = require('livekit-server-sdk');

const apiKey = 'APIRrwVkRxp62tg';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'YOUR_SECRET_HERE';
const roomName = 'default-room';
const participantName = 'user-' + Math.random().toString(36).substring(7);

if (apiSecret === 'YOUR_SECRET_HERE') {
  console.error('⚠️  Please set LIVEKIT_API_SECRET environment variable or edit this file with your secret');
  console.error('   Example: LIVEKIT_API_SECRET=your-secret node generate-token.js');
  process.exit(1);
}

async function generateToken() {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
    ttl: '24h',
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: true,
    canPublish: false,
    canPublishData: true,
  });

  const jwt = await token.toJwt();
  
  console.log('✅ Generated LiveKit JWT Token:');
  console.log('');
  console.log(jwt);
  console.log('');
  console.log('Add this to your .env.local file:');
  console.log(`NEXT_PUBLIC_DEMO_LIVEKIT_TOKEN=${jwt}`);
  console.log('');
  console.log('Token details:');
  console.log(`- Room: ${roomName}`);
  console.log(`- Identity: ${participantName}`);
  console.log('- Valid for: 24 hours');
  console.log('- Permissions: Subscribe only (no publish)');
}

generateToken().catch(console.error);