"""
Create and configure a SIP inbound trunk with a dispatch rule
for the Manas Group AI phone number.

This script sets up the inbound side so that when someone calls
the dedicated AI number, LiveKit automatically creates a room,
places the SIP participant, and dispatches the manas-agent.

Usage:
    python setup_inbound_trunk.py
"""

import asyncio
import os
import certifi

os.environ['SSL_CERT_FILE'] = certifi.where()

from dotenv import load_dotenv
from livekit import api

load_dotenv(".env")


async def main():
    print("=" * 60)
    print("  Manas Group India — Inbound SIP Trunk Setup")
    print("=" * 60)

    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    if not (url and api_key and api_secret):
        print("\nERROR: Missing LiveKit credentials in .env")
        print("Ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set.")
        return

    ai_number = os.getenv("MANAS_AI_PHONE_NUMBER")
    if not ai_number:
        print("\nERROR: MANAS_AI_PHONE_NUMBER is not set in .env")
        print("This is the dedicated phone number for AI inbound calls.")
        print("Get this number from your SIP provider (Vobiz).")
        return

    sip_address = os.getenv("VOBIZ_SIP_DOMAIN")
    username = os.getenv("VOBIZ_USERNAME")
    password = os.getenv("VOBIZ_PASSWORD")

    if not (sip_address and username and password):
        print("\nERROR: Missing SIP credentials in .env")
        print("Ensure VOBIZ_SIP_DOMAIN, VOBIZ_USERNAME, and VOBIZ_PASSWORD are set.")
        return

    lkapi = api.LiveKitAPI(url=url, api_key=api_key, api_secret=api_secret)

    try:
        # ------------------------------------------------------------------
        # Step 1: Check for existing inbound trunks
        # ------------------------------------------------------------------
        print(f"\n1. Checking existing inbound trunks...")
        from livekit.protocol.sip import ListSIPInboundTrunkRequest

        existing = await lkapi.sip.list_inbound_trunk(ListSIPInboundTrunkRequest())
        existing_trunks = existing.items if hasattr(existing, 'items') else []

        if existing_trunks:
            for t in existing_trunks:
                numbers = t.numbers if hasattr(t, 'numbers') else []
                if ai_number in numbers:
                    print(f"\n   Found existing trunk with AI number: {t.sip_trunk_id}")
                    print(f"   Numbers: {numbers}")
                    print("\n   To update it, delete it first in the LiveKit dashboard.")
                    print(f"   https://cloud.livekit.io/")
                    await lkapi.aclose()
                    return
        else:
            print("   No existing inbound trunks found.")

        # ------------------------------------------------------------------
        # Step 2: Create the inbound SIP trunk
        # ------------------------------------------------------------------
        print(f"\n2. Creating inbound trunk for {ai_number}...")

        from livekit.protocol.sip import (
            CreateSIPInboundTrunkRequest,
            SIPInboundTrunkInfo,
        )

        trunk_info = SIPInboundTrunkInfo(
            name="Manas AI Inbound",
            numbers=[ai_number],
            allowed_numbers=[],
            allowed_addresses=[],
        )

        request = CreateSIPInboundTrunkRequest(trunk=trunk_info)
        trunk = await lkapi.sip.create_inbound_trunk(request)

        trunk_id = trunk.sip_trunk_id
        print(f"   Inbound Trunk Created!")
        print(f"   Trunk ID: {trunk_id}")
        print(f"   Name: {trunk.name}")
        print(f"   Numbers: {trunk.numbers}")

        # ------------------------------------------------------------------
        # Step 3: Attempt dispatch rule (SDK-dependent)
        # ------------------------------------------------------------------
        print(f"\n3. Dispatch Rule Setup...")
        print(f"   The dispatch rule routes incoming calls to the 'manas-agent' worker.")

        try:
            from livekit.protocol.sip import (
                CreateSIPDispatchRuleRequest,
                SIPDispatchRule,
                SIPDispatchRuleIndividual,
            )

            dispatch_rule = SIPDispatchRule(
                type=SIPDispatchRule.DispatchRuleType.INDIVIDUAL,
                individual=SIPDispatchRuleIndividual(
                    room_prefix="inbound-",
                ),
            )

            await lkapi.sip.create_sip_dispatch_rule(
                CreateSIPDispatchRuleRequest(
                    rule=dispatch_rule,
                    trunk_ids=[trunk_id],
                )
            )
            print("   Dispatch rule created via SDK!")
        except Exception as e:
            print(f"   SDK dispatch rule creation unavailable: {e}")
            print(f"\n   >>> MANUAL STEP REQUIRED <<<")
            print(f"   Please configure the dispatch rule in the LiveKit dashboard:")
            print(f"   1. Go to https://cloud.livekit.io/")
            print(f"   2. Navigate to your project → SIP → Inbound Trunks")
            print(f"   3. Select trunk: {trunk_id}")
            print(f"   4. Add Dispatch Rule:")
            print(f"      - Agent Name: manas-agent")
            print(f"      - Room Prefix: inbound-")

        # ------------------------------------------------------------------
        # Step 4: Summary
        # ------------------------------------------------------------------
        print(f"\n{'=' * 60}")
        print(f"  SETUP COMPLETE")
        print(f"{'=' * 60}")
        print(f"  Inbound Trunk ID: {trunk_id}")
        print(f"  AI Phone Number:  {ai_number}")
        print(f"  Agent Name:       manas-agent")
        print(f"")
        print(f"  To test: Call {ai_number} from your phone.")
        print(f"  The agent should answer as ManasAI.")
        print(f"")
        print(f"  Save this trunk ID to .env:")
        print(f"  INBOUND_TRUNK_ID={trunk_id}")
        print(f"{'=' * 60}")

    except Exception as e:
        print(f"\nERROR: {e}")
        print("\nFallback: You can configure the inbound trunk manually in")
        print("the LiveKit Cloud dashboard: https://cloud.livekit.io/")
        print("Navigate to: Project → SIP → Inbound Trunks → Create")
        print(f"Phone Number: {ai_number}")
        print(f"Agent Name: manas-agent")
    finally:
        await lkapi.aclose()


if __name__ == "__main__":
    asyncio.run(main())
