# Backend Configuration & Render Deployment Guide

This directory contains the Node.js/Express backend codebase for the Software Company Website.

## Environment Files

Two env files, both git-ignored (copy the keys from `.env.example`). `src/config/env.js` picks one by `NODE_ENV`:

| File | Loaded when | Purpose |
|---|---|---|
| `.env.development` | `NODE_ENV` is not `production` (e.g. `npm run dev`) | Local development |
| `.env.production` | `NODE_ENV=production` | Production / `docker-compose` |

On Render, set the keys in the dashboard (including `NODE_ENV=production`); dashboard values override the file.

## Render Deployment Settings

When deploying this backend service on Render, use the following configuration details:

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`
- **Port**: Do not define a hardcoded production port. Render automatically assigns a port via the `PORT` environment variable, which our server reads dynamically using `const PORT = process.env.PORT || 5000;`.
- **IP Binding**: The server binds to host `0.0.0.0` (via `app.listen(PORT, "0.0.0.0", ...)`) to ensure Render's routing layer can successfully forward external traffic to the container.

---

## Important: Free Render Inactivity Sleep & Cold Starts

> [!WARNING]
> **Free Tier Sleep Behavior:**
> Render's Free Web Service tier automatically spins down (goes to sleep) after approximately 15 minutes of inactivity. 
> 
> - When a new request arrives after the service has spun down, Render will spin it back up. This causes a **cold start** delay (usually taking between 50 seconds and a few minutes) for the first API request.
> - **Health Check Path /health:** The `/health` endpoint is used by Render's load balancer to monitor deployments and initial startup health. However, configuring this health check path **does not prevent** the Free-tier service from spinning down due to inactivity.
> - **Self-Pinging Policy:** Do **NOT** configure automated cron jobs, external uptime monitors, or self-pinging mechanisms solely to keep a Free-tier Render service active. Such workarounds violate Render's Terms of Service and can result in rate-limiting or account suspension.
> - **Continuous Availability:** If your production API must remain continuously available with zero cold starts, you **must upgrade to a paid Render Web Service instance** (e.g., Starter tier or higher), which does not spin down due to inactivity.
