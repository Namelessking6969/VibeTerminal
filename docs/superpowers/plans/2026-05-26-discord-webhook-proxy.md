# Discord Webhook Proxy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy a Cloudflare Worker that proxies bug report messages to Discord, validating a secret key and keeping the real webhook URL server-side.

**Architecture:** A single Cloudflare Worker script receives POST requests from the frontend, checks an `X-Secret-Key` header against an environment secret, then forwards the request body to Discord. Secrets are stored in Cloudflare's encrypted environment — never in code. A Cloudflare rate limiting rule (configured in the dashboard) caps requests at 10/min per IP.

**Tech Stack:** Cloudflare Workers (JS), Wrangler CLI v3, Vitest + @cloudflare/vitest-pool-workers

---

## File Map

| File | Purpose |
|---|---|
| `discord-proxy/package.json` | npm scripts and dev dependencies |
| `discord-proxy/wrangler.toml` | Worker name, entry point, compatibility date |
| `discord-proxy/vitest.config.js` | Vitest config pointing at wrangler.toml |
| `discord-proxy/src/index.js` | Worker handler — validation + forwarding |
| `discord-proxy/src/index.test.js` | Vitest tests for all response paths |

---

### Task 1: Bootstrap the Worker project

**Files:**
- Create: `discord-proxy/package.json`
- Create: `discord-proxy/wrangler.toml`
- Create: `discord-proxy/vitest.config.js`

- [ ] **Step 1: Create the discord-proxy directory and package.json**

```bash
mkdir -p discord-proxy/src
```

Create `discord-proxy/package.json`:
```json
{
  "name": "discord-webhook-proxy",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/vitest-pool-workers": "^0.5.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create wrangler.toml**

Create `discord-proxy/wrangler.toml`:
```toml
name = "discord-webhook-proxy"
main = "src/index.js"
compatibility_date = "2024-01-01"
```

- [ ] **Step 3: Create vitest.config.js**

Create `discord-proxy/vitest.config.js`:
```js
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
```

- [ ] **Step 4: Install dependencies**

```bash
cd discord-proxy && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Commit**

```bash
git add discord-proxy/package.json discord-proxy/wrangler.toml discord-proxy/vitest.config.js discord-proxy/package-lock.json
git commit -m "feat: scaffold discord webhook proxy worker"
```

---

### Task 2: Implement secret key validation

**Files:**
- Create: `discord-proxy/src/index.js`
- Create: `discord-proxy/src/index.test.js`

- [ ] **Step 1: Create a stub worker so the test file can import it**

Create `discord-proxy/src/index.js`:
```js
export default {
  async fetch(request, env) {
    return new Response('Not implemented', { status: 500 });
  },
};
```

- [ ] **Step 2: Write failing tests for secret key validation**

Create `discord-proxy/src/index.test.js`:
```js
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from './index.js';

const VALID_ENV = {
  SECRET_KEY: 'test-secret-key-abc123',
  DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/fake/url',
};

function makeRequest(headers = {}, body = { content: 'test bug report' }) {
  return new Request('http://localhost/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('secret key validation', () => {
  it('returns 403 when X-Secret-Key header is missing', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(makeRequest(), VALID_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(403);
  });

  it('returns 403 when X-Secret-Key is wrong', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(makeRequest({ 'X-Secret-Key': 'wrong-key' }), VALID_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd discord-proxy && npm test
```

Expected: 2 tests FAIL (worker returns 500, not 403).

- [ ] **Step 4: Implement secret key validation in the worker**

Replace `discord-proxy/src/index.js`:
```js
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const key = request.headers.get('X-Secret-Key');
    if (!key || key !== env.SECRET_KEY) {
      return new Response('Forbidden', { status: 403 });
    }

    return new Response('Not implemented', { status: 500 });
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd discord-proxy && npm test
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add discord-proxy/src/index.js discord-proxy/src/index.test.js
git commit -m "feat: validate X-Secret-Key in discord proxy worker"
```

---

### Task 3: Implement Discord forwarding

**Files:**
- Modify: `discord-proxy/src/index.js`
- Modify: `discord-proxy/src/index.test.js`

- [ ] **Step 1: Write failing tests for Discord forwarding**

Append to the `describe` blocks in `discord-proxy/src/index.test.js`:
```js
describe('Discord forwarding', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('forwards the request body to Discord and returns 204 on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      makeRequest({ 'X-Secret-Key': VALID_ENV.SECRET_KEY }),
      VALID_ENV,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(204);
    expect(fetch).toHaveBeenCalledWith(
      VALID_ENV.DISCORD_WEBHOOK_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ content: 'test bug report' }),
      }),
    );
  });

  it('returns 502 when Discord responds with an error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('Bad request', { status: 400 }));

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      makeRequest({ 'X-Secret-Key': VALID_ENV.SECRET_KEY }),
      VALID_ENV,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
cd discord-proxy && npm test
```

Expected: 2 existing tests PASS, 2 new tests FAIL (worker returns 500).

- [ ] **Step 3: Implement Discord forwarding**

