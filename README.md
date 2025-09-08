# Web LiveKit + BeyondPresence Avatar

Run a Next.js viewer that streams a BeyondPresence avatar published by a Python LiveKit agent.

## Prerequisites

- Node.js 18+
- Python 3.10+
- LiveKit Cloud project (URL, API Key, API Secret)
- BeyondPresence API key
- OpenAI API key

## 1) Install dependencies

```bash
# From project root
pnpm install  # or: npm install
```

## 2) Configure environment

Create `.env.local` in project root for the Next.js app:

```bash
NEXT_PUBLIC_BEY_API_KEY=your_beyondpresence_api_key
NEXT_PUBLIC_DEMO_AVATAR_ID=your_avatar_id
NEXT_PUBLIC_DEMO_LIVEKIT_URL=wss://your-project.livekit.cloud

LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

Create `python-agent/.env` for the Python agent:

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

OPENAI_API_KEY=sk-your-openai-key

# Optional personalization
BEY_AVATAR_ID=your_avatar_id
PT_USER_NAME=YourName
PT_USER_CONTEXT=Short profile or interests
PT_INTEREST_AREAS=comma,separated,topics
PT_RECENCY_DAYS=30
PT_DISALLOWED_TOPICS=comma,separated,disallowed
PT_LLM_MODEL=gpt-4o-mini
PT_TTS_VOICE=alloy
```

Notes:
- The web app auto-generates viewer JWTs using `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`. You do not need to provide a static `NEXT_PUBLIC_DEMO_LIVEKIT_TOKEN`.
- Use the same LiveKit URL/key/secret in both apps.

## 3) Run the Python agent

Terminal 1:

```bash
cd python-agent
./run-uv.sh       # fast path using uv
# or
./run.sh          # venv + pip path
```

When running in dev mode, the agent connects to LiveKit using the env values and joins rooms created by the web app.

## 4) Run the Next.js app

Terminal 2:

```bash
pnpm dev  # or: npm run dev
```

Open `http://localhost:3000` and you should see the avatar stream. The app will show a configuration warning page until required env vars are set.

## Troubleshooting

- No video/audio: Ensure the Python agent is running and logged into your LiveKit project.
- Token generation failed: Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in `.env.local`.
- 401/403 from LiveKit: Check URL and credentials in both `.env.local` and `python-agent/.env`.
- OpenAI errors: Confirm `OPENAI_API_KEY` in `python-agent/.env`.
- Autoplay blocked: Click anywhere in the page to allow audio playback.

## Scripts

- Web: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm test`
- Python: `python-agent/run-uv.sh` or `python-agent/run.sh`


