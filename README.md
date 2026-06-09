# Manas Group India — AI Voice Agent

A production-ready **inbound + outbound** voice AI agent for Manas Group India, an ISO 9001:2015 certified agricultural machinery dealer in Palakkad, Kerala. Handles customer calls in **Malayalam, English, and Hindi** for product inquiries, service bookings, financing, trade-ins, and promotional campaigns.

**Brands supported:** John Deere, ACE, Shaktiman, Kirloskar, Bull, Redlands, BCS Ferrari

Powered by **LiveKit**, **Deepgram**, **Groq/OpenAI**, and **Sarvam TTS**.

---

## Features

- **Inbound & Outbound Calling** — Answers calls on a dedicated AI number; makes outbound calls for service reminders, follow-ups, promotional offers, and payment follow-ups
- **Trilingual Support** — Malayalam (default), English, and Hindi with automatic language detection
- **8 AI Function Tools** — Customer lookup, call transfer, service booking, service status check, product info, financing calculator, callback scheduling, lead logging
- **SQLite Database** — Stores customers, calls, service bookings, products (59 pre-loaded), leads, and follow-ups
- **Next.js Dashboard** — Web UI for dispatching calls, launching campaigns, monitoring inbound calls, managing service bookings, and tracking leads
- **SIP Trunking** — Integrated with Vobiz for PSTN connectivity (inbound + outbound)

---

## Architecture

```
                            ┌──────────────────────┐
                            │   Next.js Dashboard   │
                            │   (port 3000)         │
                            │   - Dispatch calls    │
                            │   - Monitor inbound   │
                            │   - Manage bookings   │
                            │   - Track leads       │
                            └──────┬───────────────┘
                                   │ LiveKit API
                                   ▼
Incoming Call ──► SIP Inbound Trunk ──► LiveKit Cloud ◄── SIP Outbound Trunk ◄── Outbound Call
                        │                     │
                        ▼                     ▼
                   Dispatch Rule        Agent Worker
                        │              (agent.py)
                        ▼                     │
                   Room Auto-Created    ┌─────┴─────┐
                        │              │  ManasAI   │
                        ▼              │  STT→LLM→TTS│
                   Agent Joins Room    │  8 Tools   │
                        │              └─────┬─────┘
                        ▼                    │
                   Inbound Handler     SQLite DB
                   (inbound_handler)   (data/manas_group.db)
```

---

## Directory Structure

```
LIvekitAIVoice/
├── agent.py                  # Main agent — direction detection, session, dispatcher
├── config.py                 # System prompt, language maps, telephony, financing
├── database.py               # SQLite schema, CRUD, seed data (59 products)
├── tools.py                  # 8 function tools for LLM tool calling
├── product_catalog.py        # Product data and search utilities
├── inbound_handler.py        # Inbound call flow
├── outbound_handler.py       # Outbound dial-out flow
├── make_call.py              # CLI outbound call dispatcher
├── setup_inbound_trunk.py    # Create inbound SIP trunk + dispatch rule
├── setup_trunk.py            # Update outbound trunk credentials
├── create_trunk.py           # Create new outbound trunk
├── list_trunks.py            # List all SIP trunks
├── requirements.txt          # Python dependencies
├── Dockerfile                # Docker image
├── docker-compose.yml        # Multi-service setup
├── .env.example              # Environment variable template
├── prompts/
│   └── system_prompt.txt     # Full ManasAI persona (trilingual, 7 brands)
├── data/
│   └── manas_group.db        # SQLite database (auto-created)
└── dashboard/                # Next.js web dashboard
    ├── app/
    │   ├── page.tsx           # Main dashboard
    │   ├── layout.tsx         # Root layout
    │   ├── globals.css        # Manas Group green theme
    │   ├── inbound/           # Inbound call monitor
    │   ├── services/          # Service bookings page
    │   ├── customers/         # Leads & customers page
    │   ├── campaigns/         # Campaign templates page
    │   └── api/               # API routes
    ├── components/
    │   ├── Navigation.tsx
    │   ├── CallDispatcher.tsx
    │   ├── BulkDialer.tsx
    │   ├── InboundMonitor.tsx
    │   ├── ServiceBookings.tsx
    │   └── LeadsManager.tsx
    └── lib/
        └── server-utils.ts
```

---

