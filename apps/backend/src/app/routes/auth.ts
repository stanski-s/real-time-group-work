import { FastifyInstance } from 'fastify';
import * as argon2 from 'argon2';
import { RegisterUserDto } from '@slack-clone/shared-types';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/ping', async () => {
    return { status: 'ok', message: 'Kable podpięte, Fastify widzi trasy!' };
  });

  fastify.post<{ Body: RegisterUserDto }>('/register', async (request, reply) => {
    const { email, name, password } = request.body;

    const existingUser = await fastify.db.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.code(400).send({ message: 'User already exists' });
    }

    const hashedPassword = await argon2.hash(password);

    const user = await fastify.db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    return { id: user.id, email: user.email };
  });
}