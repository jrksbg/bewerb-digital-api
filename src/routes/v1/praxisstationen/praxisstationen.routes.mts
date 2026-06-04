import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyInstanceWithPrisma } from '../../../app.mjs';

interface BewerbstationParam {
  stationId: number;
}

interface BewerbstationCreateBody {
  stationType: string;
  name: string;
  location: string;

  masterfrage?: string;
  masterfrageA1?: string;
  masterfrageA2?: string;
  masterfrageA3?: string;
  masterfragePunkte?: number;

  fragenkatalogJugend1?: number;
  fragenkatalogJugend2?: number;
  fragenkatalogHelfi?: number;

  szenarioBeschreibung?: string;

  bewerter?: any;
}

export default async function PraxisstationenRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions)  {
  // GET Praxisstationen
  fastify.route({
    method: 'GET',
    url: '/praxisstationen',
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const praxisstationen = await fastify.prismaClient.praxisstation.findMany({})

      return praxisstationen
    }
  })

  // GET single Praxisstation
  fastify.route({
    method: 'GET',
    url: '/praxisstationen/:stationId',
    preHandler: [
      fastify.authenticate,
    ],
    schema: {
      params: {
        type: 'object',
        properties: {
          stationId: { type: 'number' },
        },
      },
    },
    handler: async (request: FastifyRequest<{ Params: BewerbstationParam }>, reply: FastifyReply) => {
      const bewerbstation = await fastify.prismaClient.praxisstation.findUnique({
        where: {
          id: request.params.stationId,
        },
        include: {
          masterfrage: true,
          bewerter: {
            include: {
              bewertungskriterien: true,
            },
          },
        }
      })

      //const tabletToken = fastify.jwt.sign({ sid: bewerbstation.id })

      return {
        ...bewerbstation,
      }
    }
  })

  // Create Praxisstation
  fastify.route({
    method: 'POST',
    url: '/praxisstationen',
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
    handler: async (request: FastifyRequest<{ Body: BewerbstationCreateBody }>, reply: FastifyReply) => {

      console.log(request.body)

      const station = await fastify.prismaClient.$transaction(async (transaction) => {
        const station = await transaction.praxisstation.create({
          data: {
            name: request.body.name,
            masterfrage: {
              create: {
                frage: request.body.masterfrage,
                antwort1: request.body.masterfrageA1,
                antwort2: request.body.masterfrageA2,
                antwort3: request.body.masterfrageA3,
                punkte: request.body.masterfragePunkte,
              },
            },
            szenarioBeschreibung: request.body.szenarioBeschreibung,
          },
        })

        console.log(station)

        const bewerter = await Promise.all(request.body.bewerter.map((bewerter: any) =>
          transaction.bewerbstationBewerter.create({
            data: {
              praxisstationId: station.id,
              hauptbewerter: bewerter.hauptbewerter,
              additionalNote: bewerter.additionalNotes,
              bewertungskriterien: {
                createMany: {
                  data: bewerter.kriterien,
                },
              },
            },
            select: {
              bewertungskriterien: true,
            }
          })
        ))

        return {
          ...station,
          bewerter: bewerter,
        }
      })


      return station
    }
  })
}
