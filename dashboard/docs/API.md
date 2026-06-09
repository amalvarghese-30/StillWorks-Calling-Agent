# AgriForge — API Reference

**Base URL**: `http://localhost:3000` (dev)  
**Auth**: Session cookie (`agriforge_session`) for most endpoints. Webhook uses HMAC signature.

---

## Authentication

### `POST /api/auth/login`
Authenticate and receive a session cookie.

**Body**:
```json
{
  "email": "admin@agriforge.in",
  "password": "AgriForge@2026"
}
```

**Response** (200):
```json
{
  "user": { "id": 1, "email": "admin@agriforge.in", "name": "Admin User", "role": "admin" }
}
```
Sets `Set-Cookie: agriforge_session=...; HttpOnly; SameSite=Strict`

**Errors**: 400 (missing fields), 401 (invalid credentials), 403 (disabled account)

---

### `POST /api/auth/logout`
Clear the session cookie.

**Response** (200): `{ "success": true }`

---

### `GET /api/auth/session`
Return the current authenticated user, or 401.

**Response** (200):
```json
{
  "authenticated": true,
  "user": { "id": 1, "email": "...", "name": "...", "role": "..." }
}
```
**Error** (401): `{ "authenticated": false }`

---

## Calls

### `GET /api/calls`
List calls, newest first (max 50).

**Query**: `?direction=outbound&status=completed,answered`

**Response** (200):
```json
{
  "calls": [
    {
      "id": 1,
      "phone_number": "+919876543210",
      "direction": "outbound",
      "call_type": "service_reminder",
      "room_name": "out-+919876543210-abc123",
      "status": "completed",
      "duration_seconds": 120,
      "created_at": "2026-06-10T10:30:00Z"
    }
  ]
}
```

---

### `GET /api/calls/[id]`
Get a single call with all related data.

**Response** (200):
```json
{
  "call": { /* call object */ },
  "callMemory": { "memory_json": "{...}", "transcript": "...", "summary": "..." },
  "quote": { "quote_id": "QTE-20260610-0001", ... },
  "escalation": { "tier": 2, "reason": "Pricing inquiry", ... },
  "appointments": [ { "booking_ref": "SRV-20260610-0001", ... } ]
}
```
**Error** (404): `{ "error": "Call not found" }`

---

### `POST /api/calls/outbound`
Dispatch a single manual outbound call. **Requires: admin, manager, or agent**.

**Body**:
```json
{
  "phoneNumber": "+919876543210",
  "customerName": "Rajesh Kumar",
  "language": "ml",
  "reason": "service_reminder"
}
```

**Response** (200):
```json
{
  "success": true,
  "roomName": "out-+919876543210-x7k2m",
  "dispatchId": "disp_abc123",
  "call": { "id": 42, "status": "initiated", ... }
}
```

---

### `GET /api/calls/stream`
Server-Sent Events stream for real-time call updates.

**Response**: `text/event-stream`

Events:
```
data: {"type":"initial","calls":[...]}
data: {"type":"update","calls":[...]}
```

Polls database every 3 seconds. Delivers 30 most recent calls.

---

### `GET /api/calls/[id]/insights`
AI-computed insights for a call.

**Response** (200):
```json
{
  "callId": "42",
  "leadScore": 72,
  "purchaseProbability": "high",
  "sentiment": "positive",
  "scoreFactors": {
    "engagement": 8,
    "intent_clarity": 7,
    "budget_mentioned": 9,
    "timeline_urgency": 6,
    "competitor_mention": 2
  },
  "topics": ["pricing", "financing", "demo"],
  "nextAction": "send_quote",
  "transcriptAvailable": true,
  "summary": "Customer interested in 5050D, discussed EMI options..."
}
```

---

### `POST /api/calls/[id]/actions`
Execute post-call business actions. **Requires: admin**.

**Body**:
```json
{ "action": "auto" }
```

Actions: `auto` (auto-detect from call outcome), `generate_quote`, `book_appointment`

**Response** (200):
```json
{
  "success": true,
  "callId": "42",
  "actions": ["quote_generated", "appointment_created"],
  "message": "Executed: quote_generated, appointment_created"
}
```

---

## Campaigns

### `GET /api/campaigns`
List campaigns with aggregate performance.

**Response** (200):
```json
{
  "campaigns": [ /* campaign objects */ ],
  "performance": {
    "totalCampaigns": 5,
    "callsDispatched": 150,
    "answeredRate": 68,
    "leadsGenerated": 12
  }
}
```

---

### `GET /api/campaigns/[id]`
Get a campaign with all its campaign_calls.

**Response** (200):
```json
{
  "campaign": { "id": 1, "name": "Service Reminders", "status": "draft", ... },
  "calls": [ { "id": 1, "phone": "+919876543210", "status": "pending" }, ... ]
}
```

---

### `PATCH /api/campaigns/[id]`
Update campaign status. Setting to `running` dispatches all pending calls. **Requires: admin**.

