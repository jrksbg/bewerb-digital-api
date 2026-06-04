import { fastify as Fastify, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import FastifyCors from '@fastify/cors';
import FastifySensible from '@fastify/sensible';
import FastifyJWT from '@fastify/jwt';
import FastifySocketIo from 'fastify-socket.io'
import { PrismaClient } from '@prisma/client';
import QuestionCatalogRoutes from './routes/v1/questionCatalog/questionCatalog.routes.mjs';
import AuthRoutes from './routes/v1/auth/auth.routes.mjs';
import BewerbstationenRoutes from './routes/v1/bewerbstationen/bewerbstationen.routes.mjs';
import GruppenRoutes from './routes/v1/gruppen/gruppen.routes.mjs';
import PersonenRoutes from './routes/v1/personen/personen.routes.mjs';
import TabletsRoutes from './routes/v1/tablets/tablets.routes.mjs';
import ResultsRoutes from './routes/v1/results/results.routes.mjs';
import PraxisstationenRoutes from './routes/v1/praxisstationen/praxisstationen.routes.mjs';

const prismaClient = new PrismaClient({
  //log: ['query', 'info', 'warn', 'error'],
})

await prismaClient.$connect()

const fastify = Fastify({
  /*logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      }
    },
  },*/
  logger: true,
  trustProxy: true,
})

fastify.register(FastifyCors)
fastify.register(FastifySensible)
fastify.register(FastifyJWT, {
  decoratorName: 'jwtData',
  secret: process.env.JWT_SECRET,
})
/*fastify.register(FastifySocketIo.default, {
  cors: {
    origin: '*',
  }
})*/

fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.send(err)
  }
})

fastify.decorate('authenticateTablet', fastify['authenticate'])

fastify.decorate('prismaClient', prismaClient)

export interface FastifyInstanceWithPrisma extends FastifyInstance {
  prismaClient: PrismaClient;
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  authenticateTablet: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

await fastify.register(QuestionCatalogRoutes, { prefix: '/v1' })
await fastify.register(BewerbstationenRoutes, { prefix: '/v1' })
await fastify.register(PraxisstationenRoutes, { prefix: '/v1' })
await fastify.register(GruppenRoutes, { prefix: '/v1' })
await fastify.register(PersonenRoutes, { prefix: '/v1' })
await fastify.register(TabletsRoutes, { prefix: '/v1' })
await fastify.register(ResultsRoutes, { prefix: '/v1' })
await fastify.register(AuthRoutes, { prefix: '/v1' })

fastify.route({
  method: 'GET',
  url: '/',
  handler: async (request, reply) => {
    return reply.redirect('https://bewerb-digital.at')
  }
})

console.log(fastify.printRoutes())

try {
  await fastify.listen({ port: +(process.env.PORT || 3010), host: process.env.HOSTNAME || '127.0.0.1' })
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
} finally {
  await prismaClient.$disconnect()
}
