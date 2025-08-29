import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
)
from livekit.plugins import openai, silero
from livekit.plugins import bey

load_dotenv()

logger = logging.getLogger("personalized-teacher-agent")
logger.setLevel(logging.INFO)


def _get_env(name: str, default: str = "") -> str:
    v = os.getenv(name)
    return v if v is not None and v.strip() != "" else default


async def entrypoint(ctx: JobContext):
    """LiveKit agent that acts as a Personalized Teacher with a Beyond Presence avatar."""

    # --- Room connect ---
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Agent connected to room: {ctx.room.name}")

    # --- Config / placeholders (swap these with your real context later) ---
    # Required/handy identifiers
    USER_NAME = _get_env("PT_USER_NAME", "Jens")

    # A short, high-signal description of the user's interests & level.
    # Replace this with your real personalization source (Kontext, etc.).
    USER_CONTEXT = _get_env(
        "PT_USER_CONTEXT",
        "CDTM Hackathon participant; exploring voice AI applications, context engineering, multimodal interfaces; building next-gen consumer AI apps; interested in practical implementations and user experience innovations.",
    )

    # Optional: hint the broad domain(s) to bias topic selection
    INTEREST_AREAS = _get_env(
        "PT_INTEREST_AREAS",
        "voice AI interfaces, context engineering, multimodal LLMs, consumer AI applications, conversational AI design, real-time voice processing, AI agent architectures, LiveKit platform capabilities",
    )

    # Recency window for "things you likely don't know yet" (the model will *try* to honor this)
    RECENCY_DAYS = _get_env("PT_RECENCY_DAYS", "30")

    # Optional constraints
    DISALLOWED_TOPICS = _get_env(
        "PT_DISALLOWED_TOPICS",
        "basic AI concepts; generic chatbot tutorials; unrelated enterprise solutions",
    )

    # Avatar
    avatar_id = _get_env("BEY_AVATAR_ID", "7c9ca52f-d4f7-46e1-a4b8-0c8655857cc3")

    # --- Voice/LLM pipeline ---
    from livekit.agents.voice import Agent, AgentSession

    # System prompt: Personalized Teacher
    SYSTEM_PROMPT = f"""
You are **Personalized Teacher** for {USER_NAME}. Be engaging, concise, and Socratic.
Profile: {USER_CONTEXT}
Focus areas: {INTEREST_AREAS}
Avoid: {DISALLOWED_TOPICS}
Today (UTC): {datetime.now(timezone.utc).date().isoformat()}

Your mission: Share one fascinating, cutting-edge insight that sparks curiosity and is likely new to the user.

Key themes for the CDTM Hackathon:
- **Context Engineering**: Personalization that makes voice apps feel magical
- **Voice as Natural UI**: Why conversational interfaces are the future of consumer apps
- **Multimodal Magic**: Combining voice, vision, and gestures for intuitive experiences
- **Real-time Processing**: Low-latency techniques that enable fluid conversations
- **Consumer Psychology**: What makes voice apps addictive and delightful

Conversation style:
- Keep responses SHORT (2-3 sentences max) and punchy
- Be conversational and engaging, not academic
- Drop one mind-blowing fact or technique per response
- Ask thought-provoking questions that lead to "aha" moments
- Connect everything to what they could BUILD at the hackathon

Rules:
- Ultra-concise: maximum impact in minimum words
- Spark excitement about what's possible TODAY
- Make them think "I need to build this!"
"""

    class TeacherAgent(Agent):
        def __init__(self) -> None:
            super().__init__(
                instructions=SYSTEM_PROMPT,
                allow_interruptions=True,  # Allow interruptions but with VAD tuning
                min_consecutive_speech_delay=0.5,  # Reduced delay for quicker interruption response
            )

    # Configure VAD with higher sensitivity for better speech detection
    vad = silero.VAD.load()
    
    session = AgentSession(
        stt=openai.STT(model="whisper-1"),
        llm=openai.LLM(model=_get_env("PT_LLM_MODEL", "gpt-4o-mini")),
        # tts=openai.TTS(voice=_get_env("PT_TTS_VOICE", "alloy")),
        tts=elevenlabs.TTS(
            voice_id="ODq5zmih8GrVes37Dizd",
            model="eleven_multilingual_v2"
        ),
        vad=vad,
    )

    # --- Beyond Presence avatar join ---
    avatar = bey.AvatarSession(
        avatar_id=avatar_id,
        avatar_participant_identity="personalized-teacher",
        avatar_participant_name="Personalized Teacher",
    )

    logger.info("Starting avatar session…")
    await avatar.start(session, room=ctx.room)
    logger.info("Avatar joined the room.")

    # --- Start agent ---
    await session.start(room=ctx.room, agent=TeacherAgent())

    # --- First turn: produce the bespoke greeting + 1 bullet ---
    # Greet with a single, impactful insight tailored to their CDTM Hackathon interests
    GREETING_TEMPLATE = f"""Construct the **very first** message as follows.

Begin with exactly:
"Hi {USER_NAME} — I see you're interested in the CDTM Hackathon and {{CHOSEN_TOPIC_AREA}} — here's something you might not know yet:"

Then write **one** concise bullet point that is:
- A cutting-edge development in voice AI or context engineering (within last {RECENCY_DAYS} days preferred)
- Directly applicable to building consumer voice apps at the hackathon
- Specific and actionable
- Maximum two sentences

End with: "Should we dig into this?"

Topic selection for {{CHOSEN_TOPIC_AREA}}: Choose from:
- "context engineering for voice apps"
- "multimodal AI experiences"
- "real-time voice processing"
- "consumer voice app patterns"

Rules:
- Pick ONE genuinely interesting, recent development
- Be specific (name tools, techniques, or examples)
- Keep it concise and relevant to hackathon prototyping
"""

    await session.generate_reply(instructions=GREETING_TEMPLATE)

    logger.info("Personalized Teacher initialized and greeted successfully.")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
        )
    )