import fp from 'fastify-plugin';
import { Server } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
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

      const decoded = fastify.jwt.verify(token);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    fastify.log.info(`Socket connected: ${socket.id}`);
    
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
    });
  });

  fastify.decorate('io', io);
  
  fastify.addHook('onClose', (fastify, done) => {
    fastify.io.close();
    done();
  });
});
