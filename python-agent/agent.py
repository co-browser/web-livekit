import logging
import os

from dotenv import load_dotenv

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    WorkerType,
    cli,
    llm,
)
from livekit.agents.voice import AgentSession
from livekit.plugins import deepgram, openai, silero
from livekit.plugins import bey

load_dotenv()

logger = logging.getLogger("bey-avatar-agent")
logger.setLevel(logging.INFO)


async def entrypoint(ctx: JobContext):
    """Main entry point for the LiveKit agent with Beyond Presence avatar."""
    
    # Connect to the room first
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Agent connected to room: {ctx.room.name}")
    
    # Get avatar ID from environment
    avatar_id = os.getenv("BEY_AVATAR_ID", "7c9ca52f-d4f7-46e1-a4b8-0c8655857cc3")
    logger.info(f"Starting Beyond Presence avatar with ID: {avatar_id}")
    
    # Create the agent session with voice pipeline
    # Using OpenAI STT instead of Deepgram (no extra API key needed)
    session = AgentSession(
        stt=openai.STT(model="whisper-1"),  # OpenAI Speech-to-Text
        llm=openai.LLM(model="gpt-4o-mini"),  # Language Model
        tts=openai.TTS(voice="alloy"),  # Text-to-Speech
        vad=silero.VAD.load(),  # Voice Activity Detection
    )
    
    # Create and start the Beyond Presence avatar
    avatar = bey.AvatarSession(
        avatar_id=avatar_id,
        avatar_participant_identity="bey-avatar-agent",
        avatar_participant_name="AI Assistant"
    )
    
    # Start the avatar and wait for it to join
    logger.info("Starting avatar session...")
    await avatar.start(session, room=ctx.room)
    logger.info("Avatar has joined the room!")
    
    # Create the voice agent
    from livekit.agents.voice import Agent
    agent = Agent(
        instructions="You are a helpful and friendly AI assistant. Engage in natural conversation with users. Be concise and clear in your responses.",
    )
    
    # Start the agent session with the user
    # The avatar will handle the video output
    await session.start(
        agent=agent,
        room=ctx.room,
    )
    
    logger.info("Agent session started successfully with avatar integration")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
        )
    )