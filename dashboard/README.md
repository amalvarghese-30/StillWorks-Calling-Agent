# AgriForge — AI-Powered Agricultural Dealership Platform

Voice AI and CRM platform for agricultural machinery dealerships. Automated outbound calling, lead scoring, quote generation, service booking, and campaign management — powered by LiveKit Voice AI.

## Architecture

```
┌──────────────────────────────────────────────┐
│                  Browser                      │
│  ┌────────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Dashboard  │  │ Call Ctr  │  │ Campaigns│ │
│  └─────┬──────┘  └─────┬─────┘  └────┬────┘ │
│        │            SSE ↑             │       │
└────────┼────────────────┼──────────────┼──────┘
         │ HTTP           │              │
┌────────┼────────────────┼──────────────┼──────┐
│        ▼                │              ▼      │
│  ┌──────────┐    ┌──────┴──────┐  ┌──────────┐
│  │ proxy.ts │───▶│  API Routes  │◀─│ Webhooks │
│  │  (RBAC)  │    │  (31 routes) │  │ (LiveKit)│
│  └──────────┘    └──────┬───────┘  └──────────┘
│                         │                      │
│              ┌──────────┴──────────┐           │
│              ▼                     ▼           │
│       ┌──────────┐         ┌───────────┐      │
│       │  SQLite   │         │  MongoDB   │     │
│       │ (default) │         │  (config)  │     │
│       └──────────┘         └───────────┘      │
│              Next.js 16 Dashboard             │
└───────────────────────────────────────────────┘
                       │
┌──────────────────────┼────────────────────────┐
│                      ▼                         │
│  ┌──────────────────────────────────────┐     │
│  │         LiveKit Cloud                │     │
│  │  ┌──────────┐   ┌───────────────┐   │     │
│  │  │ SIP Trunk │──▶│ Agent Dispatch│   │     │
│  │  │ (Vobiz)   │   │  (AI Voice)   │   │     │
│  │  └──────────┘   └───────┬───────┘   │     │
│  │                         │            │     │
│  │         ┌───────────────┴──────┐     │     │
│  │         │    LLM / TTS / STT   │     │     │
│  │         │ Groq / Sarvam /      │     │     │
│  │         │ Deepgram / Cartesia  │     │     │
│  │         └──────────────────────┘     │     │
│  └──────────────────────────────────────┘     │
│              Python Voice Agent               │
└───────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **Charts** | Recharts |
| **Calendar** | FullCalendar |
| **Icons** | Lucide React |
| **Voice AI** | LiveKit Cloud (SIP + Agent Dispatch) |
| **LLM** | Groq (Llama 4 Scout) |
| **TTS** | Sarvam AI (Indian languages), Cartesia (ultra-fast) |
| **STT** | Deepgram (Nova-2) |
| **Database** | SQLite (better-sqlite3) / MongoDB |
| **Auth** | Custom JWT-like session tokens (HMAC-SHA256), HTTP-only cookies |
| **SIP Trunk** | Vobiz (outbound + inbound) |

## Features

### CRM
- Customer directory with search, detail view, activity timeline
- Lead pipeline with scoring, status management
- Quote generation with PDF output
- Service booking with auto-generated reference numbers
- Appointment calendar (FullCalendar)

### Voice AI Operations
- Manual outbound dialer (single calls)
- Bulk campaign dispatch (queue-based)
- CSV campaign upload with validation
- Real-time call monitoring (SSE stream)
- Call detail drawer with transcript, summary, insights
- AI-powered lead scoring and purchase probability
- Auto business actions (quote + appointment generation)
- Inbound call monitoring

### Campaign Management
- CSV upload → campaign creation → pending call queue
- Campaign start/pause/resume/stop
- LiveKit dispatch for all campaign calls
- Campaign analytics (charts: performance, answer rate, leads, ROI)
- Campaign scheduler with recurrence (hourly/daily/weekly/monthly)
- Campaign templates (service reminder, EMI follow-up, demo, product inquiry)

### Operations & Security
- Operations observability dashboard
- Role-based access control (admin, manager, agent, viewer)
- Audit logging for all write operations
- LiveKit webhook signature verification (HMAC-SHA256)
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- HTTP-only, SameSite=Strict session cookies

## Quick Start

```bash
# 1. Install dependencies
cd dashboard
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run database migrations
python scripts/migrate_phase4b.py
python scripts/migrate_phase5.py

# 4. Seed admin password
node scripts/seed-admin-password.cjs

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000/login
#    Email: admin@agriforge.in
#    Password: AgriForge@2026
```

## Project Structure

```
dashboard/
├── app/
│   ├── api/           # 32 API endpoints
│   │   ├── auth/      # Login, logout, session
│   │   ├── calls/     # Call CRUD, outbound, stream, insights, actions
│   │   ├── campaigns/ # Campaign CRUD, CSV upload
│   │   ├── customers/ # Customer CRUD
│   │   ├── leads/     # Lead CRUD + status update
│   │   ├── notifications/ # Notification CRUD
│   │   ├── quotes/    # Quote CRUD, PDF
│   │   ├── scheduler/ # Campaign scheduler
│   │   ├── webhooks/  # LiveKit webhook handler
│   │   └── ...        # analytics, audit, dispatch, escalations, etc.
│   ├── analytics/     # Analytics & Executive dashboards
│   ├── call-center/   # Unified call operations
│   ├── campaigns/     # Campaign management
│   ├── calendar/      # Appointment calendar
│   ├── calls/         # Call history
│   ├── customers/     # Customer list + detail
│   ├── escalations/   # Escalation management
│   ├── inbound/       # Redirect → /voice
│   ├── inventory/     # Inventory management
│   ├── leads/         # Lead pipeline
│   ├── login/         # Authentication page
│   ├── operations/    # Operations dashboard
│   ├── quotes/        # Quote management
│   ├── services/      # Service operations
│   ├── settings/      # Platform settings
│   ├── voice/         # Live call monitoring
│   └── layout.tsx     # Root layout with AppShell
├── components/
│   ├── shared/        # DataTable, KpiCard, StatusBadge, etc.
│   ├── ui/            # shadcn/ui primitives (16 components)
│   └── *.tsx          # Feature components (14 components)
├── lib/
│   ├── auth.ts        # Session tokens, password hashing
│   ├── server-utils.ts # LiveKit SDK integration
│   └── utils.ts       # Tailwind class merging
├── scripts/
│   ├── migrate_phase4b.py  # Campaign schema migration
│   └── migrate_phase5.py   # Phase 5 schema migration
├── proxy.ts           # RBAC middleware + security headers
├── .env               # Environment configuration
└── package.json
```

## Roles

| Role | Access Level |
|------|-------------|
| **admin** | Full platform access, campaign dispatch, scheduler, settings |
| **manager** | CRM, campaigns, analytics, inventory, team operations |
| **agent** | Customer handling, calls, calendar, quotes, service bookings |
| **viewer** | Read-only: customers, quotes, calls, inventory |

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `GROQ_API_KEY` | Groq LLM API key |
| `DEEPGRAM_API_KEY` | Deepgram STT API key |
| `SARVAM_API_KEY` | Sarvam TTS API key |
| `DATABASE_PATH` | SQLite database path (default: `../data/manas_group.db`) |
| `DB_BACKEND` | `sqlite` or `mongodb` |
| `LLM_PROVIDER` | LLM provider (default: `groq`) |
| `TTS_PROVIDER` | TTS provider (default: `sarvam`) |

## License

Proprietary — Manas Group, Palakkad, Kerala.
