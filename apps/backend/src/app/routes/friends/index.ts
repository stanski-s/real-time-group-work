import { FastifyInstance } from 'fastify';

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string', nullable: true },
    email: { type: 'string' },
    image: { type: 'string', nullable: true }
  }
};

const friendRequestSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    senderId: { type: 'string' },
    receiverId: { type: 'string' },
    status: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    sender: userSchema,
    receiver: userSchema
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  // 1. GET / - Get all friends of the current user
  fastify.get('/', {
    schema: {
      tags: ['Friends'],
      summary: 'Get all friends of the current user',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            friends: { type: 'array', items: userSchema }
          }
        }
      }
    }
  }, async function (request) {
    const userId = request.user.id;
    
    const friendships = await fastify.db.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    const friends = friendships.map(f => f.friend);
    return { friends };
  });

  // 2. GET /requests - Get all sent and received friend requests
  fastify.get('/requests', {
    schema: {
      tags: ['Friends'],
      summary: 'Get all sent and received friend requests',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            requests: { type: 'array', items: friendRequestSchema }
          }
        }
      }
    }
  }, async function (request) {
    const userId = request.user.id;

    const requests = await fastify.db.friendRequest.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { requests };
  });

  // 3. POST /request - Send a friend request
  fastify.post('/request', {
    schema: {
      tags: ['Friends'],
      summary: 'Send a friend request by email',
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            request: friendRequestSchema
          }
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { email } = request.body as { email: string };
    const userId = request.user.id;

    const receiver = await fastify.db.user.findUnique({
      where: { email }
    });

    if (!receiver) {
      return reply.code(404).send({ error: 'Użytkownik o podanym adresie e-mail nie istnieje' });
    }

    if (receiver.id === userId) {
      return reply.code(400).send({ error: 'Nie możesz wysłać zaproszenia do samego siebie' });
    }

    // Sprawdź czy są już znajomymi
    const existingFriendship = await fastify.db.friendship.findFirst({
      where: {
        userId,
        friendId: receiver.id
      }
    });

    if (existingFriendship) {
      return reply.code(400).send({ error: 'Jesteście już znajomymi' });
    }

    // Sprawdź czy zaproszenie już istnieje
    const existingRequest = await fastify.db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: receiver.id },
          { senderId: receiver.id, receiverId: userId }
        ]
      }
    });

    if (existingRequest) {
      if (existingRequest.senderId === userId) {
        return reply.code(400).send({ error: 'Zaproszenie zostało już wysłane' });
      } else {
        return reply.code(400).send({ error: 'Ten użytkownik wysłał już zaproszenie do Ciebie' });
      }
    }

    const newRequest = await fastify.db.friendRequest.create({
      data: {
        senderId: userId,
        receiverId: receiver.id,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, image: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    // Emit live WS event to receiver
    if (fastify.io) {
      fastify.io.to(`user_${receiver.id}`).emit('friend_request_received', newRequest);
    }

    return reply.code(201).send({ request: newRequest });
  });

  // 4. POST /request/:id/respond - Accept or decline a friend request
  fastify.post('/request/:id/respond', {
    schema: {
      tags: ['Friends'],
      summary: 'Respond to a friend request (Accept/Decline)',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      body: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['ACCEPT', 'DECLINE'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } }
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { id } = request.params as { id: string };
    const { action } = request.body as { action: 'ACCEPT' | 'DECLINE' };
    const userId = request.user.id;

    const friendRequest = await fastify.db.friendRequest.findUnique({
      where: { id }
    });

    if (!friendRequest) {
      return reply.code(404).send({ error: 'Nie znaleziono zaproszenia' });
    }

    if (friendRequest.receiverId !== userId) {
      return reply.code(403).send({ error: 'Nie masz uprawnień do modyfikacji tego zaproszenia' });
    }

    if (action === 'ACCEPT') {
      // Transactional accept friendship
      await fastify.db.$transaction([
        fastify.db.friendship.create({
          data: {
            userId: friendRequest.senderId,
            friendId: friendRequest.receiverId
          }
        }),
        fastify.db.friendship.create({
          data: {
            userId: friendRequest.receiverId,
            friendId: friendRequest.senderId
          }
        }),
        fastify.db.friendRequest.delete({
          where: { id }
        })
      ]);

      // Emit WS event to both users
      if (fastify.io) {
        const payload = {
          senderId: friendRequest.senderId,
          receiverId: friendRequest.receiverId
        };
        fastify.io.to(`user_${friendRequest.senderId}`).emit('friend_request_accepted', payload);
        fastify.io.to(`user_${friendRequest.receiverId}`).emit('friend_request_accepted', payload);
      }

      return { success: true };
    } else {
      // Decline: just delete request
      await fastify.db.friendRequest.delete({
        where: { id }
      });

      if (fastify.io) {
        fastify.io.to(`user_${friendRequest.senderId}`).emit('friend_request_declined', { id });
      }

      return { success: true };
    }
  });

  // 5. DELETE /:id - Remove friendship
  fastify.delete('/:id', {
    schema: {
      tags: ['Friends'],
      summary: 'Remove a friend from your list',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' }
          }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { id: friendId } = request.params as { id: string };
    const userId = request.user.id;

    const friendship = await fastify.db.friendship.findFirst({
      where: {
        userId,
        friendId
      }
    });

    if (!friendship) {
      return reply.code(404).send({ error: 'Nie jesteście znajomymi' });
    }

    // Delete dwukierunkowo in a transaction
    await fastify.db.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    if (fastify.io) {
      fastify.io.to(`user_${userId}`).emit('friendship_removed', { friendId });
      fastify.io.to(`user_${friendId}`).emit('friendship_removed', { friendId: userId });
    }

    return { success: true };
  });
}
