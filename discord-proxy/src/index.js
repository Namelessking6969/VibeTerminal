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
