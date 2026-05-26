# Discord Webhook Proxy — Design Spec

**Date:** 2026-05-26
**Status:** Approved

## Problem

A bug report feature in a frontend app sent messages directly to a Discord webhook URL. Because the URL was embedded in client-side code, it was discoverable via network inspection. A bot found it and sent 100+ spam messages to the Discord channel.

## Goal

Replace the direct webhook call with a Cloudflare Worker proxy that:
- Keeps the Discord webhook URL server-side only
- Validates all incoming requests with a shared secret key
- Rate limits requests to prevent spam floods

## Architecture

```
Frontend App
  POST https://<worker>.workers.dev/report
  Header: X-Secret-Key: <secret>
  Body: { "content": "bug report text" }
        ↓
Cloudflare Worker
  1. Validate X-Secret-Key against SECRET_KEY env secret
  2. Rate limit: 10 requests/minute per IP (Cloudflare rule)
  3. Forward body to DISCORD_WEBHOOK_URL env secret
        ↓
Discord Channel
```

## Components

### Cloudflare Worker Script
- Single JS file deployed to Cloudflare Workers
- Reads `SECRET_KEY` and `DISCORD_WEBHOOK_URL` from environment secrets (never hardcoded)
- Validates the `X-Secret-Key` request header
- Forwards the validated request body to Discord as a webhook POST
- Returns appropriate HTTP status codes on failure

### Environment Secrets (Cloudflare Dashboard)
| Name | Value |
|---|---|
| `SECRET_KEY` | A strong random string you generate (e.g. 32-char hex) |
| `DISCORD_WEBHOOK_URL` | Your real Discord webhook URL |

### Rate Limiting Rule (Cloudflare Dashboard)
- Configured on the Worker route
- Limit: 10 requests per minute per IP
- Action: block (returns 429)

### Frontend Update
- Replace Discord webhook URL with the Worker URL
- Add `X-Secret-Key: <secret>` header to the bug report fetch call
- Secret key can live in a frontend env variable (e.g. `VITE_BUG_REPORT_KEY`)

## Error Handling

| Condition | Response |
|---|---|
| Missing or wrong `X-Secret-Key` | `403 Forbidden` |
| Rate limit exceeded | `429 Too Many Requests` |
| Discord returns an error | `502 Bad Gateway` |
| Unexpected Worker error | `500 Internal Server Error` |
| Success | `204 No Content` |

## Security Properties

- Discord webhook URL is never exposed to clients
- Secret key rotation does not require touching Discord
- Rate limiting provides a backstop even if the Worker URL leaks
- CORS headers restricted to your app's origin (optional hardening)

## Out of Scope

- Authentication of which user sent the report (no login required)
- Storing reports in a database
- Attaching screenshots or files
- Email/SMS alerting
