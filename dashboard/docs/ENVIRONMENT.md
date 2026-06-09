# AgriForge — Environment Setup Guide

## Quick Setup (Development)

```bash
# 1. Prerequisites
node --version   # >= 20
python --version  # >= 3.10
npm --version    # >= 9

# 2. Install dependencies
cd dashboard
npm install

# 3. Copy and configure environment
cp .env.example .env

# 4. Run database migrations
python ../scripts/migrate_phase4b.py
python ../scripts/migrate_phase5.py

# 5. Set admin password
node scripts/seed-admin-password.cjs

# 6. Start dev server
npm run dev

# 7. Open http://localhost:3000/login
#    Email: admin@agriforge.in
#    Password: AgriForge@2026
```

## Environment Variables

Create a `.env` file in the `dashboard/` directory. Below is the complete reference.

### LiveKit Cloud (Required)

```
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Get these from your LiveKit Cloud project dashboard → Settings → Keys.

### AI Model Keys (Required)

```
# Groq for LLM (Fast Inference)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# Deepgram for STT (Speech-to-Text)
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPGRAM_STT_MODEL=nova-2
DEEPGRAM_STT_LANGUAGE=en

# Sarvam AI for TTS (Indian Languages)
SARVAM_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SARVAM_VOICE=anushka
SARVAM_LANGUAGE=en-IN
SARVAM_MODEL=bulbul:v2

# Cartesia for TTS (Ultra-fast, Optional)
CARTESIA_API_KEY=your_cartesia_key
CARTESIA_TTS_MODEL=sonic-english
CARTESIA_TTS_VOICE=f786b574-daa5-4673-aa0c-cbe3e8534c02

# OpenAI (Optional Fallback)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### TTS & LLM Provider Selection

```
TTS_PROVIDER=sarvam    # Options: sarvam, cartesia, openai
LLM_PROVIDER=groq      # Options: groq, openai
```

### Vobiz SIP Trunk (Required for Calling)

```
VOBIZ_SIP_DOMAIN=xxxxxxxx.sip.vobiz.ai
VOBIZ_USERNAME=Stillworks-agent
VOBIZ_PASSWORD=xxxxxxxxxxxx
VOBIZ_OUTBOUND_NUMBER=+91XXXXXXXXXX
VOBIZ_SIP_TRUNK_ID=ST_xxxxxxxxxxxx
OUTBOUND_TRUNK_ID=ST_xxxxxxxxxxxx
```

Get these from your Vobiz dashboard → SIP Trunk settings.

### Inbound Configuration

```
MANAS_AI_PHONE_NUMBER=+91XXXXXXXXXX
INBOUND_TRUNK_ID=ST_xxxxxxxxxxxx
```

Run `python ../setup_inbound_trunk.py` to create the inbound trunk.

### Call Transfer

```
DEFAULT_TRANSFER_NUMBER=+919999999999
MANAS_SUPPORT_NUMBER_1=+919999999999
MANAS_SUPPORT_NUMBER_2=+919999999999
```

### Database

```
DATABASE_PATH=../data/manas_group.db
DB_BACKEND=sqlite           # or mongodb
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=agriforge_voice
```

- `DATABASE_PATH`: Path relative to `dashboard/` directory
- `DB_BACKEND`: `sqlite` (default) or `mongodb`
- For MongoDB, also set `MONGODB_URI` and `MONGODB_DATABASE`

### Business Info

```
MANAS_EMAIL=mail@manasgroupindia.in
MANAS_ADDRESS=Vellapara, Chithali post, Palakkad Dist., Kerala
```

### Outbound Call Limits

```
MAX_OUTBOUND_CALLS_PER_HOUR=50
OUTBOUND_CALL_WINDOW_START=09:00
OUTBOUND_CALL_WINDOW_END=18:00
```

### Language Defaults

```
DEFAULT_OUTBOUND_LANGUAGE=ml    # ml = Malayalam, en = English, hi = Hindi
```

## Database Setup

### SQLite (Default)

No additional setup needed. The database file is created automatically at the path specified by `DATABASE_PATH`.

### MongoDB (Optional)

1. Install and start MongoDB:
   ```bash
   # Docker
   docker run -d -p 27017:27017 --name agriforge-mongo mongo:7

   # Or local install
   brew install mongodb-community  # macOS
   sudo apt install mongodb        # Ubuntu
   ```

2. Set in `.env`:
   ```
   DB_BACKEND=mongodb
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=agriforge_voice
   ```

3. Run migration:
   ```bash
   python ../database/migrate.py
   ```

4. The dashboard reads from whichever backend is active. You can switch instantly by changing `DB_BACKEND`.

## LiveKit Webhook Setup

1. Go to your LiveKit Cloud project dashboard
2. Navigate to Settings → Webhooks
3. Add a new webhook endpoint:
   - **URL**: `https://<your-domain>/api/webhooks/livekit`
   - **Events**: Select `room_started`, `room_finished`, `participant_joined`, `participant_left`
4. The webhook handler automatically verifies HMAC-SHA256 signatures using your `LIVEKIT_API_SECRET`

## Verification Checklist

After setup, verify each component:

```bash
# 1. Dashboard loads
curl -s http://localhost:3000/ | head -20

# 2. Login works
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agriforge.in","password":"AgriForge@2026"}' \
  -c /tmp/cookies.txt | python -m json.tool

# 3. API returns data
curl -s http://localhost:3000/api/stats -b /tmp/cookies.txt | python -m json.tool

# 4. Operations metrics
curl -s http://localhost:3000/api/operations -b /tmp/cookies.txt | python -m json.tool

# 5. Agent health
curl -s http://localhost:3000/api/agent-health -b /tmp/cookies.txt | python -m json.tool

# 6. Database has expected tables
sqlite3 ../data/manas_group.db ".tables"
```

## Troubleshooting

### "LiveKit connection failed"
- Verify `LIVEKIT_URL` starts with `wss://`
- Check `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are correct
- Ensure network allows outbound WebSocket connections

### "Login not working"
- Verify admin user exists: `sqlite3 ../data/manas_group.db "SELECT * FROM users"`
- Re-run password seed: `node scripts/seed-admin-password.cjs`
- Check that `password_hash` is set (not NULL)

### "Database errors"
- Verify `DATABASE_PATH` is correct relative to `dashboard/`
- Run migrations: `python ../scripts/migrate_phase5.py`
- Check file permissions on the `.db` file

### "npm run build fails"
- Ensure Node.js >= 20
- Delete `node_modules` and `.next`, then `npm install && npm run build`
- Check TypeScript version: `npx tsc --version` (should be ^5)

### "npm run dev starts but pages show errors"
- Ensure `.env` exists with all required values
- Check that database migrations have been applied
- Look at the terminal for TypeScript/server errors
