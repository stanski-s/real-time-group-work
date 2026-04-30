import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import authRoutes from './index';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('Auth Routes', () => {
  let app: FastifyWithMockDB;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(authRoutes, { prefix: '/api/auth' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      app.db.user.findUnique.mockResolvedValueOnce(null);
      
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed-password',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      app.db.user.create.mockResolvedValueOnce(mockUser);
      (argon2.hash as jest.Mock).mockResolvedValueOnce('hashed-password');

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        }
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' }
      });
      expect(response.cookies.find(c => c.name === 'token')).toBeDefined();
    });

    it('should return 400 if user already exists', async () => {
      app.db.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'User already exists' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      app.db.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashed-password',
        name: 'Test User'
      });

      (argon2.verify as jest.Mock).mockResolvedValueOnce(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        user: { id: 'user-1', email: 'test@example.com', name: 'Test User' }
      });
      expect(response.cookies.find(c => c.name === 'token')).toBeDefined();
    });

    it('should return 401 for invalid email', async () => {
      app.db.user.findUnique.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'wrong@example.com',
          password: 'password123'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user if authenticated', async () => {
      const token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
      
      app.db.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        image: null
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        cookies: {
          token
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          image: null
        }
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
