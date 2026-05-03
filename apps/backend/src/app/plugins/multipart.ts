import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default fp(async (fastify) => {
  fastify.register(multipart, {
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: 1,
    }
  });

  fastify.addHook('onError', async (request, reply, error) => {
    if (error.message === 'Request file too large') {
      return reply.code(413).send({ error: `Plik za duży. Maksymalny rozmiar to ${MAX_FILE_SIZE / 1024 / 1024} MB.` });
    }
  });
});
