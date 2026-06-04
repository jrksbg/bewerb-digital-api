import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyInstanceWithPrisma } from '../../../app.mjs';
import { Altersklasse } from '../../../utils/enums.mjs';

interface PersonenParam {
  pernr: number;
}

interface PersonCreateBody {
  pernr: number;
  bewerbsteamId: number;
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

export default async function PersonenRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions)  {
  // GET Catalogs
  fastify.route({
    method: 'GET',
    url: '/personen',
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const personen = await fastify.prismaClient.bewerbsteilnehmer.findMany({
        include: {
          bewerbsteam: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return personen
    }
  })

  // GET single person
  fastify.route({
    method: 'GET',
    url: '/personen/:pernr',
    schema: {
      params: {
        type: 'object',
        properties: {
          pernr: { type: 'number' },
        },
        required: ['pernr'],
      },
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Params: PersonenParam }>, reply: FastifyReply) => {

      const person = await fastify.prismaClient.bewerbsteilnehmer.findUnique({
        where: {
          pernr: request.params.pernr,
        },
        include: {
          bewerbsteam: true,
        }
      })

      if (!person) {
        throw fastify.httpErrors.notFound(`No Person with Employeenumber ${`${request.params.pernr}`.padStart(5, '0')} found.`)
      }

      return person
    }
  })

  // Create Person
  fastify.route({
    method: 'POST',
    url: '/personen',
    schema: {
      body: {
        type: 'object',
        properties: {
          pernr: { type: 'number' },
          bewerbsteamId: { type: 'number' },
        },
        required: ['pernr', 'bewerbsteamId'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Body: PersonCreateBody }>, reply: FastifyReply) => {
      const person = await fastify.prismaClient.bewerbsteilnehmer.create({
        data: {
          pernr: request.body.pernr,
          bewerbsteamId: request.body.bewerbsteamId,
        }
      })

      return person
    }
  })
}
