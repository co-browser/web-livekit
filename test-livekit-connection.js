// Test LiveKit connection directly
const { AccessToken } = require('livekit-server-sdk');
const { Room } = require('livekit-client');

const apiKey = 'APIRrwVkRxp62tg';
const apiSecret = 'XKe03NABS9dqXMdECdvbqVsqTFkt3uCMhdxWQQuiM1B';
const url = 'wss://cdtm-hack-msw7nj13.livekit.cloud';

async function testConnection() {
  console.log('Testing LiveKit connection...');
  console.log('URL:', url);
  console.log('API Key:', apiKey);
  
  // Generate a test token
  const token = new AccessToken(apiKey, apiSecret, {
    identity: 'test-user',
    ttl: '1h',
  });

  token.addGrant({
    room: 'test-room',
    roomJoin: true,
    canSubscribe: true,
    canPublish: true,
  });

  const jwt = await token.toJwt();
  console.log('\nGenerated token (first 50 chars):', jwt.substring(0, 50) + '...');

  // Try to connect
  const room = new Room();
  
  console.log('\nAttempting to connect to LiveKit...');
  
  try {
    await room.connect(url, jwt);
    console.log('✅ SUCCESS! Connected to LiveKit');
    console.log('Room name:', room.name);
    console.log('Local participant:', room.localParticipant?.identity);
    console.log('Number of participants:', room.numParticipants);
    
    await room.disconnect();
    console.log('Disconnected successfully');
  } catch (error) {
    console.error('❌ FAILED to connect to LiveKit');
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testConnection().catch(console.error);