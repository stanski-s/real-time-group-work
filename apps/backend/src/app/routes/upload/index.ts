import { FastifyInstance } from 'fastify';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { pipeline } from 'stream';

const pump = util.promisify(pipeline);

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.post('/', async function (request, reply) {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'Brak pliku' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = uniqueSuffix + '-' + data.filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    
    const savePath = path.join(uploadDir, fileName);
    
    await pump(data.file, fs.createWriteStream(savePath));

    return reply.code(201).send({
      fileUrl: `/uploads/${fileName}`,
      fileType: data.mimetype,
      fileName: data.filename
    });
  });
}
