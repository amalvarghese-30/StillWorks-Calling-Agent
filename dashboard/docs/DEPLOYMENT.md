# AgriForge — Deployment Guide

## Prerequisites

- **Node.js 20+**
- **Python 3.10+** (for database migrations)
- **npm** (or yarn/pnpm)
- **SQLite 3** (bundled with better-sqlite3)
- **LiveKit Cloud account** with API key/secret
- **Groq API key** (LLM)
- **Sarvam AI API key** (TTS — Indian languages)
- **Deepgram API key** (STT)
- **Vobiz SIP trunk** (for outbound/inbound calling)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in all API keys and credentials
3. Never commit `.env` to version control

## Build & Deploy

### Production Build

```bash
cd dashboard
npm install
npm run build
```

This produces an optimized build in `.next/`. The build compiles:
- All 19 page routes
- All 32 API endpoints
- Proxy middleware (RBAC + security headers)
- Static assets

### Start Production Server

```bash
npm start
```

Runs on `http://localhost:3000` by default. Set `PORT` env var to change.

### Database Setup

```bash
# Run migrations (idempotent — safe to re-run)
python scripts/migrate_phase4b.py
python scripts/migrate_phase5.py

# Seed admin user password
node scripts/seed-admin-password.cjs
```

### Verify Deployment

```bash
# Health check
curl http://localhost:3000/api/operations

# Login test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agriforge.in","password":"AgriForge@2026"}' \
  -c cookies.txt

# Verify session
curl http://localhost:3000/api/auth/session -b cookies.txt
```

## Deployment Platforms

### Vercel

```bash
vercel --prod
```

- Set all environment variables in Vercel dashboard
- DATABASE_PATH must point to a persistent volume or use MongoDB
- SQLite does not work on Vercel (serverless, read-only filesystem)
- Use `DB_BACKEND=mongodb` with a MongoDB Atlas connection string

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install Python for migrations (if using SQLite)
RUN apk add --no-cache python3 py3-pip sqlite

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

# Run migrations
RUN python3 scripts/migrate_phase4b.py
RUN python3 scripts/migrate_phase5.py
RUN node scripts/seed-admin-password.cjs

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t agriforge-dashboard .
docker run -p 3000:3000 --env-file .env agriforge-dashboard
```

### Generic VPS (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs python3 sqlite3

# Clone and deploy
cd /opt
git clone <repo-url> agriforge
cd agriforge/dashboard
npm ci
cp .env.example .env
# Edit .env with production values
python3 scripts/migrate_phase4b.py
python3 scripts/migrate_phase5.py
node scripts/seed-admin-password.cjs
npm run build
npm start
```

Use a process manager for production:
```bash
# PM2
npm install -g pm2
pm2 start npm --name agriforge -- start
pm2 save
pm2 startup
```

### Systemd Service

```ini
# /etc/systemd/system/agriforge.service
[Unit]
Description=AgriForge Dashboard
After=network.target

[Service]
Type=simple
User=agriforge
WorkingDirectory=/opt/agriforge/dashboard
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable agriforge
sudo systemctl start agriforge
```

## LiveKit Webhook Registration

Register the webhook URL in your LiveKit Cloud dashboard:

```
https://<your-domain>/api/webhooks/livekit
```

Events to subscribe:
- `room_started`
- `room_finished`
- `participant_joined`
- `participant_left`

The webhook handler verifies HMAC-SHA256 signatures using your `LIVEKIT_API_SECRET`.

## Campaign Scheduler CRON

Set up a CRON job to check for due campaigns every 5 minutes:

```bash
*/5 * * * * curl -X POST https://<your-domain>/api/scheduler \
  -H "Content-Type: application/json" \
  -H "x-user-role: admin" \
  -d '{"action":"check"}'
```

Or use the session cookie approach for authenticated requests.

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LIVEKIT_URL` | Yes | — | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | Yes | — | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | — | LiveKit API secret (also used for session signing) |
| `GROQ_API_KEY` | Yes | — | Groq LLM API key |
| `DEEPGRAM_API_KEY` | Yes | — | Deepgram STT API key |
| `SARVAM_API_KEY` | Yes* | — | Sarvam TTS API key (*if TTS_PROVIDER=sarvam) |
| `DATABASE_PATH` | No | `../data/manas_group.db` | SQLite database file path |
| `DB_BACKEND` | No | `sqlite` | `sqlite` or `mongodb` |
| `MONGODB_URI` | No* | `mongodb://localhost:27017` | MongoDB connection string (*if DB_BACKEND=mongodb) |
| `LLM_PROVIDER` | No | `groq` | LLM provider name |
| `TTS_PROVIDER` | No | `sarvam` | TTS provider name |
| `VOBIZ_SIP_DOMAIN` | Yes | — | Vobiz SIP domain |
| `VOBIZ_USERNAME` | Yes | — | Vobiz SIP username |
| `VOBIZ_PASSWORD` | Yes | — | Vobiz SIP password |
| `VOBIZ_OUTBOUND_NUMBER` | Yes | — | Outbound caller ID |
| `MAX_OUTBOUND_CALLS_PER_HOUR` | No | `50` | Rate limit |
| `OUTBOUND_CALL_WINDOW_START` | No | `09:00` | Calling hours start |
| `OUTBOUND_CALL_WINDOW_END` | No | `18:00` | Calling hours end |

## Security Checklist

- [ ] Change default admin password (`AgriForge@2026`) after first login
- [ ] Set `NODE_ENV=production` (enables Secure cookies)
- [ ] Ensure `.env` is NOT committed to version control
- [ ] Use HTTPS in production (required for Secure cookies)
- [ ] Register LiveKit webhook URL with correct domain
- [ ] Configure firewall to restrict dashboard to internal network / VPN only
- [ ] Set up database backups (daily cron: `cp data/manas_group.db data/backups/manas_group.$(date +%Y%m%d).db`)
- [ ] Rotate API keys periodically
- [ ] Review `proxy.ts` permission rules for your organization

## Monitoring

- **Operations dashboard**: `/operations` — real-time metrics
- **Logs**: Check `npm start` stdout for errors
- **Audit trail**: All write operations logged to `audit_logs` table
- **Webhook events**: All LiveKit events logged to `webhook_events` table

## Rollback

```bash
# Restore database
cp data/backups/manas_group.<date>.db data/manas_group.db

# Redeploy previous build
git checkout <previous-tag>
npm run build
pm2 restart agriforge
```

## Scaling Notes

- SQLite handles ~100 concurrent read queries comfortably for this use case
- For higher concurrency or serverless deployments, use `DB_BACKEND=mongodb`
- SSE stream scales linearly with connected clients — each client adds one DB query every 3 seconds
- Consider Redis pub/sub for the SSE stream at >50 concurrent dashboard users
- Campaign dispatch is synchronous (200ms delay between calls) — large campaigns can take time
- Move campaign dispatch to a background worker/queue for production at scale
