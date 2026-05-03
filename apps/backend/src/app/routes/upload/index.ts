import { FastifyInstance } from 'fastify';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/json',
]);

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.post('/', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      }
    },
    schema: {
      tags: ['Uploads'],
      summary: 'Upload a file',
      security: [{ cookieAuth: [] }],
      consumes: ['multipart/form-data'],
      response: {
        201: {
          type: 'object',
          properties: {
            fileUrl: { type: 'string' },
            fileType: { type: 'string' },
            fileName: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'Brak pliku' });
    }

    if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
      data.file.resume();
      return reply.code(415).send({
        error: `Niedozwolony typ pliku: ${data.mimetype}. Dozwolone: obrazy, PDF, TXT, ZIP, JSON.`
      });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeFileName = uniqueSuffix + '-' + data.filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const savePath = path.join(uploadDir, safeFileName);

    if (!savePath.startsWith(uploadDir)) {
      data.file.resume();
      return reply.code(400).send({ error: 'Nieprawidłowa nazwa pliku' });
    }

    await pump(data.file, fs.createWriteStream(savePath));

    return reply.code(201).send({
      fileUrl: `/uploads/${safeFileName}`,
      fileType: data.mimetype,
      fileName: data.filename
    });
  });
}
