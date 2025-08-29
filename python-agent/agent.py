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
from livekit.plugins import openai, silero
from livekit.plugins import bey

load_dotenv()

logger = logging.getLogger("bey-avatar-agent")
logger.setLevel(logging.INFO)


async def entrypoint(ctx: JobContext):
    """Main entry point for the LiveKit agent with Beyond Presence avatar."""
    
    # Connect to the room with audio subscription
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Agent connected to room: {ctx.room.name}")
    
    # Get avatar ID from environment
    avatar_id = os.getenv("BEY_AVATAR_ID", "7c9ca52f-d4f7-46e1-a4b8-0c8655857cc3")
    logger.info(f"Starting Beyond Presence avatar with ID: {avatar_id}")
    
    # Create the agent session with voice pipeline
    from livekit.agents.voice import Agent, AgentSession
    
    # Define custom assistant class
    class Assistant(Agent):
        def __init__(self) -> None:
            super().__init__(
                instructions="You are a helpful and friendly AI assistant. Engage in natural conversation with users. Be concise and clear in your responses."
            )
    
    # Create agent session with STT, LLM, TTS components
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
    
    # Start the avatar with the session
    logger.info("Starting avatar session...")
    await avatar.start(session, room=ctx.room)
    logger.info("Avatar has joined the room!")
    
    # Start the agent session
    await session.start(
        room=ctx.room,
        agent=Assistant(),
    )
    
    # Generate initial greeting
    await session.generate_reply(
        instructions="Greet the user warmly and offer your assistance."
    )
    
    logger.info("Voice assistant started successfully with avatar integration")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
        )
    )