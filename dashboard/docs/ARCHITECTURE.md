# AgriForge — Architecture

## System Overview

AgriForge is a two-layer system: a **Python Voice Agent** that drives AI-powered phone calls via LiveKit, and a **Next.js Dashboard** that provides CRM, campaign management, and real-time call monitoring.

```
┌──────────────────────────────────────────────────────────────┐
│                    BROWSER (React 19 SPA)                     │
│                                                               │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │Dashboard│ │CallCenter│ │Campaigns │ │Analytics/Exec   │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │           │            │                  │           │
│       │    SSE Stream (text/event-stream)         │           │
│       │      ┌────┴─────────────────────────┐    │           │
│       │      │  GET /api/calls/stream        │    │           │
│       │      │  (3s polling, ReadableStream) │    │           │
│       │      └──────────────────────────────┘    │           │
└───────┼────────────────────────────────────────────────────────┘
        │  HTTP/1.1 + Cookies
┌───────┼────────────────────────────────────────────────────────┐
│       ▼                                                        │
│  ┌──────────────────────────────────────────────────────┐     │
│  │                   proxy.ts                            │     │
│  │  • Session validation (HMAC-SHA256 JWT cookie)        │     │
│  │  • Role-based access control (admin/manager/agent/    │     │
│  │    viewer)                                            │     │
│  │  • API permission enforcement (regex route matching)  │     │
│  │  • Audit logging (fire-and-forget POST)               │     │
│  │  • Security headers (CSP, HSTS, XFO, XSS, RP, PP)    │     │
│  │  • Unauthenticated redirect → /login                  │     │
│  └────────────────────┬─────────────────────────────────┘     │
│                       ▼                                        │
│  ┌──────────────────────────────────────────────────────┐     │
│  │               API Routes (32 endpoints)               │     │
│  │                                                       │     │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │     │
│  │  │ /auth   │ │ /calls   │ │ /campaigns│ │ /customers│ │     │
│  │  │ - login │ │ - list   │ │ - list    │ │ - list   │ │     │
│  │  │ - logout│ │ - detail │ │ - detail  │ │ - detail │ │     │
│  │  │ -session│ │ -outbound│ │ - upload  │ │          │ │     │
│  │  │         │ │ - stream │ │ - status  │ │          │ │     │
│  │  │         │ │ -insights│ │           │ │          │ │     │
│  │  │         │ │ - actions│ │           │ │          │ │     │
│  │  └─────────┘ └──────────┘ └──────────┘ └──────────┘ │     │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │     │
│  │  │ /leads  │ │ /quotes  │ │ /scheduler│ │/webhooks │ │     │
│  │  │ - list  │ │ - list   │ │ - check  │ │ livekit  │ │     │
│  │  │ - status│ │ - detail │ │ - schedule│ │ (signed) │ │     │
│  │  │         │ │ - PDF    │ │ -resched │ │          │ │     │
│  │  └─────────┘ └──────────┘ └──────────┘ └──────────┘ │     │
│  │                                                       │     │
│  │  Plus: /analytics, /stats, /dispatch, /queue,         │     │
│  │        /escalations, /inventory, /service-bookings,   │     │
│  │        /agent-health, /notifications, /operations,    │     │
│  │        /audit                                         │     │
│  └────────────────────┬─────────────────────────────────┘     │
│                       ▼                                        │
│  ┌──────────────────────────────────────────────────────┐     │
│  │                   Data Layer                          │     │
│  │  ┌──────────────────┐    ┌──────────────────┐       │     │
│  │  │  better-sqlite3   │    │  mongodb (6.10)  │       │     │
│  │  │  (default)        │    │  (DB_BACKEND=    │       │     │
│  │  │  data/manas_group │    │   mongodb)       │       │     │
│  │  │  .db              │    │                  │       │     │
│  │  └──────────────────┘    └──────────────────┘       │     │
│  │                                                       │     │
│  │  getCollection(name) → MongoDB col | null              │     │
│  │  null → fallback to better-sqlite3                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                               │
│              NEXT.JS 16 DASHBOARD (Node.js)                   │
└───────────────────────────────────────────────────────────────┘
                        │
                        │ LiveKit SDK
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    LIVEKIT CLOUD                              │
│                                                               │
│  ┌─────────────────┐         ┌──────────────────────┐       │
│  │  SIP Trunk       │────────▶│  Room (WebRTC)       │       │
│  │  (Vobiz)         │  inbound │  ┌──────────────┐   │       │
│  │  Outbound:       │◀────────│  │ AI Agent      │   │       │
│  │  Agent Dispatch  │ outbound│  │ (manas-agent) │   │       │
│  └─────────────────┘         │  └──────┬───────┘   │       │
│                               │         │            │       │
│  ┌─────────────────┐         │  ┌──────▼───────┐   │       │
│  │  Webhook Events  │◀────────│  │ Data Pipeline│   │       │
│  │  → /api/webhooks │         │  │ STT→LLM→TTS  │   │       │
│  │    /livekit      │         │  └──────────────┘   │       │
│  └─────────────────┘         └──────────────────────┘       │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                        │
                        │ AI Provider APIs
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI SERVICES                                │
│                                                               │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │
│  │  Groq     │ │  Sarvam   │ │ Deepgram  │ │ Cartesia  │   │
│  │  LLM      │ │  TTS      │ │  STT      │ │  TTS      │   │
│  │  Llama 4  │ │  Bulbul   │ │  Nova-2   │ │  Sonic    │   │
│  └──────────┘ └───────────┘ └───────────┘ └───────────┘   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow: Outbound Call

```
1. User clicks "Call Now" in dashboard
2. POST /api/calls/outbound { phoneNumber, customerName, language, reason }
3. Route handler:
   a. Validates phone number
   b. Calls agentDispatchClient.createDispatch(roomName, "manas-agent", metadata)
   c. Inserts record into calls table (status: "initiated")
   d. Returns { roomName, dispatchId }
