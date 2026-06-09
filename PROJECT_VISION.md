AgriForge Voice AI Agent — Production-Grade Redesign Prompt
Complete Project Context
You are building a production-grade AI voice calling system for AgriForge — an agricultural machinery dealership platform (tractors, harvesters, implements from brands like John Deere, ACE, Shaktiman, Kirloskar).

The existing codebase (provided in the dump) has fundamental problems that must be fixed BEFORE any website integration.

CURRENT PROBLEMS (Must Fix First)
Problem 1: Mixed Language Issues
Current system auto-detects language and switches mid-conversation

Example: User selects English → AI suddenly switches to Malayalam

For business use, this is unacceptable

Problem 2: Audio Quality Issues
Audio cuts and interruptions

Most likely caused by:

Free STT plan limits

Free TTS plan limits

Low-latency optimization hacks

Small response buffers

Aggressive interruption settings

Token reduction tricks

Problem 3: Robotic Conversation
Current flow: STT → LLM → TTS

Missing:

Conversation memory

Emotion handling

Sales flow logic

Objection handling

CRM awareness

Context persistence

Problem 4: Developer Dashboard
Current UI looks like developer tools

Not a business dashboard

Missing: CRM, call center view, analytics, sales pipeline, calendar, notifications

TARGET ARCHITECTURE
Think of this as Salesforce + HubSpot + Call Center + AI Agent combined.

Five AI Agent Personas
1. AI Receptionist (Inbound)
Handles:

Product inquiry

Price inquiry

Dealer inquiry

Financing inquiry

Service booking

Complaint registration

2. AI Sales Executive (Outbound)
Handles:

Lead follow-up

Product recommendation

EMI discussions

Offer campaigns

Demo scheduling

3. AI Service Manager
Handles:

Service reminders

Warranty reminders

Maintenance reminders

Technician scheduling

4. AI Appointment Coordinator
Handles:

Demo bookings

Showroom visits

Video consultations

5. AI Collections Executive
Handles:

EMI reminders

Payment follow-up (politely)

LANGUAGE FLOW (CRITICAL)
Problem to Fix:
Current: English selected → Agent suddenly switches to Malayalam

New Flow:
text
Step 1: Agent always starts with:
"Welcome to AgriForge. Thank you for calling."

Step 2: Then:
"Which language would you prefer?"
- English
- Hindi
- Malayalam

Step 3: Once selected → LOCK LANGUAGE
Never switch unless user explicitly says:
"Can we continue in Hindi?"

Step 4: Only then switch, and confirm:
"Sure, I will continue in Hindi."
CONVERSATION MEMORY SYSTEM
Every call must create this structure:

json
{
  "call_id": "CALL-20260115-XXXX",
  "customer": {
    "name": "",
    "phone": "",
    "alternate_phone": "",
    "email": "",
    "district": "",
    "state": "Kerala",
    "farm_size_acres": null,
    "crop_types": []
  },
  "language": "en|hi|ml",
  "interest": {
    "product_category": "",
    "specific_model": "",
    "budget_min": null,
    "budget_max": null,
    "urgency": "high|medium|low",
    "purchase_timeline": ""
  },
  "products_discussed": [],
  "appointment": {
    "type": "demo|service|callback",
    "date": null,
    "time": null,
    "status": "pending|confirmed|completed|cancelled"
  },
  "lead_score": 0,
  "call_summary": "",
  "transcript": "",
  "recording_url": "",
  "follow_up_required": false,
  "follow_up_date": null
}
Store in MongoDB — not SQLite.

LEAD SCORING SYSTEM
Score Calculation (0-100):
Factor	Weight	Points
Has budget	25	Up to 25
Has timeline (<30 days)	20	20
Product model known	15	15
Location (Kerala)	10	10
Farm size (>5 acres)	10	10
Multiple products interest	10	10
Asked for demo	10	10
Lead Categories:
Hot Lead (80-100): Ready to buy → Notify sales immediately

Warm Lead (40-79): Interested → Schedule follow-up within 48 hours

Cold Lead (0-39): Just browsing → Add to nurture campaign

