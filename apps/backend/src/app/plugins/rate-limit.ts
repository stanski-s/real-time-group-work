import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    // Globalny fallback - dotyczy wszystkich endpointów bez własnego limitu
    max: 100,
    timeWindow: '1 minute',

    // W testach (IP 127.0.0.1) pomijamy rate limiting, żeby nie psuć testów
    allowList: process.env.NODE_ENV === 'test' ? ['127.0.0.1', '::1', '::ffff:127.0.0.1'] : [],

    // Klucz identyfikujący klienta: jeśli zalogowany - po userId, inaczej - po IP
    keyGenerator: (request) => {
      const user = (request as { user?: { id?: string } }).user;
      return user?.id ?? request.ip;
    },

    // Czytelna odpowiedź 429 zamiast domyślnego JSON
    errorResponseBuilder: (_request, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Za dużo zapytań. Spróbuj ponownie za ${Math.ceil(context.ttl / 1000)} sekund.`,
    }),

    // Dodaje nagłówki RateLimit-* do każdej odpowiedzi (pomocne w debugowaniu)
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
});