4. LiveKit creates WebRTC room, connects AI agent
5. AI agent calls phone number via SIP trunk
6. Call progresses: ringing → answered → conversation → completed
7. LiveKit sends webhook events to /api/webhooks/livekit
8. Webhook handler verifies HMAC signature
9. Updates calls table: status transitions (participant_joined → answered, room_finished → completed)
10. SSE stream pushes update to connected dashboard clients
```

## Data Flow: Campaign Execution

```
1. User uploads CSV via POST /api/campaigns/upload
   → Parses phone, name, language, reason columns
   → Creates campaign (status: "draft")
   → Creates campaign_calls rows (status: "pending")

2. User clicks "Start" on campaign
   → PATCH /api/campaigns/[id] { status: "running" }

3. Route handler:
   a. Fetches all pending campaign_calls
   b. For each: calls agentDispatchClient.createDispatch()
   c. Updates campaign_calls: status → "completed"
   d. Updates campaign: processed_count, calls_dispatched
   e. Returns { dispatched, failed, total }

4. LiveKit webhooks → update calls table
   (Note: campaign_calls ↔ calls bridge is pending implementation)
```

## Security Architecture

```
Request Flow:
  Browser
    │
    ▼
  proxy.ts
    ├─ Parse session cookie (agriforge_session)
    ├─ Verify HMAC-SHA256 signature
    ├─ Check token expiry (8 hours)
    ├─ Extract role from session payload
    ├─ API routes: check API_PERMISSIONS (regex patterns)
    ├─ Page routes: check PAGE_PERMISSIONS
    ├─ Webhook: HMAC-SHA256 signature verification
    │            (bypasses session auth)
    ├─ Write ops: fire-and-forget audit log
    └─ Response: add security headers
       ├─ X-Content-Type-Options: nosniff
       ├─ X-Frame-Options: DENY
       ├─ X-XSS-Protection: 1; mode=block
       ├─ Content-Security-Policy
       ├─ Strict-Transport-Security
       ├─ Referrer-Policy
       └─ Permissions-Policy
```

## Component Tree

```
RootLayout (layout.tsx)
└─ AppShell (AppShell.tsx)
   ├─ [if /login] → children only (no sidebar)
   └─ [otherwise]
      ├─ Sidebar
      │  ├─ Logo + NotificationBell
      │  ├─ Nav sections (7 groups, 16 links)
      │  ├─ Settings link
      │  └─ User footer + logout
      └─ Main content area
         └─ Page component
            ├─ PageHeader (title, description, actions)
            ├─ KpiCard grid (4 metrics)
            ├─ DataTable / custom content
            └─ Dialogs/Sheets (DialerModal, CallDetailDrawer, etc.)
```

## Database Architecture

Dual-backend design:

```
getCollection(name: string) → Collection | null
  │
  ├─ MongoDB available?
  │    YES → return db.collection(name)
  │    NO  → return null
  │
  ▼
Route handler:
  const col = await getCollection('calls');
  if (col) {
    // MongoDB path
    await col.find({...}).toArray();
  } else {
    // SQLite fallback
    const db = new Database(dbPath);
    db.prepare('SELECT ...').all();
    db.close();
  }
```

18 tables total (see `docs/DATABASE.md` for full schema).
