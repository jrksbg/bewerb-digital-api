import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyInstanceWithPrisma } from '../../../app.mjs';
import { Altersklasse, StationType } from '../../../utils/enums.mjs';

enum Rating {
  RED = 0,
  YELLOW = 0.5,
  GREEN = 1,
}

interface StationsParam {
  stationId: number;
}

interface GroupCreateBody {
  name: string;
  jugendgruppe?: string;
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

export default async function TabletsRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions)  {
  // GET context
  fastify.route({
    method: 'GET',
    url: '/tablets/token',
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest<{ Params: StationsParam }>, reply: FastifyReply) => {
      const token = fastify.jwt.sign({ tag: 'TABLET' }, { expiresIn: '30d' })

      return {
        token
      }
    }
  })

  // GET context
  fastify.route({
    method: 'GET',
    url: '/tablets/stationen/:stationId',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest<{ Params: StationsParam }>, reply: FastifyReply) => {
      const bewerbstation = await fastify.prismaClient.bewerbstation.findUnique({
        where: {
          id: +request.params.stationId,
        },
        include: {
          helfiPraxisstation: {
            include: {
              bewerter: {
                include: {
                  bewertungskriterien: true,
                }
              },
              masterfrage: true,
            }
          },
          jugend1Praxisstation: {
            include: {
              bewerter: {
                include: {
                  bewertungskriterien: true,
                }
              },
              masterfrage: true,
            }
          },
          jugend2Praxisstation: {
            include: {
              bewerter: {
                include: {
                  bewertungskriterien: true,
                }
              },
              masterfrage: true,
            }
          },
          helfiFragenkatalog: {
            include: {
              questions: {
                select: {
                  id: true,
                  questionCatalogId: true,
                  text: true,
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      questionId: true,
                    },
                  },
                },
              },
            },
          },
          jugend1Fragenkatalog: {
            include: {
              questions: {
                select: {
                  id: true,
                  questionCatalogId: true,
                  text: true,
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      questionId: true,
                    },
                  },
                },
              },
            },
          },
          jugend2Fragenkatalog: {
            include: {
              questions: {
                select: {
                  id: true,
                  questionCatalogId: true,
                  text: true,
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      questionId: true,
                    },
                  },
                },
              },
            },
          },
          sozialstation: {
            include: {
              helfiRunden: true,
              jugendBegriffe: true,
            }
          },
          zivilcourageStation: {
            include: {
              helfiAussagen: true,
              jugendBegriffe: true,
            },
          },
        }
      })

      return bewerbstation
    }
  })

  fastify.route({
    method: 'GET',
    url: '/tablets/gruppen',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const gruppen = await fastify.prismaClient.bewerbsteam.findMany({
        where: {
          // TODO: Add Jugend Filter
          //...(true ? { altersklasse: Altersklasse.HELFI } : {})
        },
        select: {
          id: true,
          name: true,
          altersklasse: true,
          jugendgruppe: true,
          teilnehmer: {
            select: {
              pernr: true,
            },
          },
        },
      })

      return gruppen
    }
  })

  fastify.route({
    method: 'GET',
    url: '/tablets/gruppen/:gruppenId',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const gruppen = await fastify.prismaClient.bewerbsteam.findUnique({
        where: {
          //@ts-ignore
          id: +request.params.gruppenId,
        },
        select: {
          id: true,
          name: true,
          altersklasse: true,
          jugendgruppe: true,
          teilnehmer: {
            select: {
              pernr: true,
            },
          },
        },
      })

      return gruppen
    }
  })

  fastify.route({
    method: 'GET',
    url: '/tablets/questions',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const teilnehmer = await fastify.prismaClient.bewerbsteilnehmer.findUnique({
        where: {
          // @ts-ignore
          pernr: +request.query.pernr,
        },
        include: {
          bewerbsteam: true,
        }
      })

      const station = await fastify.prismaClient.bewerbstation.findUnique({
        where: {
          id: 1
        },
        include: {
          helfiFragenkatalog: {
            include: {
              questions: {
                select: {
                  id: true,
                  questionCatalogId: true,
                  text: true,
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      questionId: true,
                    },
                  },
                },
              },
            },
          },
          jugend1Fragenkatalog: {
            include: {
              questions: {
                select: {
                  id: true,
                  questionCatalogId: true,
                  text: true,
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      questionId: true,
                    },
                  },
                },
              },
            },
          },
          jugend2Fragenkatalog: {
            include: {
              questions: {
                select: {
                  id: true,
                  questionCatalogId: true,
                  text: true,
                  answers: {
                    select: {
                      id: true,
                      text: true,
                      questionId: true,
                    },
                  },
                },
              },
            },
          },
        }
      })

      if (teilnehmer.bewerbsteam.altersklasse === Altersklasse.HELFI) {

      } else {
        // @ts-ignore
        return station.jugendFragenkatalog
      }


      const gruppen = await fastify.prismaClient.bewerbsteam.findMany({
        select: {
          id: true,
          name: true,
          altersklasse: true,
          jugendgruppe: true,
          teilnehmer: {
            select: {
              pernr: true,
            },
          },
        },
      })

      return gruppen
    }
  })

  fastify.route({
    method: 'GET',
    url: '/tablets/praxisstationen',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {

      const stationen = await fastify.prismaClient.bewerbstation.findMany({
        where: {
          type: StationType.PRACTICAL,
        },
      })

      return stationen
    }
  })

  fastify.route({
    method: 'GET',
    url: '/tablets/theoriestationen',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {

      const stationen = await fastify.prismaClient.bewerbstation.findMany({
        where: {
          type: StationType.THEORY,
        },
      })

      return stationen
    }
  })

  fastify.route({
    method: 'GET',
    url: '/tablets/stationen',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {

      const stationen = await fastify.prismaClient.bewerbstation.findMany({
        where: {
          //@ts-ignore
          type: request.query.type,
        },
      })

      return stationen
    }
  })

  fastify.route({
    method: 'POST',
    url: '/tablets/submitQuestions',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      console.log(request.body)

      let gruppe
      let teilnehmer

      //@ts-ignore
      if ([Altersklasse.JUGEND1, Altersklasse.JUGEND2].includes(request.body.questionnaireType)) {
        teilnehmer = await fastify.prismaClient.bewerbsteilnehmer.findUnique({
          where: {
            //@ts-ignore
            pernr: +request.body.pernr,
          },
          include: {
            bewerbsteam: true,
          }
        })

        gruppe = teilnehmer?.bewerbsteam

        if (!teilnehmer || !gruppe) {
          throw fastify.httpErrors.notAcceptable('Gruppe kann nicht ermittelt werden (Personalnummer falsch?)')
        }
      } else {
        gruppe = await fastify.prismaClient.bewerbsteam.findUnique({
          where: {
            //@ts-ignore
            id: +request.body.group,
          }
        })
      }

      if (!gruppe) {
        throw fastify.httpErrors.notAcceptable('Gruppe kann nicht ermittelt werden')
      }

      const answerst =
        //@ts-ignore
        request.body.answers.map(({ checkedAnswers }) => checkedAnswers)
          .reduce((acc, currentValue) => ([...acc, ...currentValue]), [])

      const answers = await fastify.prismaClient.theorieBewertung.create({
        data: {
          gruppeId: gruppe.id,
          //@ts-ignore
          stationId: +request.body.stationId,
          ...(teilnehmer ? { teilnehmerId: teilnehmer.pernr } : {}),
          antworten: {
            createMany: {
              //@ts-ignore
              data: request.body.answers.map(({ checkedAnswers }) => checkedAnswers)
                .reduce((acc, currentValue) => ([...acc, ...currentValue]), [])
                .map((checkedAnswerId) => ({
                  antwortId: checkedAnswerId,
                })),
            },
          },
        },
      })

      return {
        success: true,
      }
    }
  })

  fastify.route({
    method: 'POST',
    url: '/tablets/submitPraxis',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      console.log(request.body)

      let praxisBewertung = await fastify.prismaClient.praxisBewertung.findUnique({
        where: {
          gruppeId_stationId: {
            //@ts-ignore
            stationId: request.body.stationId,
            //@ts-ignore
            gruppeId: request.body.gruppeId,
          }
        }
      })

      if (!praxisBewertung) {
        praxisBewertung = await fastify.prismaClient.praxisBewertung.create({
          data: {
            //@ts-ignore
            gruppeId: request.body.gruppeId,
            //@ts-ignore
            stationId: request.body.stationId,
            //@ts-ignore
            masterfrage: request.body.masterfrage ? request.body.masterfrage : undefined,
          }
        })
      }

      const all = await fastify.prismaClient.praxisBewertung.update({
        where: {
          gruppeId_stationId: {
            gruppeId: praxisBewertung.gruppeId,
            stationId: praxisBewertung.stationId,
          },
        },
        data: {
          //@ts-ignore
          masterfrage: request.body.masterfrage ? request.body.masterfrage : praxisBewertung.masterfrage,
          bewertungen: {
            createMany: {
              //@ts-ignore
              data: request.body.kriterium.map((kriterium) => ({
                kriteriumId: kriterium.id,
                rating: kriterium.rating,
                // @ts-ignore
                startnummer: +request.body.startnummer,
              })),
            },
          },
          //@ts-ignore
          ...(request.body.einspruch ? { einspruch: true } : {})
        },
      })

      return {
        success: true,
      }
    }
  })

  fastify.route({
    method: 'POST',
    url: '/tablets/submitSozial',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      console.log(request.body)

      const gruppe = await fastify.prismaClient.bewerbsteam.findUnique({
        where: {
          // @ts-ignore
          id: request.body.gruppeId,
        }
      })

      const existingBewertungenCount = await fastify.prismaClient.sozialBewertung.count({
        where: {
          gruppeId: gruppe.id,
          // @ts-ignore
          stationId: request.body.stationId,
        }
      })

      if (existingBewertungenCount > 0) {
        throw fastify.httpErrors.internalServerError('Bewertung bereits übermittelt')
      }

      if (gruppe.altersklasse === Altersklasse.HELFI) {
        const bewertungen = await fastify.prismaClient.sozialBewertung.createMany({
          // @ts-ignore
          data: request.body.runden.map((runde) => ({
            gruppeId: gruppe.id,
            // @ts-ignore
            stationId: request.body.stationId,
            helfiRundeId: runde.id,
            erkannt: runde.erkannt,
          }))
        })

        return {
          success: true,
        }
      } else {
        // JUGEND1 und JUGEND2
        const bewertungen = await fastify.prismaClient.sozialBewertung.createMany({
          // @ts-ignore
          data: request.body.begriffe.map((begriff) => ({
            gruppeId: gruppe.id,
            // @ts-ignore
            stationId: request.body.stationId,
            jugendBegriffId: begriff.id,
            erkannt: begriff.erkannt,
            grundsatzErkannt: begriff.grundsatzErkannt,
          }))
        })

        return {
          success: true,
        }
      }
    }
  })

  fastify.route({
    method: 'POST',
    url: '/tablets/submitZivilcourage',
    preHandler: [
      fastify.authenticateTablet,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      console.log(request.body)

      const gruppe = await fastify.prismaClient.bewerbsteam.findUnique({
        where: {
          // @ts-ignore
          id: request.body.gruppeId,
        }
      })

      const existingBewertungenCount = await fastify.prismaClient.zivilcourageBewertung.count({
        where: {
          gruppeId: gruppe.id,
          // @ts-ignore
          stationId: request.body.stationId,
        }
      })

      if (existingBewertungenCount > 0) {
        throw fastify.httpErrors.internalServerError('Bewertung bereits übermittelt')
      }

      if (gruppe.altersklasse === Altersklasse.HELFI) {
        const bewertungen = await fastify.prismaClient.zivilcourageBewertung.createMany({
          // @ts-ignore
          data: request.body.aussagen.map((aussage) => ({
            gruppeId: gruppe.id,
            // @ts-ignore
            stationId: request.body.stationId,
            helfiAussageId: aussage.id,
            anzahlRichtigStehend: aussage.stehtRichtig.filter((stehtRichtig) => stehtRichtig).length,
          }))
        })

        return {
          success: true,
        }
      } else {
        // JUGEND1 und JUGEND2
        const bewertungen = await fastify.prismaClient.zivilcourageBewertung.createMany({
          // @ts-ignore
          data: request.body.begriffe.map((begriff) => ({
            gruppeId: gruppe.id,
            // @ts-ignore
            stationId: request.body.stationId,
            jugendBegriffId: begriff.id,
            erkannt: begriff.erkannt,
          }))
        })

        return {
          success: true,
        }
      }
    }
  })

}
