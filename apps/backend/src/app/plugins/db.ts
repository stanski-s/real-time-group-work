import fp from 'fastify-plugin';
import { prismaPlugin } from '@slack-clone/database';

export default fp(async (fastify) => {
  fastify.register(prismaPlugin);
});