## Setup & Installation

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- A [LiveKit Cloud](https://cloud.livekit.io/) account
- A [Deepgram](https://deepgram.com/) API Key (STT)
- A [Groq](https://groq.com/) or [OpenAI](https://openai.com/) API Key (LLM)
- A [Sarvam AI](https://www.sarvam.ai/) API Key (TTS for Malayalam/Hindi)
- A SIP provider (e.g., Vobiz) with:
  - An outbound trunk for making calls
  - A dedicated phone number for inbound AI calls

### 2. Clone & Install

```bash
cd LIvekitAIVoice

# Python virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Dashboard
cd dashboard
npm install
cd ..
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Fill in all required credentials in `.env`:
- **LiveKit:** `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- **Deepgram:** `DEEPGRAM_API_KEY`
- **Groq/OpenAI:** `GROQ_API_KEY` or `OPENAI_API_KEY`
- **Sarvam:** `SARVAM_API_KEY`
- **Vobiz:** `VOBIZ_SIP_*` variables
- **AI Phone Number:** `MANAS_AI_PHONE_NUMBER`

### 4. Setup SIP Trunks

**Outbound Trunk** (for making calls):
```bash
# List existing trunks
python list_trunks.py

# Or create a new one
python create_trunk.py
```

**Inbound Trunk** (for receiving calls on the AI number):
```bash
python setup_inbound_trunk.py
```

If the script cannot create the dispatch rule via SDK, configure it manually in the LiveKit dashboard:
1. Go to https://cloud.livekit.io/ → Your Project → SIP
2. Create an Inbound Trunk with your AI phone number
3. Add a Dispatch Rule: Agent Name = `manas-agent`

### 5. Initialize the Database

```bash
# Seeds 59 products and creates all tables
python database.py
```

---

## Usage

### 1. Start the Voice Agent

```bash
# Development mode (hot-reload, verbose logs)
python agent.py dev

# Production mode
python agent.py start
```

The agent connects to LiveKit and waits for jobs. You should see:
```
INFO:manas-agent:Using Groq LLM
INFO:manas-agent:Using Sarvam TTS (Voice: anushka)
```

### 2. Start the Dashboard

```bash
cd dashboard
npm run dev
```

Open http://localhost:3000

### 3. Make an Outbound Call

**Via Dashboard:** Fill in the phone number, select campaign type and language, click "Initiate Call"

**Via CLI:**
```bash
# Service reminder
python make_call.py --to +919876543210 --campaign-type service_reminder --language ml

# Sales follow-up
python make_call.py --to +919876543210 --campaign-type follow_up --language ml

# Promotional offer
python make_call.py --to +919876543210 --campaign-type promotional --language ml

# Payment follow-up
python make_call.py --to +919876543210 --campaign-type payment_followup --language ml

# With custom voice and model
python make_call.py --to +919876543210 --language en --model-provider openai --voice alloy
```

### 4. Receive Inbound Calls

Call your dedicated AI phone number from any phone. The agent will:
1. Answer in Malayalam
2. Detect your language from your first response
3. Help with product inquiries, service bookings, financing, etc.

### 5. Launch a Campaign

Via dashboard → **Campaigns** tab:
1. Select a template (Service Reminder, Sales Follow-up, Monsoon Offer, EMI Reminder)
2. Enter phone numbers (one per line)
3. Click "Launch"

Or use the **Campaign** panel on the main dashboard for bulk CSV input.

---

## Campaign Types

| Type | Description | Default Language |
|------|-------------|-----------------|
| `service_reminder` | Remind about periodic tractor/implement servicing | Malayalam |
| `follow_up` | Follow up on previous sales inquiries | Malayalam |
| `promotional` | Inform about seasonal offers and discounts | Malayalam |
| `payment_followup` | Polite EMI/financing follow-up | Malayalam |

---

## Function Tools

The AI agent has 8 tools it can call during conversations:

| Tool | What It Does |
|------|-------------|
| `lookup_user` | Pulls up customer profile, recent calls, active bookings, open leads |
| `transfer_call` | Transfers to a human support agent at the configured support numbers |
| `book_service` | Creates a service appointment, returns booking reference (SRV-YYYYMMDD-XXXX) |
| `check_service_status` | Checks status of existing bookings by phone or reference number |
| `get_product_info` | Searches 59 products across 7 brands, returns specs and price range |
| `check_financing` | Calculates approximate EMI, shows partner banks and required documents |
| `request_callback` | Schedules a human callback with reason and preferred time |
| `log_inquiry` | Logs a sales lead for follow-up by the human sales team |

---

## Database

SQLite database at `data/manas_group.db` with 6 tables:

| Table | Purpose |
|-------|---------|
| `customers` | Customer profiles with language preference |
| `calls` | Complete call history with direction, type, status, duration |
| `service_bookings` | Service appointments with booking reference |
| `products` | 59 products across 7 brands with specs and pricing |
| `leads` | Sales inquiries with status pipeline |
| `follow_ups` | Scheduled callbacks and reminders |

To inspect the database:
```bash
sqlite3 data/manas_group.db
.tables
SELECT * FROM products WHERE brand='John Deere' LIMIT 5;
SELECT * FROM service_bookings;
```

---

## Docker Deployment

```bash
# Build and start voice agent + dashboard
docker-compose up -d

# View logs
docker-compose logs -f voice-agent

# Stop
docker-compose down
```

The `docker-compose.yml` includes:
- `voice-agent` — Python agent with persistent database volume
- `dashboard` — Next.js dashboard on port 3000

---

## Troubleshooting

### Call connects but no audio
- **Fix:** Check terminal logs. If using OpenAI TTS, ensure you have credits. Switch to Sarvam TTS (`TTS_PROVIDER=sarvam`) for Malayalam/Hindi.

### Error: `model_decommissioned` (Groq)
- **Fix:** Open `config.py`, update `GROQ_MODEL` to a supported model, restart agent.

### Error: `404 Not Found` (SIP Trunk)
- **Fix:** Run `python list_trunks.py`, verify `VOBIZ_SIP_TRUNK_ID` in `.env` matches.

### Error: `Max Auth Retry Attempts` (Vobiz)
- **Fix:** Run `python setup_trunk.py` to sync credentials to LiveKit.

### Inbound calls not reaching agent
- **Fix:** Verify the dispatch rule in LiveKit dashboard routes to `manas-agent`. Check `INBOUND_TRUNK_ID` in `.env`.

### Malayalam TTS not working
- **Fix:** Ensure `SARVAM_API_KEY` is set and Sarvam provider is available. The agent auto-switches to Sarvam for Malayalam.

### Database not found by dashboard
- **Fix:** Set `DATABASE_PATH` in `.env` to the absolute path of `data/manas_group.db`, or ensure the dashboard runs from the project root.

---

## Configuration Reference

See `config.py` for all settings including:
- System prompt (loaded from `prompts/system_prompt.txt`)
- Language-to-TTS mappings (Malayalam→Sarvam, Hindi→Sarvam, English→OpenAI)
- Service time slots and types
- Financing defaults (interest rate, tenure, partner banks)
- Campaign type prompts
- Call limits and windows

---

## License

Proprietary — Manas Group India