ADVANCED SALES INTELLIGENCE
AI must detect and store:

Budget Detection
Trigger phrases:

"I need below X lakh"

"My budget is X"

"Can't afford more than X"

"What's the price range?"

Location Detection
Store district

Store city

For service dispatch

Farm Intelligence
Farm size (acres)

Crop types (rice, wheat, coconut, rubber, sugarcane, vegetables)

Existing machinery (brands owned, age)

Need Detection
Need Type	Detection Keywords
New Tractor	"need new tractor", "upgrade from"
Implement	"need rotavator", "looking for harvester"
Service	"service due", "repair", "not working"
Spare Parts	"spare parts", "need part for"
Financing	"loan", "EMI", "financing", "down payment"
Trade-in	"exchange", "trade my old", "sell my"
CALL QUALITY FIX PLAN
Suspected Problems:
Response truncation

Token clipping

Aggressive prompt compression

Poor VAD (Voice Activity Detection) settings

Inadequate endpointing

Required Fixes:
text
Remove:
- response truncation
- token clipping
- aggressive prompt compression

Add:
- streaming responses
- sentence buffering
- proper interruption control

Configure:
- Deepgram Nova 3 (not Nova 2)
- Better endpointing (minimum 500ms silence)
- Better VAD sensitivity (0.8 threshold)
TTS Provider Strategy:
Language	Provider	Voice	Notes
English	OpenAI TTS HD	alloy/echo	High quality, natural
Hindi	Sarvam	anushka	Native quality
Malayalam	Sarvam	anushka	Native quality
PROFESSIONAL DASHBOARD DESIGN
Design Tokens (Provided CSS)
Use the exact theme variables provided:

css
/* Key colors */
--primary: oklch(0.34 0.06 155)  /* Deep Forest Green */
--accent: oklch(0.68 0.18 50)    /* Accent Orange */
--beige: oklch(0.93 0.025 85)    /* Light Beige for cards */
--ink: oklch(0.16 0.005 250)     /* Dark for contrast */

/* Gradients */
--gradient-hero: linear-gradient(135deg, color-mix(in oklab, var(--ink) 95%, transparent) 0%, color-mix(in oklab, var(--primary) 70%, var(--ink)) 100%);
--gradient-card: linear-gradient(160deg, color-mix(in oklab, var(--primary) 8%, var(--background)) 0%, var(--background) 100%);
Dashboard Sections Required
1. Executive Dashboard
Layout: Grid with 6 key cards + charts

Cards:

Calls Today (inbound + outbound)

Leads Generated (today/total)

Appointments Today

Revenue Potential (sum of lead budgets)

Conversion Rate (leads → appointments)

Active Calls Now

Charts:

Last 7 days: Call volume + leads trend (line chart)

Lead distribution by status (pie chart)

Call outcome distribution (donut chart)

2. Call Center Dashboard
Layout: Split view (left: live calls, right: metrics)

Live Calls Table:

Caller	Phone	Duration	Status	Agent	Actions
...	...	...	Connected	AI	Listen
Metrics:

Active calls

Queued calls

Average wait time

Missed calls (last 24h)

Transferred to human

Abandon rate

3. CRM Dashboard
Tabs:

Customers (list with search/filter)

Leads (kanban board by status)

Call History (with audio player)

Notes (timeline view)

Customer Table Columns:

Name	Phone	District	Last Contact	Lead Score	Status	Actions
Lead Kanban Columns:

New → Contacted → Qualified → Converted → Lost

4. Calendar Dashboard
Use FullCalendar integration

Event Types with colors:

Demo Booking (Green)

Service Booking (Blue)

Callback Scheduled (Orange)

Follow-up (Yellow)

Warranty Reminder (Purple)

Click event modal shows:

Customer name & phone

Product/Service

Time & duration

Assigned to (Sales/Service)

Status & notes

Export to Google Calendar/iCal option.

5. Analytics Dashboard
Tabs:

Call Metrics: Avg duration, answer rate, drop rate, transfer rate

Sales Metrics: Hot/Warm/Cold leads, revenue potential, conversion funnel

