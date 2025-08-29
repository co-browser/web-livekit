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

    # A short, high-signal description of the user’s interests & level.
    # Replace this with your real personalization source (Kontext, etc.).
    # e.g., 'Senior researcher; zkSNARKs, MEV/PBS, TEEs; builds agent infra; prefers rigorous sources.'
    USER_CONTEXT = _get_env(
        "PT_USER_CONTEXT",
        "Senior researcher; PhD-level cryptography (zero-knowledge proofs), MEV/PBS, TEEs; builds agent-native infra; prefers rigorous, recent sources.",
    )

    # Optional: hint the broad domain(s) to bias topic selection
    # e.g., 'zero-knowledge proofs, floating-point SNARKs, prover systems, L2s, trusted hardware'
    INTEREST_AREAS = _get_env(
        "PT_INTEREST_AREAS",
        "zero-knowledge proofs, floating-point SNARKs, zk hardware acceleration, PBS/MEV privacy, enclave-based proving",
    )

    # Recency window for “things you likely don’t know yet” (the model will *try* to honor this)
    RECENCY_DAYS = _get_env("PT_RECENCY_DAYS", "45")

    # Optional constraints
    DISALLOWED_TOPICS = _get_env(
        "PT_DISALLOWED_TOPICS",
        "introductory basics; beginner tutorials; off-topic consumer crypto news",
    )

    # Avatar
    avatar_id = _get_env("BEY_AVATAR_ID", "7c9ca52f-d4f7-46e1-a4b8-0c8655857cc3")

    # --- Voice/LLM pipeline ---
    from livekit.agents.voice import Agent, AgentSession

    # System prompt: teacher persona
    SYSTEM_PROMPT = f"""
You are **Personalized Teacher** for a highly advanced user. Be rigorous, concise, and Socratic.
Profile (high signal): {USER_CONTEXT}
Focus areas (bias, not constraints): {INTEREST_AREAS}
Avoid: {DISALLOWED_TOPICS}
Today (UTC): {datetime.now(timezone.utc).date().isoformat()}
Goal: For each new conversation, pick an *in-depth* topic that is plausibly new to the user, with **recent relevance** (prefer work, changes, or data from the last {RECENCY_DAYS} days, or ongoing efforts still evolving). Assume strong background; skip basics.

Teaching style:
- Lead with *three* precise bullets that are novel and actionable.
- Cite concrete names, modules, repos, specs, PRs, or venues where relevant. Include dates/months when you can do so confidently. If uncertain, avoid fabricating.
- After the bullets, ask a **single** short question: “Which should we dig into first?”
- During discussion: probe what they already know; then go deeper: tradeoffs, impl quirks, eval metrics, timelines, open problems.
- If the user already knows an item, immediately propose a strictly deeper angle or adjacent cutting-edge thread.

Output constraints:
- Be crisp. No small talk beyond the greeting format requested.
- Don’t apologize for uncertainty; instead, propose the next-best precise thread.
"""

    class TeacherAgent(Agent):
        def __init__(self) -> None:
            super().__init__(
                instructions=SYSTEM_PROMPT,
                allow_interruptions=True,  # Allow interruptions but with VAD tuning
                min_consecutive_speech_delay=0.5,  # Reduced delay for quicker interruption response
            )

    # Configure VAD with higher sensitivity for better speech detection
    vad = silero.VAD.load(
        min_speech_duration=200,  # Minimum speech duration in ms (back to default for responsiveness)
        min_silence_duration=400,  # Minimum silence before considering speech ended (reduced for quicker response)
        prefix_padding_duration=300,  # Padding to add before speech
        max_buffered_speech=60.0,  # Maximum buffered speech in seconds
        activation_threshold=0.3,  # More sensitive to speech (lower = more sensitive, range: 0-1)
    )
    
    session = AgentSession(
        stt=openai.STT(model="whisper-1"),
        llm=openai.LLM(model=_get_env("PT_LLM_MODEL", "gpt-4o-mini")),
        tts=openai.TTS(voice=_get_env("PT_TTS_VOICE", "alloy")),
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

    # --- First turn: produce the bespoke greeting + 3 bullets ---
    # We let the LLM *choose* a topic area within the user's interests that is likely new,
    # then greet in the exact format Jens requested.
    GREETING_TEMPLATE = f"""Construct the **very first** message as follows.

Begin with exactly:
"Hi {USER_NAME} — I see you're really interested in {{CHOSEN_TOPIC_AREA}} — these are three things that may be of relevance that you do not know yet:"

Then write **three** numbered bullets (1–3). Each bullet must be:
- recent (ideally within the last {RECENCY_DAYS} days) *or* actively evolving,
- specific (names, repos, PRs, specs, datasets, conference/workshop items, or concrete implementation details),
- advanced (assume expert background; no general intros),
- one or two sentences max.

After bullet (3), ask one short question:
"Which should we dig into first?"

Rules:
- Choose {{CHOSEN_TOPIC_AREA}} to be *plausibly new* and highly relevant given the profile.
- If genuinely unsure about recency, prefer ongoing/active threads, and avoid making up dates.
- Do not add any extra preface or follow-up besides the required format.
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
