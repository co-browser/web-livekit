# LiveKit Token Generation

The LiveKit token in your .env.local (`NEXT_PUBLIC_DEMO_LIVEKIT_TOKEN`) needs to be a JWT token, not just the API key.

## What You Have vs What You Need

- **What you have**: LiveKit API Key (`APIRrwVkRxp62tg`)
- **What you need**: A JWT token generated from the API key and secret

## How to Generate a LiveKit Token

LiveKit tokens are JWT tokens that need to be generated server-side using your API key and secret. Here are your options:

### Option 1: Use LiveKit CLI
```bash
livekit-cli create-token \
  --api-key APIRrwVkRxp62tg \
  --api-secret YOUR_SECRET \
  --room ROOM_NAME \
  --identity USER_IDENTITY \
  --grant '{"canSubscribe": true, "canPublish": false}'
```

### Option 2: Use LiveKit's Token Playground
Visit: https://docs.livekit.io/realtime/quickstarts/token-playground/

### Option 3: Generate Programmatically (Server-side)
You'll need to create a server endpoint that generates tokens. Example with Node.js:

```javascript
import { AccessToken } from 'livekit-server-sdk';

const apiKey = 'APIRrwVkRxp62tg';
const apiSecret = 'YOUR_SECRET_HERE';

const token = new AccessToken(apiKey, apiSecret, {
  identity: 'user-identity',
});

token.addGrant({
  room: 'room-name',
  roomJoin: true,
  canSubscribe: true,
  canPublish: false, // Set to true if avatar needs to publish
});

const jwt = token.toJwt();
```

## Required Token Permissions

For BeyondPresence avatar streaming, the token should have:
- `canSubscribe: true` - To receive avatar video/audio streams
- `room: "your-room-name"` - The room where the avatar is publishing
- `identity: "unique-user-id"` - A unique identifier for this participant

## Temporary Solution

For testing, you can:
1. Use the LiveKit Token Playground to generate a temporary token
2. Replace `NEXT_PUBLIC_DEMO_LIVEKIT_TOKEN` in .env.local with the generated JWT

## Long-term Solution

For production:
1. Create an API endpoint in your Next.js app (e.g., `/api/livekit-token`)
2. Generate tokens server-side using your LiveKit API secret
3. Fetch the token from your frontend before connecting

Note: Never expose your LiveKit API secret in client-side code or environment variables prefixed with `NEXT_PUBLIC_`.