import { FastifyInstance } from 'fastify';
import { CreateWorkspaceDto } from '@slack-clone/shared-types';

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    image: { type: 'string', nullable: true }
  }
};

const channelSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    workspaceId: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' }
  }
};

const memberSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    workspaceId: { type: 'string' },
    role: { type: 'string' },
    user: userSchema
  }
};

const workspaceSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    channels: { type: 'array', items: channelSchema },
    members: { type: 'array', items: memberSchema }
  }
};

export default async function (fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate);

  fastify.get('/', {
    schema: {
      tags: ['Workspaces'],
      summary: 'Get all workspaces for current user',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            workspaces: { type: 'array', items: workspaceSchema }
          }
        }
      }
    }
  }, async function (request) {
    const userId = request.user.id;

    const workspaces = await fastify.db.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        }
      }
    });

    return { workspaces };
  });

  fastify.post('/', {
    schema: {
      tags: ['Workspaces'],
      summary: 'Create a new workspace',
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: { workspace: workspaceSchema }
        }
      }
    }
  }, async function (request, reply) {
    const { name } = request.body as CreateWorkspaceDto;
    const userId = request.user.id;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();

    const workspace = await fastify.db.workspace.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
        channels: {
          create: {
            name: 'general',
          },
        },
      },
      include: {
        channels: true,
      }
    });

    return reply.code(201).send({ workspace });
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Workspaces'],
      summary: 'Get workspace details',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: { workspace: workspaceSchema }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const workspace = await fastify.db.workspace.findFirst({
      where: {
        id,
        members: {
          some: { userId },
        },
      },
      include: {
        channels: true,
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        }
      }
    });

    if (!workspace) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }

    return { workspace };
  });

  fastify.get('/:id/preview', {
    schema: {
      tags: ['Workspaces'],
      summary: 'Get basic workspace preview info',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            workspace: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' } }
            }
          }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { id } = request.params as { id: string };
    const workspace = await fastify.db.workspace.findUnique({
      where: { id },
      select: { id: true, name: true }
    });
    
    if (!workspace) {
      return reply.code(404).send({ error: 'Workspace not found' });
    }
    return { workspace };
  });

  fastify.post('/:id/join', {
    schema: {
      tags: ['Workspaces'],
      summary: 'Join a workspace',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } }
        }
      }
    }
  }, async function (request) {
    const { id } = request.params as { id: string };
    const userId = request.user.id;

    const existingMember = await fastify.db.member.findFirst({
      where: { workspaceId: id, userId }
    });

    if (!existingMember) {
      await fastify.db.member.create({
        data: {
          workspaceId: id,
          userId,
          role: 'member'
        }
      });
    }

    return { success: true };
  });

  fastify.delete('/:id/members/:memberId', {
    schema: {
      tags: ['Workspaces'],
      summary: 'Remove a member from workspace',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          memberId: { type: 'string' }
        },
        required: ['id', 'memberId']
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' } }
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { id, memberId } = request.params as { id: string; memberId: string };
    const userId = request.user.id;

    // Check if the current user is an admin in this workspace
    const currentMember = await fastify.db.member.findFirst({
      where: { workspaceId: id, userId }
    });

    if (!currentMember || currentMember.role !== 'admin') {
      return reply.code(403).send({ error: 'Tylko administrator może usuwać członków' });
    }

    // Check if target member exists in workspace
    const targetMember = await fastify.db.member.findFirst({
      where: { id: memberId, workspaceId: id }
    });

    if (!targetMember) {
      return reply.code(404).send({ error: 'Nie znaleziono członka w tym workspace' });
    }

    await fastify.db.member.delete({
      where: { id: memberId }
    });

    return { success: true };
  });

  fastify.patch('/:id/members/:memberId/role', {
    schema: {
      tags: ['Workspaces'],
      summary: 'Change workspace member role',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          memberId: { type: 'string' }
        },
        required: ['id', 'memberId']
      },
      body: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', enum: ['admin', 'member'] }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            member: memberSchema
          }
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async function (request, reply) {
    const { id, memberId } = request.params as { id: string; memberId: string };
    const { role } = request.body as { role: 'admin' | 'member' };
    const userId = request.user.id;

    // Check if the current user is an admin in this workspace
    const currentMember = await fastify.db.member.findFirst({
      where: { workspaceId: id, userId }
    });

    if (!currentMember || currentMember.role !== 'admin') {
      return reply.code(403).send({ error: 'Tylko administrator może zmieniać role' });
    }

    // Check if target member exists in workspace
    const targetMember = await fastify.db.member.findFirst({
      where: { id: memberId, workspaceId: id }
    });

    if (!targetMember) {
      return reply.code(404).send({ error: 'Nie znaleziono członka w tym workspace' });
    }

    const updatedMember = await fastify.db.member.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } }
      }
    });

    return { member: updatedMember };
  });
}
