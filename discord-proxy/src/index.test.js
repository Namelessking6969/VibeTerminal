import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('Discord forwarding', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('returns 502 when Discord fetch throws a network error', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

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