Agent Metrics: Bookings, appointments, sales generated, sentiment analysis

Charts using Recharts:

Bar charts for daily volume

Line charts for trends

Funnel chart for conversion

Heatmap for call times

6. Recordings Dashboard
List all calls with:

Play button (audio player component)

Download button

Transcript expandable section

AI-generated summary

Tags/categories

Searchable by:

Phone number

Date range

Call outcome

Agent persona

7. Campaigns Dashboard
Create campaign modal:

Campaign name

Type (service_reminder, follow_up, promotional, payment_followup)

Target list (upload CSV or select from CRM)

Message template (edit prompt)

Schedule (date/time range)

Daily limit (max calls per day)

Campaign list shows:

Progress bar (% completed)

Success/failure stats

Pause/resume/stop buttons

8. Settings Dashboard
Tabs:

Voice Settings: STT provider, TTS voices per language, interruption sensitivity

Business Hours: Start time, end time, timezone, holiday list

Transfer Numbers: Default support, backup numbers

Lead Scoring: Adjust weights for each factor

Team Members: Add sales/service agents, assign permissions

TECH STACK SPECIFICATION
Frontend
Technology	Version	Purpose
React	19.x	UI framework
TypeScript	5.x	Type safety
Next.js	16.x	App router, API routes
ShadCN UI	Latest	Component library
Tailwind CSS	4.x	Styling (with provided tokens)
Recharts	Latest	Charts & analytics
FullCalendar	Latest	Calendar integration
Backend
Technology	Purpose
FastAPI	New backend (replacing direct Python scripts)
MongoDB	CRM database (customers, leads, calls, notes)
SQLite	Keep for local/dev, but migrate to MongoDB for production
Voice Stack
Component	Provider	Version/Model
Voice Platform	LiveKit	Latest SDK
STT	Deepgram	Nova 3
LLM (English)	OpenAI	GPT-4o or GPT-5 class
LLM (Hindi/Malayalam)	Groq	Llama 4 Scout 17B
TTS (English)	OpenAI	TTS HD (alloy/echo)
TTS (Hindi/Malayalam)	Sarvam	bulbul:v2 (anushka)
Database Schema (MongoDB)
Collection: customers
javascript
{
  _id: ObjectId,
  name: String,
  phone: String (indexed),
  alternate_phone: String,
  email: String,
  address: String,
  district: String,
  state: String,
  farm_size_acres: Number,
  crop_types: [String],
  language_preference: "en"|"hi"|"ml",
  created_at: Date,
  updated_at: Date,
  lead_score: Number,
  status: "new"|"contacted"|"qualified"|"converted"|"lost",
  assigned_to: String (sales person ID)
}
Collection: calls
javascript
{
  _id: ObjectId,
  call_id: String (unique),
  customer_id: ObjectId (ref: customers),
  phone_number: String,
  direction: "inbound"|"outbound",
  persona: "receptionist"|"sales"|"service"|"appointment"|"collections",
  campaign_id: ObjectId (ref: campaigns, optional),
  duration_seconds: Number,
  status: "initiated"|"answered"|"completed"|"failed"|"transferred",
  language_used: String,
  summary: String,
  transcript: String,
  recording_url: String,
  transferred_to: String,
  created_at: Date
}
Collection: leads
javascript
{
  _id: ObjectId,
  customer_id: ObjectId (ref: customers),
  interest: String,
  product_model: String,
  budget_min: Number,
  budget_max: Number,
  urgency: "high"|"medium"|"low",
  timeline: String,
  lead_score: Number,
  status: "new"|"contacted"|"qualified"|"converted"|"lost",
  notes: String,
  created_at: Date,
  updated_at: Date
}
Collection: appointments
javascript
{
  _id: ObjectId,
  customer_id: ObjectId (ref: customers),
  type: "demo"|"service"|"callback"|"showroom"|"video_consult",
  product_model: String,
  date: Date,
  time_slot: String,
  duration_minutes: Number,
  status: "pending"|"confirmed"|"completed"|"cancelled",
  assigned_to: String,
  notes: String,
  created_at: Date,
  updated_at: Date
}
Collection: campaigns
javascript
{
  _id: ObjectId,
  name: String,
  type: "service_reminder"|"follow_up"|"promotional"|"payment_followup",
  prompt: String,
  target_numbers: [String],
  total_target: Number,
  completed: Number,
  failed: Number,
  schedule_start: Date,
  schedule_end: Date,
  daily_limit: Number,
  status: "draft"|"active"|"paused"|"completed",
  created_at: Date,
  created_by: String
}
API ENDPOINTS REQUIRED
Voice Agent APIs
Method	Endpoint	Purpose
POST	/api/voice/inbound/start	Start inbound session
POST	/api/voice/outbound/dispatch	Dispatch outbound call
POST	/api/voice/transfer	Transfer call to human
POST	/api/voice/book-service	Book service appointment
GET	/api/voice/call-status/:id	Get call status
CRM APIs
Method	Endpoint	Purpose
GET	/api/crm/customers	List customers (paginated, search)
GET	/api/crm/customers/:id	Get customer details
POST	/api/crm/customers	Create customer
PUT	/api/crm/customers/:id	Update customer
GET	/api/crm/leads	List leads (filter by status)
PATCH	/api/crm/leads/:id/status	Update lead status
GET	/api/crm/calls	List calls (filter by date, direction)
GET	/api/crm/calls/:id/recording	Get recording URL
Calendar APIs
Method	Endpoint	Purpose
GET	/api/calendar/appointments	Get appointments (date range)
POST	/api/calendar/appointments	Create appointment
PUT	/api/calendar/appointments/:id	Update appointment
DELETE	/api/calendar/appointments/:id	Delete appointment
POST	/api/calendar/sync/google	Sync to Google Calendar
Analytics APIs
Method	Endpoint	Purpose
GET	/api/analytics/calls/summary	Call metrics summary
GET	/api/analytics/leads/funnel	Lead conversion funnel
GET	/api/analytics/sales/revenue	Revenue potential
GET	/api/analytics/agent/performance	Agent metrics
Campaign APIs
Method	Endpoint	Purpose
GET	/api/campaigns	List campaigns
POST	/api/campaigns	Create campaign
POST	/api/campaigns/:id/start	Start campaign
POST	/api/campaigns/:id/pause	Pause campaign
DELETE	/api/campaigns/:id	Delete campaign
GET	/api/campaigns/:id/stats	Campaign statistics
NEW AGENT PROMPTS (System Instructions)
AI Receptionist (Inbound) Prompt
text
You are AgriForge AI Receptionist — first point of contact for agricultural machinery customers.