**Body**:
```json
{ "status": "running" }
```

**Response** (200):
```json
{
  "campaign": { "id": 1, "status": "running", "started_at": "..." },
  "execution": { "dispatched": 3, "failed": 0, "total": 3 }
}
```

---

### `POST /api/campaigns/upload`
Upload a CSV file to create a campaign. **Requires: admin**.

**Request**: `multipart/form-data`
- `file`: CSV with columns `phone, name, language, reason`
- `name`: Campaign name (optional)
- `campaignType`: Type (optional, default: `csv_upload`)
- `language`: Default language (optional, default: `ml`)

**Response** (200):
```json
{
  "success": true,
  "campaign": { "id": 2, "name": "June Follow-ups", "status": "draft" },
  "entriesCount": 3
}
```

---

## Customers

### `GET /api/customers`
List customers (max 100).

**Query**: `?search=Rajesh`

**Response** (200):
```json
{
  "customers": [
    { "id": 1, "name": "Rajesh Kumar", "phone": "+919876543210", "district": "Palakkad", ... }
  ]
}
```

---

### `GET /api/customers/[id]`
Get a customer with all related data (calls, quotes, appointments, lead, call_memory).

**Response** (200):
```json
{
  "customer": { "id": 1, "name": "Rajesh Kumar", ... },
  "calls": [ /* 50 most recent calls */ ],
  "quotes": [ /* 20 most recent quotes */ ],
  "appointments": [ /* 20 most recent bookings */ ],
  "lead": { "status": "qualified", "lead_score": 72, ... },
  "callMemory": { "transcript": "...", "summary": "...", ... }
}
```

---

## Leads

### `GET /api/leads`
List leads (max 100).

**Query**: `?status=qualified&search=Kumar`

**Response** (200):
```json
{
  "leads": [
    { "id": 1, "customer_name": "Rajesh Kumar", "status": "qualified", "lead_score": 72, ... }
  ]
}
```

---

### `PATCH /api/leads`
Update lead status. **Requires: admin, manager, or agent**.

**Body**:
```json
{
  "id": "1",
  "status": "qualified"
}
```

**Response** (200): `{ "success": true }`

---

## Quotes

### `GET /api/quotes`
List quotes (max 100).

**Query**: `?status=accepted&search=QTE-2026`

**Response** (200):
```json
{
  "quotes": [
    { "id": 1, "quote_id": "QTE-20260610-0001", "customer_name": "Rajesh Kumar", "total_price": 785000, ... }
  ]
}
```

---

### `GET /api/quotes/[id]`
Get a single quote.

**Response** (200):
```json
{
  "quote": { "id": 1, "quote_id": "QTE-20260610-0001", "brand": "John Deere", "model": "5050D", ... }
}
```

---

### `GET /api/quotes/[id]/pdf`
Generate a quotation HTML page.

**Response**: `text/html` — styled quotation with AgriForge branding, cost breakdown, EMI options.

---

## Service Bookings

### `GET /api/service-bookings`
List bookings (max 100).

**Query**: `?status=pending&search=SRV-2026`

**Response** (200):
```json
{
  "bookings": [
    { "id": 1, "booking_ref": "SRV-20260610-0001", "customer_name": "Rajesh Kumar", "status": "pending", ... }
  ]
}
```

---

### `POST /api/service-bookings`
Create a new service booking. **Requires: admin, manager, or agent**.

**Body**:
```json
{
  "customer_name": "Rajesh Kumar",
  "phone": "+919876543210",
  "model": "John Deere 5050D",
  "issue_description": "Hydraulic leak, 500-hr service",
  "preferred_date": "2026-06-15",
  "time_slot": "morning",
  "location": "Palakkad",
  "service_type": "repair",
  "registration_number": "KL-09-AB-1234"
}
```

**Response** (200):
```json
{
  "success": true,
  "booking_ref": "SRV-20260610-0001"
}
```

---

## Scheduler

### `GET /api/scheduler`
Check scheduled campaigns.

**Response** (200):
```json
{
  "due": [ { "id": "1", "name": "June Follow-ups", "scheduled_at": "2026-06-10T09:00:00Z" } ],
  "upcoming": [ { "id": "2", "name": "July Campaign", "scheduled_at": "2026-07-01T09:00:00Z" } ],
  "count": { "due": 1, "upcoming": 1 },
  "checkedAt": "2026-06-10T10:30:00Z"
}
```

---

### `POST /api/scheduler`
Execute scheduler actions. **Requires: admin**.

**Action: check** — dispatch all due campaigns.
```json
{ "action": "check" }
```
Response:
```json
{
  "processed": 1,
  "results": [ { "campaign_id": "1", "name": "June Follow-ups", "dispatched": 3, "failed": 0, "total": 3 } ],
  "summary": { "dispatched": 3, "failed": 0 }
}
```

**Action: schedule** — schedule a campaign.
```json
{
  "action": "schedule",
  "campaign_id": "1",
  "scheduled_at": "2026-07-01T09:00:00+05:30",
  "recurrence_rule": "weekly mon 9"
}
```

