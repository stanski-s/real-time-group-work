import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/:workspaceId/:userId', async function (request, reply) {
    const { workspaceId, userId: otherUserId } = request.params as { workspaceId: string, userId: string };
    const myId = request.user.id;

    const isMember = await fastify.db.member.findFirst({
      where: { workspaceId, userId: myId }
    });
    
    if (!isMember) {
      return reply.code(403).send({ error: 'Brak dostępu do tego Workspace' });
    }

    const messages = await fastify.db.directMessage.findMany({
      where: {
        workspaceId,
        OR: [
          { authorId: myId, receiverId: otherUserId },
          { authorId: otherUserId, receiverId: myId }
        ]
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return { messages: messages.reverse() };
  });

  fastify.post('/:workspaceId/:userId', async function (request, reply) {
    const { workspaceId, userId: otherUserId } = request.params as { workspaceId: string, userId: string };
    const { content } = request.body as { content: string };
    const myId = request.user.id;

    const isMember = await fastify.db.member.findFirst({
      where: { workspaceId, userId: myId }
    });
    
    if (!isMember) {
      return reply.code(403).send({ error: 'Brak dostępu do tego Workspace' });
    }

    const message = await fastify.db.directMessage.create({
      data: {
        content,
        workspaceId,
        authorId: myId,
        receiverId: otherUserId
      },
      include: {
        author: {
          select: { id: true, name: true, image: true }
        }
      }
    });

    const roomKey = [myId, otherUserId].sort().join('_');
    const roomId = `dm_${workspaceId}_${roomKey}`;
    
    fastify.io.to(roomId).emit('new_dm', message);

    return reply.code(201).send({ message });
  });
}
