import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import channelsRoutes from './index';

describe('Channels Routes', () => {
  let app: FastifyWithMockDB;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(channelsRoutes, { prefix: '/api/channels' });
    token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/channels', () => {
    it('should create a new channel if user is a member of workspace', async () => {
      app.db.member.findFirst.mockResolvedValueOnce({ id: 'member-1' });
      app.db.channel.create.mockResolvedValueOnce({ id: 'channel-1', name: 'general', workspaceId: 'ws-1' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/channels',
        cookies: { token },
        payload: { name: 'general', workspaceId: 'ws-1' }
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ channel: { id: 'channel-1', name: 'general', workspaceId: 'ws-1' } });
      expect(app.db.channel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'general', workspaceId: 'ws-1' }
        })
      );
    });

    it('should return 403 if user is not a member of workspace', async () => {
      app.db.member.findFirst.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/channels',
        cookies: { token },
        payload: { name: 'general', workspaceId: 'ws-1' }
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toEqual({ error: 'Brak dostępu do tego Workspace' });
    });
  });

  describe('GET /api/channels/:id', () => {
    it('should return channel if user has access', async () => {
      app.db.channel.findUnique.mockResolvedValueOnce({
        id: 'channel-1',
        name: 'general',
        workspaceId: 'ws-1',
        workspace: {
          members: [{ id: 'member-1' }]
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/channels/channel-1',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        channel: { id: 'channel-1', name: 'general', workspaceId: 'ws-1' }
      });
    });

    it('should return 404 if channel not found or user lacks access', async () => {
      // Return a channel but with no members matching the current user
      app.db.channel.findUnique.mockResolvedValueOnce({
        id: 'channel-1',
        workspace: { members: [] }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/channels/channel-1',
        cookies: { token }
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'Kanał nie znaleziony lub brak dostępu' });
    });
  });
});
