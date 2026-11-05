# CodePulse

LeetCode analytics and personalized practice platform.

## Repository branches

- `backend` contains the API, `backend/.env.example`, README, and LeetCode sync extension.
- `frontend` contains the web client, README, and LeetCode sync extension.
- The branches are separate snapshots. Check out the branch you want to work on.

## Stack

- Frontend: React, JavaScript, React Router, Tailwind CSS, Recharts, Axios
- Backend: Node.js, Express, JWT, bcrypt
- Data: MongoDB via Mongoose models
- Cache: Redis (optional until configured)
- Future ML: Python, FastAPI, scikit-learn

## Run the API

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm start
```

Set `MONGODB_URI`, `JWT_SECRET`, and optionally `REDIS_URL` in `.env`. To have `npm start` resume a paused MongoDB Atlas cluster, create an Atlas Administration API key with the required project permissions and set `MONGODB_ATLAS_PUBLIC_KEY`, `MONGODB_ATLAS_PRIVATE_KEY`, `MONGODB_ATLAS_PROJECT_ID`, and `MONGODB_ATLAS_CLUSTER_NAME` in `backend/.env`. The app checks whether the cluster is paused and requests a resume before connecting; startup waits for Atlas to become reachable. Keep the private key only in `.env`, never commit or share it. Without these four Atlas settings, startup connects to `MONGODB_URI` as before. The LeetCode importer intentionally requires a permitted provider to be configured; it does not scrape undocumented endpoints.

After the initial full LeetCode sync, the dashboard checks for newly accepted problems on startup, when the tab becomes active, and every 15 minutes. Syncs merge new problems into the saved history. Automatic checks use LeetCode's latest 20 accepted submissions; run the extension's full sync if more submissions may have been missed.

For a full-list refresh every 2 days, load the `leetcode-extension` folder as an unpacked Chrome extension, open its popup while signed in to LeetCode, enter the CodePulse API URL and JWT, and select **Save and sync now**. The extension stores its settings locally in Chrome and schedules a full sync every 2 days. Chrome must be running and the LeetCode session must remain signed in; if Chrome was closed when a sync was due, it catches up on the next browser start. If the CodePulse JWT expires, update it in the extension popup.

## Email OTP

Configure the SMTP values in `backend/.env` from `.env.example`. For Gmail, use an App Password instead of your normal account password. Start the API, then use:

```http
POST /api/otp/request
Content-Type: application/json

{ "email": "user@example.com", "purpose": "login" }
```

The user receives the six-digit code by email. Verify it with:

```http
POST /api/otp/verify
Content-Type: application/json

{ "email": "user@example.com", "code": "123456", "purpose": "login" }
```

Codes expire after 10 minutes by default, are limited to five attempts, and only their bcrypt hashes are stored.

## Run the current frontend

The React/Vite product surface runs with:

```powershell
npm install
npm run dev
```
