import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyInstanceWithPrisma } from '../../../app.mjs';

interface QuestionCatalogPram {
  questionCatalogId: number;
}

interface QuestionCatalogCreateBody {
  name: string;
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

export default async function QuestionCatalogRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions)  {
  // GET Catalogs
  fastify.route({
    method: 'GET',
    url: '/questionCatalogs',
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const catalogs = await fastify.prismaClient.questionCatalog.findMany({
        include: {
          _count: {
            select: {
              questions: true,
            },
          },
        },
      })

      return catalogs
    }
  })

  // GET single Catalog
  fastify.route({
    method: 'GET',
    url: '/questionCatalogs/:questionCatalogId',
    schema: {
      params: {
        type: 'object',
        properties: {
          questionCatalogId: { type: 'number' },
        },
        required: ['questionCatalogId'],
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
    handler: async (request: FastifyRequest<{ Params: QuestionCatalogPram, Querystring: { includeQuestions: boolean } }>, reply: FastifyReply) => {

      const catalog = await fastify.prismaClient.questionCatalog.findUnique({
        where: {
          id: request.params.questionCatalogId,
        },
        include: {
          questions: request.query.includeQuestions
            ? { include: { answers: true } }
            : false
        },
      })

      if (!catalog) {
        throw fastify.httpErrors.notFound(`No Question Catalog with ID ${request.params.questionCatalogId} found.`)
      }

      return catalog
    }
  })

  // Create Catalog
  fastify.route({
    method: 'POST',
    url: '/questionCatalogs',
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Body: QuestionCatalogCreateBody }>, reply: FastifyReply) => {
      const catalog = await fastify.prismaClient.questionCatalog.create({
        data: {
          name: request.body.name,
        }
      })


      return catalog
    }
  })

  // Edit Catalog
  fastify.route({
    method: 'PATCH',
    url: '/questionCatalogs/:questionCatalogId',
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      params: {
        type: 'object',
        properties: {
          questionCatalogId: { type: 'number' },
        },
        required: ['questionCatalogId'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Body: QuestionCatalogCreateBody, Params: QuestionCatalogPram }>, reply: FastifyReply) => {
      const catalog = await fastify.prismaClient.questionCatalog.update({
        where: {
          id: request.params.questionCatalogId,
        },
        data: {
          name: request.body.name,
        }
      })

      if (!catalog) {
        throw fastify.httpErrors.notFound(`No Question Catalog with ID ${request.params.questionCatalogId} found.`)
      }

      return catalog
    }
  })

  // QUESTIONS
  // GET questions of catalog
  fastify.route({
    method: 'GET',
    url: '/questionCatalogs/:questionCatalogId/questions',
    schema: {
      params: {
        type: 'object',
        properties: {
          questionCatalogId: { type: 'number' },
        },
        required: ['questionCatalogId'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Params: QuestionCatalogPram }>, reply: FastifyReply) => {
      const questions = await fastify.prismaClient.multipleChoiceQuestion.findMany({
        where: {
          questionCatalogId: request.params.questionCatalogId,
        }
      })

      return questions
    }
  })

  // Create question for catalog
  fastify.route({
    method: 'POST',
    url: '/questionCatalogs/:questionCatalogId/questions',
    schema: {
      params: {
        type: 'object',
        properties: {
          questionCatalogId: { type: 'number' },
        },
        required: ['questionCatalogId'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Body: QuestionCreateBody, Params: QuestionCatalogPram }>, reply: FastifyReply) => {
      const question = await fastify.prismaClient.multipleChoiceQuestion.create({
        data: {
          questionCatalogId: request.params.questionCatalogId,
          text: request.body.text,
          answers: {
            createMany: {
              data: request.body.answers.map((answer) => ({
                text: answer.text,
                correctAnswer: answer.correctAnswer,
              })),
            },
          },
        },
      })

      return question
    }
  })


  // MOVE
  // GET SINGLE QUESTION
  fastify.route({
    method: 'GET',
    url: '/questions/:questionId',
    schema: {
      params: {
        type: 'object',
        properties: {
          questionId: { type: 'number' },
        },
        required: [ 'questionId' ]
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Params: QuestionPram }>, reply) => {
      const question = await fastify.prismaClient.multipleChoiceQuestion.findUnique({
        where: {
          id: request.params.questionId,
        },
        include: {
          answers: true,
        },
      })

      if (!question) {
        throw fastify.httpErrors.notFound(`Question with ID ${request.params.questionId} not found.`)
      }

      return question
    }
  })

  // PATCH QUESTION
  fastify.route({
    method: 'POST',
    url: '/questions/:questionId',
    schema: {
      params: {
        type: 'object',
        properties: {
          questionId: { type: 'number' },
        },
        required: ['questionId'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Body: QuestionUpdateBody, Params: QuestionPram }>, reply: FastifyReply) => {
      const currentQuestionIds = (await fastify.prismaClient.multipleChoiceQuestionAnswer.findMany({
        where: {
          questionId: request.params.questionId,
        },
        select: {
          id: true,
        }
      })).map(question => question.id)
      const editQuestionIds = request.body.answers.map((answer) => answer.id).filter(id => !!id)

      const processData = request.body.answers.reduce((previousValue, currentValue) => {
        if (currentQuestionIds.includes(currentValue.id)) {
          return {
            ...previousValue,
            update: [...previousValue.update, currentValue],
          }
        }

        if (!currentValue.id) {
          return {
            ...previousValue,
            create: [...previousValue.create, currentValue],
          }
        }

        return previousValue
      }, {
        update: [],
        delete: [],
        create: [],
      })

      processData.delete = currentQuestionIds.reduce((previousValue, currentValue) => {
        if (!editQuestionIds.includes(currentValue)) {
          return [...previousValue, currentValue]
        }

        return previousValue
      }, [])



      const question = await fastify.prismaClient.multipleChoiceQuestion.update({
        where: {
          id: request.params.questionId,
        },
        data: {
          text: request.body.text,
          answers: {
            updateMany: processData.update.map((answer) => ({
              where: {
                id: answer.id,
              },
              data: {
                text: answer.text,
                correctAnswer: answer.correctAnswer,
              }
            })),
            deleteMany: processData.delete.map((id) => ({id: id})),
            createMany: {
              data: processData.create,
            },
          },
        },
      })

      return question
    }
  })
}
