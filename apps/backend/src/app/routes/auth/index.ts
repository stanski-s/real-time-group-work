import { FastifyInstance } from 'fastify';
import * as argon2 from 'argon2';

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
    image: { type: 'string', nullable: true }
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: { user: userSchema }
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { email, password, name } = request.body as any;

    const existingUser = await fastify.db.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.code(400).send({ error: 'User already exists' });
    }

    const hashedPassword = await argon2.hash(password);

    const user = await fastify.db.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = fastify.jwt.sign({ id: user.id, email: user.email });

    reply
      .setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      .code(201)
      .send({ user: { id: user.id, email: user.email, name: user.name } });
  });

  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Log in user',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: { user: userSchema }
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { email, password } = request.body as any;

    const user = await fastify.db.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email });

    reply
      .setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
      .send({ user: { id: user.id, email: user.email, name: user.name } });
  });

  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Log out user',
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } }
        }
      }
    }
  }, async function (request, reply) {
    reply.clearCookie('token', { path: '/' }).send({ success: true });
  });

  fastify.get('/me', {
    preValidation: [fastify.authenticate],
    schema: {
      tags: ['Auth'],
      summary: 'Get current user',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: { user: userSchema }
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const user = await fastify.db.user.findUnique({
      where: { id: request.user.id },
      select: { id: true, email: true, name: true, image: true }
    });
    return { user };
  });
}
