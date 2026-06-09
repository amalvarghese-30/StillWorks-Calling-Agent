import os
import certifi

# Fix for macOS SSL Certificate errors - MUST be before other imports
os.environ['SSL_CERT_FILE'] = certifi.where()

import argparse
import asyncio
import random
import json
import logging
from dotenv import load_dotenv
from livekit import api

import config

# Load environment variables
load_dotenv(".env")


async def main():
    parser = argparse.ArgumentParser(
        description="Make an outbound call via the Manas Group AI Voice Agent."
    )
    parser.add_argument(
        "--to", required=True,
        help="The phone number to call (e.g., +91...)",
    )
    parser.add_argument(
        "--campaign-type",
        choices=list(config.CAMPAIGN_TYPES.keys()),
        default="follow_up",
        help="Type of outbound call campaign",
    )
    parser.add_argument(
        "--language",
        choices=config.SUPPORTED_LANGUAGES,
        default=config.DEFAULT_OUTBOUND_LANGUAGE,
        help="Language for the call (ml=Malayalam, en=English, hi=Hindi)",
    )
    parser.add_argument(
        "--model-provider",
        choices=["openai", "groq"],
        default=config.DEFAULT_LLM_PROVIDER,
        help="LLM provider",
    )
    parser.add_argument(
        "--voice",
        default=None,
        help="TTS voice (overrides language default)",
    )
    args = parser.parse_args()

    # 1. Validation
    phone_number = args.to.strip()
    if not phone_number.startswith("+"):
        print("Error: Phone number must start with '+' and country code.")
        return
    if len(phone_number) < 8:
        print(f"Error: Phone number '{phone_number}' looks too short.")
        return

    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    if not (url and api_key and api_secret):
        print("Error: LiveKit credentials missing in .env")
        return

    # 2. Setup API Client
    lk_api = api.LiveKitAPI(url=url, api_key=api_key, api_secret=api_secret)

    # 3. Create a unique room name
    campaign_label = config.CAMPAIGN_TYPES[args.campaign_type]["label"]
    room_name = f"out-{phone_number.replace('+', '')}-{random.randint(1000, 9999)}"

    print(f"Manas Group AI Voice Agent — Outbound Call")
    print(f"  Phone:     {phone_number}")
    print(f"  Campaign:  {campaign_label}")
    print(f"  Language:  {args.language}")
    print(f"  Room:      {room_name}")

    try:
        # 4. Dispatch the Agent
        metadata = json.dumps({
            "phone_number": phone_number,
            "call_type": args.campaign_type,
            "language": args.language,
            "model_provider": args.model_provider,
            "voice_id": args.voice,
        })

        dispatch_request = api.CreateAgentDispatchRequest(
            agent_name=config.AGENT_NAME,
            room=room_name,
            metadata=metadata,
        )

        dispatch = await lk_api.agent_dispatch.create_dispatch(dispatch_request)

        print(f"\n  Call Dispatched Successfully!")
        print(f"  Dispatch ID: {dispatch.id}")
        print(f"  The agent will dial {phone_number} now.")
        print(f"  Check the agent terminal for conversation logs.")

    except Exception as e:
        print(f"\n  Error dispatching call: {e}")

    finally:
        await lk_api.aclose()


if __name__ == "__main__":
    asyncio.run(main())
