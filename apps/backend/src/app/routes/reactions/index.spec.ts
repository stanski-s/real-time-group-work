import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import reactionsRoutes from './index';

describe('Reactions Routes', () => {
  let app: FastifyWithMockDB;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(reactionsRoutes, { prefix: '/api/reactions' });
    token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/reactions', () => {
    it('should add a reaction to a message and emit event', async () => {
      app.db.reaction.findFirst.mockResolvedValueOnce(null);
      const mockReaction = { id: 'react-1', emoji: '👍', userId: 'user-1', messageId: 'msg-1', directMessageId: null };
      app.db.reaction.create.mockResolvedValueOnce(mockReaction);
      app.db.message.findUnique.mockResolvedValueOnce({ id: 'msg-1', channelId: 'channel-1' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/reactions',
        cookies: { token },
        payload: { emoji: '👍', entityId: 'msg-1', entityType: 'message' }
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ reaction: mockReaction });
      
      const ioMock = app.io as unknown as { to: jest.Mock; emit: jest.Mock };
      expect(ioMock.to).toHaveBeenCalledWith('channel_channel-1');
      expect(ioMock.emit).toHaveBeenCalledWith('reaction_added', expect.objectContaining({ id: 'react-1' }));
    });

    it('should return 200 if reaction already exists', async () => {
      const mockReaction = { id: 'react-1', emoji: '👍', userId: 'user-1', messageId: 'msg-1' };
      app.db.reaction.findFirst.mockResolvedValueOnce(mockReaction);

      const response = await app.inject({
        method: 'POST',
        url: '/api/reactions',
        cookies: { token },
        payload: { emoji: '👍', entityId: 'msg-1', entityType: 'message' }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'Już zareagowano', reaction: mockReaction });
    });
  });

  describe('DELETE /api/reactions', () => {
    it('should remove a reaction from a direct message and emit event', async () => {
      const mockReaction = { id: 'react-1', emoji: '👍', userId: 'user-1', directMessageId: 'dm-1' };
      app.db.reaction.findFirst.mockResolvedValueOnce(mockReaction);
      app.db.reaction.delete.mockResolvedValueOnce(mockReaction);
      
      app.db.directMessage.findUnique.mockResolvedValueOnce({ 
        id: 'dm-1', 
        workspaceId: 'ws-1', 
        authorId: 'user-1', 
        receiverId: 'user-2' 
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/reactions',
        cookies: { token },
        payload: { emoji: '👍', entityId: 'dm-1', entityType: 'directMessage' }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
      expect(app.db.reaction.delete).toHaveBeenCalledWith({ where: { id: 'react-1' } });
      
      const ioMock = app.io as unknown as { to: jest.Mock; emit: jest.Mock };
      // sorted ids: user-1_user-2
      expect(ioMock.to).toHaveBeenCalledWith('dm_ws-1_user-1_user-2');
      expect(ioMock.emit).toHaveBeenCalledWith('reaction_removed', expect.objectContaining({ id: 'react-1' }));
    });

    it('should return 404 if reaction does not exist', async () => {
      app.db.reaction.findFirst.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/reactions',
        cookies: { token },
        payload: { emoji: '👍', entityId: 'msg-1', entityType: 'message' }
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