Rules:
1. Start: "Welcome to AgriForge. Thank you for calling."
2. Ask language preference (English/Hindi/Malayalam) — LOCK it.
3. Identify customer need: Product Inquiry | Service Booking | Financing | Complaint
4. If product inquiry → gather: budget, timeline, model interest
5. If service booking → gather: model, issue, preferred date
6. If financing → explain EMI options, partner banks
7. If complaint → log details, assure callback within 24 hours
8. Always check if caller is existing customer (lookup by phone)
9. For high-intent customers → transfer to AI Sales Executive

Never:
- Switch language without permission
- Make promises you can't keep
- Transfer without informing customer
- End call without offering help
AI Sales Executive (Outbound) Prompt
text
You are AgriForge AI Sales Executive — proactive sales calls.

Before calling:
1. Look up customer from CRM
2. Know their last interaction
3. Know their interest/purchase stage

Call flow:
1. Greet by name if known
2. State reason: "Following up on your inquiry about [product]"
3. Ask if still interested
4. Address objections (price, financing, delivery, brand comparison)
5. If interested → book demo appointment
6. If price concern → explain EMI, down payment options
7. If competitor mention → highlight AgriForge advantages (service network, warranty, local support)
8. Always end with clear next step

Objection handling:
- "Too expensive" → Offer financing, lower variant, special offer
- "Need to think" → Book follow-up, ask what specifically needs thinking
- "Already bought elsewhere" → Note reason, log as lost
- "Not right time" → Schedule follow-up based on their timeline
AGRIFORGE ADMIN INTEGRATION (STAGE 4)
After agent is stable, integrate into existing AgriForge admin panel:

