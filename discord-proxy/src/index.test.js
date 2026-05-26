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

describe('method handling', () => {
  it('returns 204 for OPTIONS without requiring auth', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/report', { method: 'OPTIONS' }),
      VALID_ENV,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(204);
  });

  it('returns 405 for GET requests', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/report', { method: 'GET' }),
      VALID_ENV,
      ctx,
    );
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(405);
  });
});
