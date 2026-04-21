import fp from 'fastify-plugin';
import { Server, Socket } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

interface AuthenticatedSocket extends Socket {
  user: { id: string; email: string; name: string };
}

export default fp(async (fastify) => {
  const io = new Server(fastify.server, {
    cors: {
      origin: 'http://localhost:3001',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error'));
      }
      
      const tokenMatch = cookieHeader.match(/(?:^|; )token=([^;]*)/);
      const token = tokenMatch ? tokenMatch[1] : null;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = fastify.jwt.verify(token) as { id: string; email: string; name: string };
      (socket as AuthenticatedSocket).user = decoded;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  const onlineUsers = new Map<string, Set<string>>();

  io.on('connection', (socket: Socket) => {
    fastify.log.info(`Socket connected: ${socket.id}`);
    
    const userId = (socket as AuthenticatedSocket).user.id;

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      socket.broadcast.emit('user_online', userId);
    }
    onlineUsers.get(userId)?.add(socket.id);

    socket.emit('online_users_list', Array.from(onlineUsers.keys()));
    
    socket.on('joinChannel', (channelId: string) => {
      socket.join(`channel_${channelId}`);
      fastify.log.info(`Socket ${socket.id} joined channel_${channelId}`);
    });

    socket.on('leaveChannel', (channelId: string) => {
      socket.leave(`channel_${channelId}`);
      fastify.log.info(`Socket ${socket.id} left channel_${channelId}`);
    });

    socket.on('joinDm', (roomId: string) => {
      socket.join(`dm_${roomId}`);
      fastify.log.info(`Socket ${socket.id} joined dm_${roomId}`);
    });

    socket.on('leaveDm', (roomId: string) => {
      socket.leave(`dm_${roomId}`);
      fastify.log.info(`Socket ${socket.id} left dm_${roomId}`);
    });

    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id}`);
      
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user_offline', userId);
        }
      }
    });
  });

  fastify.decorate('io', io);
  
  fastify.addHook('onClose', (fastify, done) => {
    fastify.io.close();
    done();
  });
});