Navigation Structure
text
Admin Panel
├── Dashboard (existing)
├── Products (existing)
├── Orders (existing)
├── Customers (existing)
├── Voice AI (NEW)
│   ├── Overview
│   ├── Live Calls
│   ├── Leads
│   ├── Campaigns
│   ├── Calendar
│   ├── Analytics
│   ├── Recordings
│   └── Settings
Integration Requirements
Single login session (use existing auth)

Shared customer database (link Voice AI customers with store customers)

Order tracking (if customer buys, mark lead as "converted")

Product sync (use existing product catalog)

DEPLOYMENT REQUIREMENTS
Environment Variables (.env)
env
# LiveKit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=key
LIVEKIT_API_SECRET=secret

# Deepgram
DEEPGRAM_API_KEY=key
DEEPGRAM_STT_MODEL=nova-3

# OpenAI
OPENAI_API_KEY=key
OPENAI_LLM_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1-hd
OPENAI_TTS_VOICE=alloy

# Groq
GROQ_API_KEY=key
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# Sarvam
SARVAM_API_KEY=key
SARVAM_MODEL=bulbul:v2
SARVAM_VOICE=anushka

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=agriforge_voice

# SIP (Vobiz)
VOBIZ_SIP_DOMAIN=your-domain.sip.vobiz.ai
VOBIZ_USERNAME=username
VOBIZ_PASSWORD=password
VOBIZ_OUTBOUND_NUMBER=+91XXXXXXXXXX
MANAS_AI_PHONE_NUMBER=+91XXXXXXXXXX

# AgriForge Integration
AGRIFORGE_API_URL=https://api.agriforge.com
AGRIAGE_API_KEY=key
Docker Compose (Updated)
yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  voice-agent:
    build: .
    env_file: .env
    depends_on:
      - mongodb
    volumes:
      - ./data:/app/data
      - ./prompts:/app/prompts
    command: python agent.py start

  dashboard:
    build: ./dashboard
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      - mongodb
      - voice-agent

  api:
    build: ./api
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - mongodb
SUCCESS CRITERIA
Must Have Before Proceeding to Stage 2:
Language selection works reliably (user chooses, AI locks)

No unexpected language switching

Audio quality: clear, no cuts, natural pacing

Lead scoring calculates correctly

CRM stores all call data

Calendar events created from AI actions

Dashboard loads with real data

No token truncation or response clipping

Must Have Before Stage 4 (AgriForge Integration):
All 5 AI personas working

MongoDB fully operational

All API endpoints documented

Campaign system working

Recording playback functional

Analytics showing correct metrics

WHAT TO OUTPUT
Generate complete, production-ready code for:

Phase 1 (Highest Priority)
New agent.py with:

Language selection + locking

Persona-based system prompts

MongoDB integration

Lead scoring logic

New tools.py with:

Updated function tools

CRM database operations

Calendar event creation

Lead scoring

New database.py (MongoDB version):

Connection manager

CRUD operations for customers, leads, calls, appointments

FastAPI backend (main.py):

All API endpoints listed above

MongoDB integration

Authentication middleware

Dashboard components (with ShadCN + provided CSS):

Executive dashboard

Call center dashboard

CRM dashboard with kanban

Calendar with FullCalendar

Analytics with Recharts

Recordings with audio player

Campaign manager

Settings panel

Migration script (migrate_to_mongodb.py):

Convert existing SQLite data to MongoDB

OUTPUT FORMAT
Provide code organized by file with clear comments:

python
# filename: agent.py
# purpose: Main AI agent with language locking and personas
# dependencies: livekit, mongodb, openai, groq, sarvam, deepgram

[code here]
Include all necessary:

Imports

Type definitions

Error handling

Logging

Configuration loading

Do NOT include:

Placeholders or TODO comments (make it work)

Partial implementations

Console.log debugging (use proper logging)

Hardcoded credentials

DO include:

Working MongoDB connection

Proper async/await patterns

Environment variable validation

Graceful error handling

Performance optimizations for audio