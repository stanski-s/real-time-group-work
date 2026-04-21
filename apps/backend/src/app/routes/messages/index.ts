import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/:channelId', async function (request, reply) {
    const { channelId } = request.params as { channelId: string };
    
    const messages = await fastify.db.message.findMany({
      where: { channelId },
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    });
    
    return { messages };
  });

  fastify.post('/:channelId', async function (request, reply) {
    const { channelId } = request.params as { channelId: string };
    const { content } = request.body as { content: string };
    const user = request.user as any;

    const message = await fastify.db.message.create({
      data: {
        content,
        channelId,
        authorId: user.id,
      },
      include: { author: { select: { id: true, name: true, email: true, image: true } } },
    });

    fastify.io.to(`channel_${channelId}`).emit('new_message', message);

    return { message };
  });
}
