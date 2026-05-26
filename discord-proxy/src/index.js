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

    let discordRes;
    try {
      discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch {
      return new Response('Bad Gateway', { status: 502 });
    }

    if (!discordRes.ok) {
      return new Response('Bad Gateway', { status: 502 });
    }

    return new Response(null, { status: 204 });
  },
};
