import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyInstanceWithPrisma } from '../../../app.mjs';
import { Altersklasse } from '../../../utils/enums.mjs';

interface GruppenParam {
  gruppenId: number;
}

interface GroupCreateBody {
  name: string;
  jugendgruppe?: string;
  altersklasse: Altersklasse;
}

interface AnswerCreateBody {
  text: string;
  correctAnswer: boolean;
}

interface QuestionCreateBody {
  text: string;
  answers: AnswerCreateBody[];
}


interface QuestionPram {
  questionId: number;
}

interface AnswerUpdateBody {
  id: number;
  text: string;
  correctAnswer: boolean;
}

interface QuestionUpdateBody {
  text: string;
  answers: AnswerUpdateBody[];
}

export default async function GruppenRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions)  {
  // GET Catalogs
  fastify.route({
    method: 'GET',
    url: '/gruppen',
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const gruppen = await fastify.prismaClient.bewerbsteam.findMany({
        include: {
          _count: {
            select: {
              teilnehmer: true,
            },
          },
        },
      })

      return gruppen
    }
  })

  // GET single Group
  fastify.route({
    method: 'GET',
    url: '/gruppen/:gruppenId',
    schema: {
      params: {
        type: 'object',
        properties: {
          gruppenId: { type: 'number' },
        },
        required: ['gruppenId'],
      },
      querystring: {
        type: 'object',
        properties: {
          includeQuestions: { type: 'boolean', default: false },
        }
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Params: GruppenParam, Querystring: { includeMembers: boolean } }>, reply: FastifyReply) => {

      const group = await fastify.prismaClient.bewerbsteam.findUnique({
        where: {
          id: request.params.gruppenId,
        },
        include: {
          teilnehmer: request.query.includeMembers,
        },
      })

      if (!group) {
        throw fastify.httpErrors.notFound(`No Group with ID ${request.params.gruppenId} found.`)
      }

      return group
    }
  })

  // Create Catalog
  fastify.route({
    method: 'POST',
    url: '/gruppen',
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          jugendgruppe: { type: 'string' },
          altersklasse: { type: 'string', enum: Object.values(Altersklasse) }
        },
        required: ['name', 'altersklasse'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Body: GroupCreateBody }>, reply: FastifyReply) => {
      const gruppe = await fastify.prismaClient.bewerbsteam.create({
        data: {
          name: request.body.name,
          jugendgruppe: request.body.jugendgruppe,
          altersklasse: request.body.altersklasse,
        }
      })

      return gruppe
    }
  })
}
