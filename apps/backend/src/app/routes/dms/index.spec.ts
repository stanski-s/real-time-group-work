import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import dmsRoutes from './index';

describe('DMs Routes', () => {
  let app: FastifyWithMockDB;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(dmsRoutes, { prefix: '/api/dms' });
    token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/dms/:workspaceId/:userId', () => {
    it('should return DMs if user is member of workspace', async () => {
      app.db.member.findFirst.mockResolvedValueOnce({ id: 'member-1' });
      app.db.directMessage.findMany.mockResolvedValueOnce([
        { id: 'dm-1', content: 'Hi', workspaceId: 'ws-1' }
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/dms/ws-1/user-2',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        messages: [{ id: 'dm-1', content: 'Hi', workspaceId: 'ws-1' }]
      });
    });

    it('should return 403 if user is not member of workspace', async () => {
      app.db.member.findFirst.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/dms/ws-1/user-2',
        cookies: { token }
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/dms/:workspaceId/thread/:messageId', () => {
    it('should return dm thread replies', async () => {
      app.db.directMessage.findMany.mockResolvedValueOnce([
        { id: 'dm-2', content: 'Reply', workspaceId: 'ws-1', parentId: 'dm-1' }
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/dms/ws-1/thread/dm-1',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        replies: [{ id: 'dm-2', content: 'Reply', workspaceId: 'ws-1', parentId: 'dm-1' }]
      });
    });
  });

  describe('POST /api/dms/:workspaceId/:userId', () => {
    it('should create dm and emit socket event', async () => {
      app.db.member.findFirst.mockResolvedValueOnce({ id: 'member-1' });
      const mockDM = { id: 'dm-1', content: 'Hello', workspaceId: 'ws-1' };
      app.db.directMessage.create.mockResolvedValueOnce(mockDM);

      const response = await app.inject({
        method: 'POST',
        url: '/api/dms/ws-1/user-2',
        cookies: { token },
        payload: { content: 'Hello' }
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ message: mockDM });
      
      const ioMock = app.io as unknown as { to: jest.Mock; emit: jest.Mock };
      // roomKey is sorted: 'user-1' and 'user-2' -> 'user-1_user-2'
      expect(ioMock.to).toHaveBeenCalledWith('dm_ws-1_user-1_user-2');
      expect(ioMock.emit).toHaveBeenCalledWith('new_dm', mockDM);
    });
  });
});
