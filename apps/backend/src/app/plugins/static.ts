import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import * as path from 'path';
import * as fs from 'fs';

export default fp(async (fastify) => {
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fastify.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
  });
});
