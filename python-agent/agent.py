import logging
import os
import asyncio
import json
import aiohttp

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
    
    # Define custom assistant class with dynamic context via Node.js API
    class KontextAssistant(Agent):
        def __init__(self, user_id: str = "default-user") -> None:
            # Start with default instructions - will be updated dynamically
            super().__init__(
                instructions="You are a helpful and friendly AI assistant. Engage in natural conversation with users. Be concise and clear in your responses."
            )
            self.user_id = user_id
            self._current_context = None
        
        async def update_context(self) -> None:
            """Update the assistant's context from Node.js Kontext API"""
            try:
                logger.info(f"Fetching personalized context for user: {self.user_id}")
                
                # Get the Node.js API URL (default to localhost for development)
                api_url = os.getenv("NODEJS_API_URL", "http://localhost:3001")
                
                # Make request to Node.js API endpoint
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{api_url}/api/kontext",
                        json={
                            "userId": self.user_id,
                            "task": "voice_chat",
                            "maxTokens": 500,
                            "privacyLevel": "none"
                        },
                        headers={"Content-Type": "application/json"},
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        
                        if response.status == 200:
                            data = await response.json()
                            # Update the instructions with personalized context
                            self._instructions = data["systemPrompt"]
                            self._current_context = data
                            logger.info(f"Updated assistant context for user {self.user_id}")
                            
                            if data.get("success"):
                                logger.info("Successfully retrieved Kontext personalization")
                            else:
                                logger.info(f"Using fallback context: {data.get('message', 'No message')}")
                        else:
                            error_text = await response.text()
                            logger.error(f"Node.js API error: {response.status} - {error_text}")
                            
            except Exception as e:
                logger.error(f"Failed to update context from Node.js API: {e}")
                # Keep existing instructions as fallback
        
        async def initialize(self) -> None:
            """Initialize the assistant with personalized context"""
            await self.update_context()
    
    # Get user ID from room metadata or use default
    # In a real implementation, you'd extract this from the user who joined
    user_id = ctx.room.metadata or "default-user"
    logger.info(f"Creating assistant for user: {user_id}")
    
    # Create assistant instance
    assistant = KontextAssistant(user_id)
    
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
    
    # Initialize the assistant with personalized context
    await assistant.initialize()
    
    # Start the agent session with our custom assistant
    await session.start(
        room=ctx.room,
        agent=assistant,
    )
    
    # Generate initial personalized greeting
    await session.generate_reply(
        instructions="Greet the user warmly using any personalized context you have, and offer your assistance."
    )
    
    logger.info("Voice assistant started successfully with avatar and Kontext integration")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            worker_type=WorkerType.ROOM,
        )
    )