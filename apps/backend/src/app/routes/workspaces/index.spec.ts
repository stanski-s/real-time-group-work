import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import workspacesRoutes from './index';

describe('Workspaces Routes', () => {
  let app: FastifyWithMockDB;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(workspacesRoutes, { prefix: '/api/workspaces' });
    token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/workspaces', () => {
    it('should return workspaces for the user', async () => {
      app.db.workspace.findMany.mockResolvedValueOnce([{ id: 'ws-1', name: 'My Workspace' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/workspaces',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ workspaces: [{ id: 'ws-1', name: 'My Workspace' }] });
      expect(app.db.workspace.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { members: { some: { userId: 'user-1' } } }
        })
      );
    });

    it('should return 401 if unauthenticated', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/workspaces' });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/workspaces', () => {
    it('should create a new workspace', async () => {
      const mockWorkspace = { id: 'ws-2', name: 'New Workspace', slug: 'new-workspace-123' };
      app.db.workspace.create.mockResolvedValueOnce(mockWorkspace);

      const response = await app.inject({
        method: 'POST',
        url: '/api/workspaces',
        cookies: { token },
        payload: { name: 'New Workspace' }
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ workspace: mockWorkspace });
      expect(app.db.workspace.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Workspace',
            members: expect.any(Object),
            channels: expect.any(Object),
          })
        })
      );
    });
  });

  describe('GET /api/workspaces/:id', () => {
    it('should return workspace if found', async () => {
      app.db.workspace.findFirst.mockResolvedValueOnce({ id: 'ws-1', name: 'My Workspace' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/workspaces/ws-1',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ workspace: { id: 'ws-1', name: 'My Workspace' } });
    });

    it('should return 404 if not found', async () => {
      app.db.workspace.findFirst.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/workspaces/ws-999',
        cookies: { token }
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/workspaces/:id/preview', () => {
    it('should return workspace preview', async () => {
      app.db.workspace.findUnique.mockResolvedValueOnce({ id: 'ws-1', name: 'My Workspace' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/workspaces/ws-1/preview',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ workspace: { id: 'ws-1', name: 'My Workspace' } });
    });
  });

  describe('POST /api/workspaces/:id/join', () => {
    it('should add user to workspace if not already a member', async () => {
      app.db.member.findFirst.mockResolvedValueOnce(null);
      app.db.member.create.mockResolvedValueOnce({ id: 'member-1' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/workspaces/ws-1/join',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
      expect(app.db.member.create).toHaveBeenCalled();
    });

    it('should succeed even if already a member', async () => {
      app.db.member.findFirst.mockResolvedValueOnce({ id: 'member-1' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/workspaces/ws-1/join',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(app.db.member.create).not.toHaveBeenCalled();
    });
  });
});