Replace `discord-proxy/src/index.js`:
```js
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const key = request.headers.get('X-Secret-Key');
    if (!key || key !== env.SECRET_KEY) {
      return new Response('Forbidden', { status: 403 });
    }

    let body;
    try {
      body = await request.text();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!discordRes.ok) {
      return new Response('Bad Gateway', { status: 502 });
    }

    return new Response(null, { status: 204 });
  },
};
```

- [ ] **Step 4: Run all tests to verify they all pass**

```bash
cd discord-proxy && npm test
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add discord-proxy/src/index.js discord-proxy/src/index.test.js
git commit -m "feat: forward validated requests to Discord webhook"
```

---

### Task 4: Deploy to Cloudflare and configure secrets

This task has no automated tests — it's a deployment and configuration step.

- [ ] **Step 1: Log in to Cloudflare via Wrangler**

```bash
cd discord-proxy && npx wrangler login
```

Expected: Browser opens, you authenticate, terminal shows "Successfully logged in."

- [ ] **Step 2: Deploy the Worker**

```bash
cd discord-proxy && npm run deploy
```

Expected output includes:
```
Deployed discord-webhook-proxy
  https://discord-webhook-proxy.<your-subdomain>.workers.dev
```

Copy this URL — it's your new proxy endpoint.

- [ ] **Step 3: Set the SECRET_KEY secret**

Generate a strong random key (32 hex chars):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value somewhere safe (e.g. your password manager), then:
```bash
cd discord-proxy && npx wrangler secret put SECRET_KEY
```

Paste the generated value when prompted.

- [ ] **Step 4: Set the DISCORD_WEBHOOK_URL secret**

Go to your Discord server → Server Settings → Integrations → Webhooks → **Create a new webhook** (the old one is compromised — delete it first).

Copy the new webhook URL, then:
```bash
cd discord-proxy && npx wrangler secret put DISCORD_WEBHOOK_URL
```

Paste the new Discord webhook URL when prompted.

- [ ] **Step 5: Verify secrets are set**

```bash
cd discord-proxy && npx wrangler secret list
```

Expected:
```
SECRET_KEY
DISCORD_WEBHOOK_URL
```

- [ ] **Step 6: Smoke test the deployed Worker**

Test that a missing key returns 403:
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST https://discord-webhook-proxy.<your-subdomain>.workers.dev/report \
  -H "Content-Type: application/json" \
  -d '{"content":"test"}'
```
Expected: `403`

Test that the correct key forwards to Discord:
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST https://discord-webhook-proxy.<your-subdomain>.workers.dev/report \
  -H "Content-Type: application/json" \
  -H "X-Secret-Key: <your-secret-key>" \
  -d '{"content":"smoke test from curl"}'
```
Expected: `204` and a message appears in your Discord channel.

---

### Task 5: Configure rate limiting in Cloudflare Dashboard

This is a dashboard-only step — no code changes.

- [ ] **Step 1: Open the rate limiting configuration**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select your account
3. Click **Workers & Pages** in the left sidebar
4. Click **discord-webhook-proxy**
5. Click the **Settings** tab
6. Scroll to **Rate Limiting** (or find it under **Security**)

- [ ] **Step 2: Create a rate limiting rule**

Click **Add Rule** and set:

| Field | Value |
|---|---|
| Name | `Limit bug reports per IP` |
| If incoming requests match | `Hostname equals discord-webhook-proxy.<your-subdomain>.workers.dev` |
| Requests | `10` |
| Period | `1 minute` |
| Action | `Block` |
| Response code | `429` |

Click **Save**.

- [ ] **Step 3: Verify the rate limit rule is active**

The rule should show as **Active** in the dashboard. No further steps needed — Cloudflare enforces this at the edge before the Worker runs.

---

### Task 6: Update your frontend app

Replace the direct Discord webhook call with a call to your Worker.

- [ ] **Step 1: Store the secret key in your frontend environment**

In your frontend app's `.env` file (or equivalent):
```
VITE_BUG_REPORT_KEY=<your-secret-key-from-task-4-step-3>
```

If your app uses a different env prefix (e.g. `REACT_APP_`, `NEXT_PUBLIC_`), use that instead of `VITE_`.

Make sure `.env` is in `.gitignore` — never commit this file.

- [ ] **Step 2: Find and replace the Discord webhook fetch call**

Find the existing code that looks something like:
```js
await fetch('https://discord.com/api/webhooks/...', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: message }),
});
```

Replace it with:
```js
await fetch('https://discord-webhook-proxy.<your-subdomain>.workers.dev/report', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Secret-Key': import.meta.env.VITE_BUG_REPORT_KEY,
  },
  body: JSON.stringify({ content: message }),
});
```

Replace `import.meta.env.VITE_BUG_REPORT_KEY` with the correct env var syntax for your framework:
- Vite: `import.meta.env.VITE_BUG_REPORT_KEY`
- Create React App: `process.env.REACT_APP_BUG_REPORT_KEY`
- Next.js: `process.env.NEXT_PUBLIC_BUG_REPORT_KEY`

- [ ] **Step 3: Test the bug report flow end-to-end**

Trigger a bug report in your app. Verify the message appears in your Discord channel.

- [ ] **Step 4: Commit the frontend change**

```bash
git add <path-to-changed-frontend-file>
git commit -m "feat: route bug reports through Cloudflare Worker proxy"
```
