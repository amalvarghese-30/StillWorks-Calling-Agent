"""Quick single-call test - dispatches and waits for result."""
import os, certifi, asyncio, json, logging, random, time, sys
os.environ['SSL_CERT_FILE'] = certifi.where()
from dotenv import load_dotenv
load_dotenv()
from livekit import api

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger("test-call")

async def main():
    phone = sys.argv[1] if len(sys.argv) > 1 else "+919820794731"
    language = sys.argv[2] if len(sys.argv) > 2 else "en"
    campaign = sys.argv[3] if len(sys.argv) > 3 else "follow_up"

    lk = api.LiveKitAPI()

    room_name = f"test-{phone.replace('+', '')}-{random.randint(1000, 9999)}"
    metadata = json.dumps({
        "phone_number": phone,
        "call_type": campaign,
        "language": language,
        "model_provider": "openai",
        "voice_id": "kavitha",
        "user_prompt": "Customer inquired about John Deere tractor",
    })

    log.info(f"Dispatching call to {phone} in room {room_name}")

    dispatch = await lk.agent_dispatch.create_dispatch(
        api.CreateAgentDispatchRequest(
            agent_name="manas-agent",
            room=room_name,
            metadata=metadata,
        )
    )

    log.info(f"Dispatched! ID: {dispatch.id}")
    log.info("Waiting 40 seconds for call to progress...")
    await asyncio.sleep(40)

    # Check room status
    try:
        rooms = await lk.room.list_rooms(api.ListRoomsRequest(names=[room_name]))
        for r in rooms.rooms:
            log.info(f"Room: {r.name}, participants: {r.num_participants}")
    except Exception as e:
        log.info(f"Room check: {e}")

    await lk.aclose()
    log.info("Test complete - check agent terminal for full logs")

asyncio.run(main())