**Action: reschedule** — reschedule to next recurrence.
```json
{
  "action": "reschedule",
  "campaign_id": "1",
  "recurrence_rule": "weekly mon 9"
}
```

Recurrence rules: `hourly`, `daily 9`, `weekly mon 9`, `monthly 1 9`

---

## Queue

### `POST /api/queue`
Bulk dispatch calls to an array of numbers. **Requires: admin or manager**.

**Body**:
```json
{
  "numbers": ["+919876543210", "+919988776655"],
  "prompt": "Service reminder call",
  "campaignType": "service_reminder",
  "language": "ml"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Processed 2 numbers",
  "campaignType": "service_reminder",
  "campaignId": "local",
  "results": [
    { "phoneNumber": "+919876543210", "status": "dispatched", "id": "..." },
    { "phoneNumber": "+919988776655", "status": "dispatched", "id": "..." }
  ]
}
```

---

## Dispatch

### `POST /api/dispatch`
Dispatch a single call (no DB record created). **Requires: admin, manager, or agent**.

**Body**:
```json
{
  "phoneNumber": "+919876543210",
  "prompt": "Custom AI prompt",
  "modelProvider": "groq",
  "voice": "anushka",
  "campaignType": "follow_up",
  "language": "ml"
}
```

**Response** (200):
```json
{
  "success": true,
  "roomName": "out-+919876543210-x7k2m",
  "dispatchId": "disp_abc123",
  "campaignType": "follow_up"
}
```

---

## Webhooks

### `POST /api/webhooks/livekit`
Receive LiveKit webhook events. **No session auth — HMAC signature verified**.

**Headers**:
- `Authorization`: `base64(HMAC-SHA256(LIVEKIT_API_SECRET, raw_body))`

**Body**: Raw JSON (LiveKit webhook payload)

Events mapped:
| LiveKit Event | → Call Status |
|---------------|---------------|
| `participant_joined` | `answered` |
| `room_started` | `in_progress` |
| `room_finished` | `completed` |
| `sip_call_started` | `in_progress` |
| `sip_call_ended` | `completed` |

**Response** (200): `{ "received": true }`  
**Error** (401): missing signature  
**Error** (403): invalid signature

---

## Operations

### `GET /api/operations`
Platform health metrics.

**Response** (200):
```json
{
  "calls": {
    "total": 500, "inbound": 120, "outbound": 380, "today": 25,
    "answered": 420, "transferred": 12, "failed": 68,
    "answerRate": 84, "transferRate": 2, "failureRate": 14,
    "avgDuration": 95
  },
  "quotes": { "total": 45, "accepted": 12, "conversionRate": 27 },
  "leads": { "total": 80, "qualified": 35, "qualificationRate": 44 },
  "campaigns": { "total": 5, "active": 1 },
  "escalations": { "total": 3 },
  "webhooks": { "total": 200, "failures": 0 },
  "system": {
    "dbBackend": "sqlite",
    "llmProvider": "groq",
    "ttsProvider": "sarvam",
    "sttProvider": "deepgram"
  }
}
```

---

## Notifications

### `GET /api/notifications`
List notifications.

**Query**: `?unread=true&limit=20`

**Response** (200):
```json
{
  "notifications": [ { "id": 1, "type": "call_completed", "title": "Call completed", "read": 0, ... } ],
  "unreadCount": 5
}
```

---

### `POST /api/notifications`
Create a notification. **Requires: admin, manager, or agent**.

**Body**:
```json
{
  "type": "quote_generated",
  "title": "Quote ready for Rajesh Kumar",
  "message": "QTE-20260610-0001 generated from call #42",
  "call_id": "42",
  "customer_id": "1"
}
```

**Response** (200): `{ "notification": { "id": 10, ... } }`

---

### `PATCH /api/notifications/[id]`
Mark notification read/unread.

**Body**:
```json
{ "read": true }
```

**Response** (200): `{ "success": true }`

---

## Analytics

### `GET /api/analytics`
Full analytics payload (calls per day, outcome distribution, lead funnel, revenue trend, KPIs).

### `GET /api/stats`
Dashboard summary stats (total calls, inbound/outbound, active bookings, open leads, customers).

### `GET /api/agent-health`
Agent health metrics (active calls, today's stats, avg lead score, escalation rate, config).

### `GET /api/inventory`
Product inventory with stock status and KPIs.

### `GET /api/escalations`
Escalation list with optional status filter.

### `POST /api/audit`
Internal audit log endpoint (called by proxy.ts).

---

## Error Response Format

All errors follow:
```json
{
  "error": "Human-readable error message"
}
```

With appropriate HTTP status codes:
- **400** — Bad request (missing/invalid parameters)
- **401** — Unauthenticated (missing/invalid session)
- **403** — Forbidden (insufficient role)
- **404** — Resource not found
- **500** — Internal server error


