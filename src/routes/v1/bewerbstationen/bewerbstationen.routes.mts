import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyInstanceWithPrisma } from '../../../app.mjs';
import { StationType } from '../../../utils/enums.mjs';

interface BewerbstationParam {
  stationId: number;
}

interface BewerbstationCreateBody {
  stationType: string;
  name: string;
  location: string;

  praxisstationHelfi?: number;
  praxisstationJugend1?: number;
  praxisstationJugend2?: number;

  fragenkatalogJugend1?: number;
  fragenkatalogJugend2?: number;
  fragenkatalogHelfi?: number;
}

export default async function BewerbstationenRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions)  {
  // GET Bewerbstationen
  fastify.route({
    method: 'GET',
    url: '/bewerbstationen',
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const bewerbstationen = await fastify.prismaClient.bewerbstation.findMany({})

      return bewerbstationen
    }
  })

  // GET single Bewerbstation
  fastify.route({
    method: 'GET',
    url: '/bewerbstationen/:stationId',
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
      const bewerbstation = await fastify.prismaClient.bewerbstation.findUnique({
        where: {
          id: request.params.stationId,
        },
        include: {
          helfiPraxisstation: true,
          jugend1Praxisstation: true,
          jugend2Praxisstation: true,
          helfiFragenkatalog: true,
          jugend1Fragenkatalog: true,
          jugend2Fragenkatalog: true,
        }
      })

      //const tabletToken = fastify.jwt.sign({ sid: bewerbstation.id })

      return {
        ...bewerbstation,
      }
    }
  })

  // Create Bewerbstation
  fastify.route({
    method: 'POST',
    url: '/bewerbstationen',
    schema: {
      body: {
        type: 'object',
        properties: {
          stationType: { type: 'string', enum: Object.values(StationType) },
          name: { type: 'string' },
          location: { type: 'string' },
        },
        required: ['stationType', 'name', 'location'],
      }
    },
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Body: BewerbstationCreateBody }>, reply: FastifyReply) => {

      console.log(request.body)

      switch (request.body.stationType) {
        case StationType.PRACTICAL:
          const prac_bewerbstation = await fastify.prismaClient.bewerbstation.create({
            data: {
              type: request.body.stationType,
              name: request.body.name,
              location: request.body.location,
              helfiPraxisstationId: request.body.praxisstationHelfi,
              jugend1PraxisstationId: request.body.praxisstationJugend1,
              jugend2PraxisstationId: request.body.praxisstationJugend2,
            }
          })
          return prac_bewerbstation
        case StationType.THEORY:
          const theo_bewerbstation = await fastify.prismaClient.bewerbstation.create({
            data: {
              type: request.body.stationType,
              name: request.body.name,
              location: request.body.location,
              helfiFragenkatalogId: request.body.fragenkatalogHelfi,
              jugend1FragenkatalogId: request.body.fragenkatalogJugend1,
              jugend2FragenkatalogId: request.body.fragenkatalogJugend2,
            }
          })
          return theo_bewerbstation
        case StationType.SOCIAL:
          const social_bewerbstation = await fastify.prismaClient.bewerbstation.create({
            data: {
              type: request.body.stationType,
              name: request.body.name,
              location: request.body.location,
              sozialstation: {
                create: {
                  helfiRunden: {
                    createMany: {
                      // TODO: Adapt interface
                      // @ts-ignore
                      data: request.body.helfi.map((runde) => ({ bild: runde.bild, type: runde.type, punkteProTeilnehmer: runde.punkte })),
                    },
                  },
                  jugendBegriffe: {
                    createMany: {
                      // TODO: Adapt interface
                      // @ts-ignore
                      data: request.body.jugend.map((begriff) => ({ begriff: begriff.begriff, grundsatz: begriff.grundsatz, punkteErraten: +begriff.punkte, punkteGrundsatz: +begriff.punkteErraten })),
                    },
                  },
                }
              }
            }
          })
          return social_bewerbstation
        case StationType.ZIVILCOURAGE:
          const zivilc_bewerbstation = await fastify.prismaClient.bewerbstation.create({
            data: {
              type: request.body.stationType,
              name: request.body.name,
              location: request.body.location,
              zivilcourageStation: {
                create: {
                  helfiAussagen: {
                    createMany: {
                      // TODO: Adapt interface
                      // @ts-ignore
                      data: request.body.helfi.map((aussage) => ({ aussage: aussage.aussage, punkteProTeilnehmer: aussage.punkte })),
                    },
                  },
                  jugendBegriffe: {
                    createMany: {
                      // TODO: Adapt interface
                      // @ts-ignore
                      data: request.body.jugend,
                    },
                  },
                },
              },
            },
          })
          return zivilc_bewerbstation
        default:
          throw fastify.httpErrors.notAcceptable()
      }

    }
  })
}
