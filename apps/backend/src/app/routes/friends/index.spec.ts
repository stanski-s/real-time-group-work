import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import friendsRoutes from './index';

describe('Friends Routes', () => {
  let app: FastifyWithMockDB;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(friendsRoutes, { prefix: '/api/friends' });
    token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/friends', () => {
    it('should return list of accepted friends', async () => {
      app.db.friendship.findMany.mockResolvedValueOnce([
        {
          id: 'friendship-1',
          userId: 'user-1',
          friendId: 'user-2',
          friend: { id: 'user-2', name: 'Friend One', email: 'friend1@example.com', image: null }
        }
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/friends',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        friends: [
          { id: 'user-2', name: 'Friend One', email: 'friend1@example.com', image: null }
        ]
      });
    });
  });

  describe('GET /api/friends/requests', () => {
    it('should return sent and received pending requests', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          senderId: 'user-1',
          receiverId: 'user-2',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          sender: { id: 'user-1', name: 'Me', email: 'test@example.com', image: null },
          receiver: { id: 'user-2', name: 'Friend One', email: 'friend1@example.com', image: null }
        }
      ];
      app.db.friendRequest.findMany.mockResolvedValueOnce(mockRequests);

      const response = await app.inject({
        method: 'GET',
        url: '/api/friends/requests',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ requests: mockRequests });
    });
  });

  describe('POST /api/friends/request', () => {
    it('should send a friend request successfully', async () => {
      app.db.user.findFirst.mockResolvedValueOnce({
        id: 'user-2',
        email: 'friend1@example.com',
        name: 'Friend One'
      });
      app.db.friendship.findFirst.mockResolvedValueOnce(null);
      app.db.friendRequest.findFirst.mockResolvedValueOnce(null);
      
      const mockRequest = {
        id: 'request-1',
        senderId: 'user-1',
        receiverId: 'user-2',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        sender: { id: 'user-1', name: 'Me', email: 'test@example.com', image: null },
        receiver: { id: 'user-2', name: 'Friend One', email: 'friend1@example.com', image: null }
      };
      app.db.friendRequest.create.mockResolvedValueOnce(mockRequest);

      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        cookies: { token },
        payload: { email: 'friend1@example.com' }
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ request: mockRequest });
      expect(app.io.to).toHaveBeenCalledWith('user_user-2');
      expect(app.io.emit).toHaveBeenCalledWith('friend_request_received', mockRequest);
    });

    it('should return 404 if email does not exist', async () => {
      app.db.user.findFirst.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        cookies: { token },
        payload: { email: 'unknown@example.com' }
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: 'Użytkownik o podanym adresie e-mail nie istnieje' });
    });

    it('should return 400 if user invites themselves', async () => {
      app.db.user.findFirst.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com'
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        cookies: { token },
        payload: { email: 'test@example.com' }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'Nie możesz wysłać zaproszenia do samego siebie' });
    });
  });

  describe('POST /api/friends/request/:id/respond', () => {
    it('should accept a friend request and build a two-way friendship', async () => {
      app.db.friendRequest.findUnique.mockResolvedValueOnce({
        id: 'request-1',
        senderId: 'user-2',
        receiverId: 'user-1'
      });
      app.db.$transaction.mockResolvedValueOnce([{}, {}, {}]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request/request-1/respond',
        cookies: { token },
        payload: { action: 'ACCEPT' }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
      expect(app.db.$transaction).toHaveBeenCalled();
      expect(app.io.to).toHaveBeenCalledWith('user_user-2');
      expect(app.io.to).toHaveBeenCalledWith('user_user-1');
    });

    it('should decline a request and delete it', async () => {
      app.db.friendRequest.findUnique.mockResolvedValueOnce({
        id: 'request-1',
        senderId: 'user-2',
        receiverId: 'user-1'
      });
      app.db.friendRequest.delete.mockResolvedValueOnce({});

      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request/request-1/respond',
        cookies: { token },
        payload: { action: 'DECLINE' }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
      expect(app.db.friendRequest.delete).toHaveBeenCalledWith({ where: { id: 'request-1' } });
      expect(app.io.to).toHaveBeenCalledWith('user_user-2');
    });
  });

  describe('DELETE /api/friends/:id', () => {
    it('should delete friendship between both users', async () => {
      app.db.friendship.findFirst.mockResolvedValueOnce({
        id: 'friendship-1',
        userId: 'user-1',
        friendId: 'user-2'
      });
      app.db.friendship.deleteMany.mockResolvedValueOnce({ count: 2 });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/friends/user-2',
        cookies: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ success: true });
      expect(app.db.friendship.deleteMany).toHaveBeenCalled();
      expect(app.io.to).toHaveBeenCalledWith('user_user-1');
      expect(app.io.to).toHaveBeenCalledWith('user_user-2');
    });
  });
});
