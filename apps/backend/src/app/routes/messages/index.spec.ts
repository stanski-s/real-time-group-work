import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import messagesRoutes from './index';

describe('Messages Routes', () => {
  let app: FastifyWithMockDB;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(messagesRoutes, { prefix: '/api/messages' });
    token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/messages/:channelId', () => {
    it('should return messages for a channel', async () => {
      app.db.message.findMany.mockResolvedValueOnce([
        { id: 'msg-1', content: 'Hello', channelId: 'channel-1' }
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/messages/channel-1',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        messages: [{ id: 'msg-1', content: 'Hello', channelId: 'channel-1' }]
      });
      expect(app.db.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { channelId: 'channel-1', parentId: null }
        })
      );
    });
  });

  describe('GET /api/messages/:channelId/thread/:messageId', () => {
    it('should return thread replies', async () => {
      app.db.message.findMany.mockResolvedValueOnce([
        { id: 'msg-2', content: 'Reply', channelId: 'channel-1', parentId: 'msg-1' }
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/messages/channel-1/thread/msg-1',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        replies: [{ id: 'msg-2', content: 'Reply', channelId: 'channel-1', parentId: 'msg-1' }]
      });
      expect(app.db.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { channelId: 'channel-1', parentId: 'msg-1' }
        })
      );
    });
  });

  describe('POST /api/messages/:channelId', () => {
    it('should create a new message and emit a socket event', async () => {
      const mockMessage = { id: 'msg-1', content: 'Hello socket', channelId: 'channel-1', parentId: null };
      app.db.message.create.mockResolvedValueOnce(mockMessage);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/channel-1',
        cookies: { token },
        payload: { content: 'Hello socket' }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: mockMessage });
      expect(app.db.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: 'Hello socket', channelId: 'channel-1' })
        })
      );
      
      const ioMock = app.io as unknown as { to: jest.Mock; emit: jest.Mock };
      expect(ioMock.to).toHaveBeenCalledWith('channel_channel-1');
      expect(ioMock.emit).toHaveBeenCalledWith('new_message', mockMessage);
    });

    it('should create a reply and emit thread event', async () => {
      const mockReply = { id: 'msg-2', content: 'Reply', channelId: 'channel-1', parentId: 'msg-1' };
      app.db.message.create.mockResolvedValueOnce(mockReply);

      const response = await app.inject({
        method: 'POST',
        url: '/api/messages/channel-1',
        cookies: { token },
        payload: { content: 'Reply', parentId: 'msg-1' }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: mockReply });
      
      const ioMock = app.io as unknown as { to: jest.Mock; emit: jest.Mock };
      expect(ioMock.to).toHaveBeenCalledWith('channel_channel-1');
      expect(ioMock.emit).toHaveBeenCalledWith('new_thread_reply', mockReply);
    });
  });
});
