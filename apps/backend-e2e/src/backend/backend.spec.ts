import axios from 'axios';

describe('Backend E2E API Tests', () => {
  const testEmail = `backend_e2e_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Backend E2E User';
  let tokenCookie = '';

  it('should verify API root is running', async () => {
    const res = await axios.get('/');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });

  it('should register a new user', async () => {
    const res = await axios.post('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      name: testName,
    });

    expect(res.status).toBe(201);
    expect(res.data.user).toBeDefined();
    expect(res.data.user.email).toBe(testEmail);
    expect(res.data.user.name).toBe(testName);
    
    // Capture the cookie for future requests
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      tokenCookie = cookies[0];
    }
  });

  it('should login with the created user', async () => {
    const res = await axios.post('/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });

    expect(res.status).toBe(200);
    expect(res.data.user).toBeDefined();
    expect(res.data.user.email).toBe(testEmail);

    const cookies = res.headers['set-cookie'];
    if (cookies) {
      tokenCookie = cookies[0];
    }
  });

  it('should create a workspace when authenticated', async () => {
    const workspaceName = `API Workspace ${Date.now()}`;
    const res = await axios.post(
      '/api/workspaces',
      { name: workspaceName },
      {
        headers: {
          Cookie: tokenCookie,
        },
      }
    );

    expect(res.status).toBe(201);
    expect(res.data.workspace).toBeDefined();
    expect(res.data.workspace.name).toBe(workspaceName);
  });

  it('should list workspaces for the authenticated user', async () => {
    const res = await axios.get('/api/workspaces', {
      headers: {
        Cookie: tokenCookie,
      },
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.workspaces)).toBe(true);
    expect(res.data.workspaces.length).toBeGreaterThan(0);
  });
});
