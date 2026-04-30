import { FastifyWithMockDB, buildTestApp } from '../../../test-setup';
import uploadRoutes from './index';


jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn().mockImplementation(() => {
    const { PassThrough } = require('stream');
    return new PassThrough();
  })
}));

describe('Upload Routes', () => {
  let app: FastifyWithMockDB;
  let token: string;

  beforeAll(async () => {
    app = await buildTestApp();
    await app.register(uploadRoutes, { prefix: '/api/upload' });
    token = app.jwt.sign({ id: 'user-1', email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload', () => {
    it('should upload a file and return file metadata', async () => {

      const payload = '--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="test-image.png"\r\nContent-Type: image/png\r\n\r\nfake-image-content\r\n--test-boundary--\r\n';

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        cookies: { token },
        headers: {
          'Content-Type': 'multipart/form-data; boundary=test-boundary',
        },
        payload
      });

      expect(response.statusCode).toBe(201);
      const json = response.json();
      expect(json).toHaveProperty('fileUrl');
      expect(json).toHaveProperty('fileType', 'image/png');
      expect(json).toHaveProperty('fileName', 'test-image.png');
      expect(json.fileUrl).toMatch(/test-image\.png$/);
    });

    it('should return 400 if no file is provided', async () => {
      const payload = '--test-boundary\r\nContent-Disposition: form-data; name="other"\r\n\r\nsome-text\r\n--test-boundary--\r\n';

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        cookies: { token },
        headers: {
          'Content-Type': 'multipart/form-data; boundary=test-boundary',
        },
        payload
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'Brak pliku' });
    });
  });
});
