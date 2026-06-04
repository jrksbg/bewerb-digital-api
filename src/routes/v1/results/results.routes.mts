import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyInstanceWithPrisma } from '../../../app.mjs';
import { Altersklasse, PracticalRating, StationType } from '../../../utils/enums.mjs';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import * as path from 'node:path';

export default async function ResultsRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions)  {

  const auswertung = async (stationId: number, gruppeId: number) => {
    const station = await fastify.prismaClient.bewerbstation.findUnique({
      where: {
        id: stationId,
      },
    })

    const gruppe = await fastify.prismaClient.bewerbsteam.findUnique({
      where: {
        id: gruppeId,
      },
    })

    if (station.type === StationType.PRACTICAL) {
      const stationTemplate = await fastify.prismaClient.praxisstation.findFirst({
        where: {
          [gruppe.altersklasse === Altersklasse.HELFI ? 'helfiUsage' : gruppe.altersklasse === Altersklasse.JUGEND1 ? 'jugend1Usage' : 'jugend2Usage']: {
            some: {
              id: station.id,
            },
          },
        },
        include: {
          masterfrage: true,
        }
      })

      const praxisBewertungen = await fastify.prismaClient.bewertungskriterium.findMany({
        where: {
          bewerter: {
            praxisstationId: stationTemplate.id,
          }
        }
      })

      const praxisBewertung = await fastify.prismaClient.praxisBewertung.findUnique({
        where: {
          gruppeId_stationId: {
            gruppeId: gruppe.id,
            stationId: station.id,
          },
        }
      })

      /*const praxisBewertungen = await fastify.prismaClient.bewertungskriterium.findMany({
        where: {
          bewerter: {
            praxisstation: {
              [gruppe.altersklasse === Altersklasse.HELFI ? 'helfiUsage' : gruppe.altersklasse === Altersklasse.JUGEND1 ? 'jugend1Usage' : 'jugend2Usage']: {
                some: {
                  id: station.id
                }
              }
            }
            //...(gruppe.altersklasse === Altersklasse.HELFI ? { helfiRelevant: true } : {}),
            //bewerbstationId: station.id,
          },
        }
      })*/

      const bewertungsbogenResults = await Promise.all(praxisBewertungen.map(async (kriterium) => {
        const bewertung = await fastify.prismaClient.bewertungskriteriumBewertung.findFirst({
          where: {
            kriteriumId: kriterium.id,
            bewertung: {
              stationId: stationId,
              gruppeId: gruppeId,
            },
          },
        })

        if (bewertung) {
          let punkte = 0

          switch (bewertung.rating) {
            case PracticalRating.RED:
              punkte = 0
              break
            case PracticalRating.YELLOW:
              punkte = kriterium.punkte * 0.5
              break
            case PracticalRating.GREEN:
              punkte = kriterium.punkte
              break
            default:
              punkte = 0
          }

          return {
            ...kriterium,
            startnummer: bewertung.startnummer,
            bewertetePunkte: punkte,
            open: false,
          }
        } else {
          return {
            ...kriterium,
            bewertetePunkte: 0,
            open: true,
          }
        }
      }))

      const bewertung = await fastify.prismaClient.praxisBewertung.findUnique({
        where: {
          gruppeId_stationId: {
            gruppeId: gruppeId,
            stationId: stationId,
          },
        },
      })

      let masterfragePunkte = 0

      if (bewertung) {
        switch (bewertung.masterfrage as PracticalRating) {
          case PracticalRating.RED:
            masterfragePunkte = 0
            break
          case PracticalRating.YELLOW:
            masterfragePunkte = stationTemplate.masterfrage.punkte * 0.5
            break
          case PracticalRating.GREEN:
            masterfragePunkte = stationTemplate.masterfrage.punkte
            break
        }
      }

      return {
        stationId,
        gruppeId,
        station,
        gruppe,
        bewertungsbogenResults,
        masterfragePunkte,
        einspruch: bewertung?.einspruch || false,
        abgeschlossen: bewertungsbogenResults.reduce((acc, result) => !result.open && acc, true),
        stationTemplate: stationTemplate,
      }
    } else if (station.type === StationType.THEORY) {

      const getFragebogenId = (altersklasse: Altersklasse) => {
        switch (altersklasse) {
          case Altersklasse.HELFI:
            return station.helfiFragenkatalogId
          case Altersklasse.JUGEND1:
            return station.jugend1FragenkatalogId
          case Altersklasse.JUGEND2:
            return station.jugend2FragenkatalogId
        }
      }

      // THEORIE
      const fragebogen = await fastify.prismaClient.questionCatalog.findUnique({
        where: {
          id: getFragebogenId(gruppe.altersklasse as Altersklasse),
        },
        include: {
          questions: {
            include: {
              answers: true,
            },
          },
        },
      })

      if (gruppe.altersklasse === Altersklasse.HELFI) {
        // Nur 1 Fragebogen
        const bewertung = await fastify.prismaClient.theorieBewertung.findFirst({
          where: {
            gruppeId: gruppeId,
            stationId: stationId,
          },
          include: {
            antworten: true,
          }
        })

        if (bewertung) {
          const result = []
          for (let fragebogenFrage of fragebogen.questions) {
            const frage = {
              fragebogenFrage,
              antworten: [],
              korrekt: true,
            }
            for (let antwortmoeglichkeit of fragebogenFrage.answers) {
              const checkedAnswer = bewertung.antworten.filter((antwort) => antwort.antwortId === antwortmoeglichkeit.id)[0]

              frage.antworten.push({
                antwortmoeglichkeit,
                checked: !!checkedAnswer,
              })

              if ((!antwortmoeglichkeit.correctAnswer && checkedAnswer) || (antwortmoeglichkeit.correctAnswer && !checkedAnswer)) {
                /*frage.antworten.push({
                  antwortmoeglichkeit,
                  checked: !!checkedAnswer,
                })*/
                frage.korrekt = false
              }

              /*const checkedAnswer = bewertung.antworten.filter((antwort) => antwort.antwortId === antwortmoeglichkeit.id)[0]

              if (antwortmoeglichkeit.correctAnswer && checkedAnswer) {
                frage.antworten.push({
                  antwortmoeglichkeit,
                  checked: true,
                })
              }
              if ((!antwortmoeglichkeit.correctAnswer && checkedAnswer) || (antwortmoeglichkeit.correctAnswer && !checkedAnswer)) {
                frage.antworten.push({
                  antwortmoeglichkeit,
                  checked: !!checkedAnswer,
                })
                frage.korrekt = false
              }*/
            }
            result.push(frage)
          }

          return {
            gruppeId,
            gruppe,
            station,
            stationId,
            result,
            helfi: true,
            open: false,
            questionnaireSubmitted: true,
            allQuestionnairesSubmitted: true,
            korrekteFragen: result.filter((result) => result.korrekt).length,
            anzahlFragen: fragebogen.questions.length,
          }
        } else {
          return {
            gruppeId,
            gruppe,
            station,
            stationId,
            open: true,
            helfi: true,
            questionnaireSubmitted: false,
            allQuestionnairesSubmitted: false,
            korrekteFragen: 0,
            anzahlFragen: fragebogen.questions.length,
          }
        }
      } else {
        // Je Teilnehmer 1 Fragebogen
        const gruppenmitglieder = await fastify.prismaClient.bewerbsteilnehmer.findMany({
          where: {
            bewerbsteamId: gruppeId,
          },
        })

        const teilnehmerResults = []

        let completed = true
        let completedCount = 0

        for (let gruppenmitglied of gruppenmitglieder) {
          const bewertung = await fastify.prismaClient.theorieBewertung.findUnique({
            where: {
              gruppeId_stationId_teilnehmerId: {
                gruppeId: gruppeId,
                stationId: stationId,
                teilnehmerId: gruppenmitglied.pernr,
              },
            },
            include: {
              antworten: true,
            }
          })

          if (bewertung) {
            const result = []
            for (let fragebogenFrage of fragebogen.questions) {
              const frage = {
                fragebogenFrage,
                antworten: [],
                korrekt: true,
              }
              for (let antwortmoeglichkeit of fragebogenFrage.answers) {
                const checkedAnswer = bewertung.antworten.filter((antwort) => antwort.antwortId === antwortmoeglichkeit.id)[0]

                frage.antworten.push({
                  antwortmoeglichkeit,
                  checked: !!checkedAnswer,
                })

                /*if ((antwortmoeglichkeit.correctAnswer && checkedAnswer) || (!antwortmoeglichkeit.correctAnswer && !checkedAnswer)) {
                  frage.antworten.push({
                    antwortmoeglichkeit,
                    checked: !!checkedAnswer,
                  })
                }*/
                if ((!antwortmoeglichkeit.correctAnswer && checkedAnswer) || (antwortmoeglichkeit.correctAnswer && !checkedAnswer)) {
                  /*frage.antworten.push({
                    antwortmoeglichkeit,
                    checked: !!checkedAnswer,
                  })*/
                  frage.korrekt = false
                }
              }
              result.push(frage)
            }
            teilnehmerResults.push({
              gruppeId,
              stationId,
              teilnehmer: gruppenmitglied,
              teilnehmerId: gruppenmitglied.pernr,
              result,
              helfi: false,
              questionnaireSubmitted: true,
              korrekteFragen: result.filter((result) => result.korrekt).length,
              anzahlFragen: fragebogen.questions.length,
            })
            completedCount++
          } else {
            const result = []
            completed = false
            for (let fragebogenFrage of fragebogen.questions) {
              const frage = {
                fragebogenFrage,
                antworten: [],
                korrekt: true,
              }
              for (let antwortmoeglichkeit of fragebogenFrage.answers) {
                frage.antworten.push({
                  antwortmoeglichkeit,
                  checked: false,
                })
                frage.korrekt = false
              }
              result.push(frage)
            }

            teilnehmerResults.push({
              gruppeId,
              stationId,
              teilnehmer: gruppenmitglied,
              teilnehmerId: gruppenmitglied.pernr,
              result,
              helfi: false,
              questionnaireSubmitted: false,
              korrekteFragen: 0,
              anzahlFragen: fragebogen.questions.length,
            })
          }
        }

        return {
          gruppeId,
          stationId,
          gruppe,
          station,
          teilnehmerResults,
          // Ein Teilnehemr setzt aus
          allQuestionnairesSubmitted: completed || completedCount === gruppenmitglieder.length - 1,
        }
      }
    } else if (station.type === StationType.SOCIAL) {
      const socialBewertungen = await fastify.prismaClient.sozialBewertung.findMany({
        where: {
          gruppeId: gruppe.id,
          stationId: station.id,
        }
      })

      if (socialBewertungen.length === 0) {
        return {
          station,
          gruppe,
          abgeschlossen: false
        }
      }

      const sozialStation = await fastify.prismaClient.sozialstation.findUnique({
        where: {
          id: station.sozialstationId,
        },
        include: {
          helfiRunden: true,
          jugendBegriffe: true,
        },
      })

      let ergebnis: any

      if (gruppe.altersklasse === Altersklasse.HELFI) {

        ergebnis = sozialStation.helfiRunden.map((runde) => {
          const bewertung = socialBewertungen.filter((bewertung) => runde.id === bewertung.helfiRundeId)[0]
          return {
            runde,
            erkannt: bewertung?.erkannt || false,
            punkte: bewertung?.erkannt ? runde.punkteProTeilnehmer : 0,
            erfasst: !!bewertung,
          }
        })
      } else {
        ergebnis = sozialStation.jugendBegriffe.map((begriff) => {
          const bewertung = socialBewertungen.filter((bewertung) => begriff.id === bewertung.jugendBegriffId)[0]

          return {
            begriff,
            erkannt: bewertung?.erkannt || false,
            grundsatzErkannt: bewertung?.grundsatzErkannt || false,
            punkte: !bewertung?.erkannt
              ? 0
              : !begriff.grundsatz
                ? begriff.punkteErraten
                : bewertung?.grundsatzErkannt
                  ? begriff.punkteErraten * 2
                  : begriff.punkteErraten,
            erfasst: !!bewertung,
          }
        })
      }

      return {
        station,
        gruppe,
        ergebnis,
        abgeschlossen: true
      }
    } else {
      // ZIVILCOURAGE

      const zivilbewertungen = await fastify.prismaClient.zivilcourageBewertung.findMany({
        where: {
          gruppeId: gruppe.id,
          stationId: station.id,
        }
      })

      if (zivilbewertungen.length === 0) {
        return {
          station,
          gruppe,
          abgeschlossen: false
        }
      }

      const zivilStation = await fastify.prismaClient.zivilcurageStation.findUnique({
        where: {
          id: station.zivilcouragestationId,
        },
        include: {
          helfiAussagen: true,
          jugendBegriffe: true,
        },
      })

      let ergebnis: any

      if (gruppe.altersklasse === Altersklasse.HELFI) {

        ergebnis = zivilStation.helfiAussagen.map((aussage) => {
          const bewertung = zivilbewertungen.filter((bewertung) => aussage.id === bewertung.helfiAussageId)[0]
          return {
            aussage,
            erkannt: bewertung?.erkannt || false,
            punkte: aussage.punkteProTeilnehmer * (bewertung?.anzahlRichtigStehend || 0),
            erfasst: !!bewertung,
          }
        })
      } else {
        ergebnis = zivilStation.jugendBegriffe.map((begriff) => {
          const bewertung = zivilbewertungen.filter((bewertung) => begriff.id === bewertung.jugendBegriffId)[0]

          return {
            begriff,
            erkannt: bewertung?.erkannt || false,
            punkte: bewertung?.erkannt ? begriff.punkte : 0,
            erfasst: !!bewertung,
          }
        })
      }

      return {
        station,
        gruppe,
        ergebnis,
        abgeschlossen: true
      }
    }
  }


  // GET Catalogs
  fastify.route({
    method: 'GET',
    url: '/results',
    preHandler: [
      fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {

      const stationen = await fastify.prismaClient.bewerbstation.findMany({})

      const bewerbsgruppen = await fastify.prismaClient.bewerbsteam.findMany({})

      const data = []

      for (let gruppe of bewerbsgruppen) {
        const groupData = {
          gruppe,
          results: []
        }
        for (let station of stationen) {
          const result = await auswertung(station.id, gruppe.id)
          groupData.results.push(result)
        }

        data.push(groupData)
      }

      return data


      /*


      const gruppen = await fastify.prismaClient.bewerbsteam.findMany({
        include: {
          teilnehmer: true,
        },
      })

      const stationen = await fastify.prismaClient.bewerbstation.findMany({
        include: {
          bewerter: {
            include: {
              bewertungskriterien: true,
            },
          },
        },
      })

      const result = []

      for (let station in stationen) {
        const stationResult = {
          station: station,
          gruppen: [],
        }

        for (let gruppe in gruppen) {
          const gruppeResult = {
            gruppe: gruppe,
          }
          // Praxis
          if (station.type === StationType.PRACTICAL) {
            const bewertung = await fastify.prismaClient.praxisBewertung.findUnique({
              where: {
                gruppeId_stationId: {
                  gruppeId: gruppe.id,
                  stationId: station.id,
                },
              },
            })

            if (bewertung) {
              switch (bewertung.masterfrage as PracticalRating) {
                case PracticalRating.RED:
                  gruppeResult.masterfrage = 0
                  break
                case PracticalRating.YELLOW:
                  gruppeResult.masterfrage = station.masterfragePunkte * 0.5
                  break
                case PracticalRating.GREEN:
                  gruppeResult.masterfrage = station.masterfragePunkte
                  break
              }



              for (let bewerter of station.bewerter) {
                for (let kriterium of bewerter.bewertungskriterien) {
                  const kriteriumBewertung = await fastify.prismaClient.bewertungskriteriumBewertung.findUnique({
                    where: {
                      kriteriumId_bewertungId: {
                        kriteriumId: kriterium.id,
                        bewertungId: bewertung.id,
                      }
                    }
                  })

                  if (kriteriumBewertung) {

                  }
                }
              }
            }

            stationResult.gruppen.push(gruppeResult)

          } else {
            // Theorie
            for (let teilnehmer in gruppe.teilnehmer) {

            }
          }
        }
      }

      return gruppen

       */
    }

  })

  // Praxis PDF Export
  fastify.route({
    method: 'GET',
    url: '/results/praxis/stationen/:stationId/gruppen/:gruppeId/pdf',
    preHandler: [
      //fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {

      //@ts-ignore
      const ausw = await auswertung(+request.params.stationId, +request.params.gruppeId)

      console.log(ausw)

      const bewerterIds = Array.from(ausw.bewertungsbogenResults.reduce((acc, val) => {
        acc.add(val.bewerterId)
        return acc
      }, new Set<number>()))

      const bewerter = (await fastify.prismaClient.bewerbstationBewerter.findMany({
        where: {
          id: {
            in: bewerterIds,
          }
        }
      })).reduce((acc, val, currentIndex) => ({
        ...acc,
        [val.id]: {
          ...val,
          bewerterNummer: currentIndex,
          bewerterName: val.hauptbewerter ? 'Hauptbewerter:in' : `Bewerter:in ${currentIndex}`,
        },
      }), {})

      console.log(bewerter)


      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        margins: {
          top: 120,
          bottom: 50,
          left: 50,
          right: 50,
        },
        info: {
          Title: 'LJC 2025 Bewerbsauswertung',
          Creator: 'Bewerb Digital App',
        }
      })

      if (process.env.NODE_ENV === 'production') {
        doc.registerFont('Dunant-Regular', path.resolve('routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('routes/v1/results/NotoSans-Regular.ttf'))
      } else {
        doc.registerFont('Dunant-Regular', path.resolve('src/routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('src/routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('src/routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('src/routes/v1/results/NotoSans-Regular.ttf'))
      }


      //const stream = doc.pipe(blobStream())

      // HEADER
      doc
        .font('Dunant-Bold')
        .text('LANDESJUGENDCAMP 2025', 50, 40)
        .text('SAALBACH')
        .font('Dunant-Regular')
        .text('BEWERBSAUSWERTUNG', { paragraphGap: 50 })

      if (process.env.NODE_ENV === 'production') {
        doc.image(path.resolve('routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
      } else {
        doc.image(path.resolve('src/routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
      }


      doc
        .font('Dunant-Regular')
        .text(`Station ID: ${ausw.station.id}`)
        .text(`Station: ${ausw.station.name}`)
        .text(`Gruppe: ${ausw.gruppe.id} ${ausw.gruppe.name}`)
        .moveDown(2)
        .font('Dunant-Bold')
        .fontSize(15)
        .text('Szenario')
        .fontSize(12)
        .font('Dunant-Regular')
        .text(ausw.stationTemplate.szenarioBeschreibung)
        .moveDown(2)
        .font('Dunant-Bold')
        .fontSize(15)
        .text('Masterfrage')
        .fontSize(12)
        .font('Dunant-Regular')
        .text(ausw.stationTemplate.masterfrage.frage)
        .font('NotoSansSymbols2-Regular')
        .text('☐ ', { continued: true })
        .font('NotoSans-Regular')
        .text(`${ausw.stationTemplate.masterfrage.antwort1}`)
        .font('NotoSansSymbols2-Regular')
        .text('☐ ', { continued: true })
        .font('NotoSans-Regular')
        .text(`${ausw.stationTemplate.masterfrage.antwort2}`)
        .font('NotoSansSymbols2-Regular')
        .text('☐ ', { continued: true })
        .font('NotoSans-Regular')
        .text(`${ausw.stationTemplate.masterfrage.antwort3}`)
        .font('Dunant-Regular')
        .moveDown(1)
        .text(`Punkte Masterfrage: ${ausw.stationTemplate.masterfrage.punkte}`)
        .text(`Erreichte Punkte Masterfrage: ${ausw.masterfragePunkte}`)
        .moveDown(2)

      const erreichbarePunkte = ausw.bewertungsbogenResults.reduce((acc, result) => acc + result.punkte, 0)
      const erreichtePunkte = ausw.bewertungsbogenResults.reduce((acc, result) => acc + result.bewertetePunkte, 0)

      doc
        .font('Dunant-Bold')
        .fontSize(15)
        .text('Praxisstationen')
        .fontSize(12)
        .font('Dunant-Regular')
        .moveDown()
        .text(`Erreichte Punkte: ${erreichtePunkte} von ${erreichbarePunkte}`)
        .moveDown()


      for (let bewerterItem of Object.values(bewerter)) {
        doc
          .font('Dunant-Bold')
          .fontSize(15)
          .text((bewerterItem as any).bewerterName)
          .fontSize(12)
          .font('Dunant-Regular')
          .moveDown()

        const filteredAusw =
          ausw.bewertungsbogenResults
            .filter((result) => result.bewerterId === (bewerterItem as any).id)

        // @ts-ignore
        const startnummer = filteredAusw[0]?.startnummer

        doc
          .font('Dunant-Bold')
          .text('Startnummer: ', { continued: true })
          .font('Dunant-Regular')
          .text(`${startnummer}`)
          .moveDown()


        doc.table({
          rowStyles: (i) => {
            if (i === 0 || i === filteredAusw.length + 1) return { backgroundColor: '#ccc', font: 'Dunant-Bold' }
          },
          // @ts-ignore
          data: [
            [{ text: 'Kriterium', font: { font: 'Dunant-Bold' } }, { text: 'Mögl. Punkte', font: 'Dunant-Bold' }, { text: 'Erreichte Punkte', font: 'Dunant-Bold' }],
            ...(filteredAusw.map((result) => ([
              result.text, result.punkte, result.bewertetePunkte
            ]))),
            [
              { text: 'SUMME' },
              {
                text: filteredAusw.reduce((acc, result) => acc + result.punkte, 0)
              },
              {
                text: filteredAusw.reduce((acc, result) => acc + result.bewertetePunkte, 0)
              }
            ]
          ]
        })
          .moveDown(2)
      }



      /*
      doc.table({
        rowStyles: (i) => {
          if (i === 0) return { backgroundColor: '#ccc', font: 'Dunant-Bold' }
        },
        data: [
          [{ text: 'Bewerter:in', font: 'Dunant-Bold' }, { text: 'Kriterium', font: { font: 'Dunant-Bold' } }, { text: 'Mögl. Punkte', font: 'Dunant-Bold' }, { text: 'Erreichte Punkte', font: 'Dunant-Bold' }],
          ...(ausw.bewertungsbogenResults.map((result) => ([
            bewerter[result.bewerterId].bewerterName, result.text, result.punkte, result.bewertetePunkte
          ]))),
          [
            { colSpan: 2, text: 'SUMME' },
            {
              text: ausw.bewertungsbogenResults.reduce((acc, result) => acc + result.punkte, 0)
            },
            {
              text: ausw.bewertungsbogenResults.reduce((acc, result) => acc + result.bewertetePunkte, 0)
            }
          ]
        ]
      })
      */

      //Global Edits to All Pages (Header/Footer, etc)
      let pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)

        //Header: Add page number
        let oldTopMargin = doc.page.margins.top
        doc.page.margins.top = 0 //Dumb: Have to remove top margin in order to write into it
        doc
          .fillColor('black')
          .font('Dunant-Bold')
          .text('LANDESJUGENDCAMP 2025', 50, 40)
          .text('SAALBACH')
          .font('Dunant-Regular')
          .text('BEWERBSAUSWERTUNG', { paragraphGap: 50 })

        if (process.env.NODE_ENV === 'production') {
          doc.image(path.resolve('routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        } else {
          doc.image(path.resolve('src/routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        }
        doc.page.margins.top = oldTopMargin // ReProtect top margin

        //Footer: Add page number
        let oldBottomMargin = doc.page.margins.bottom
        doc.page.margins.bottom = 0 //Dumb: Have to remove bottom margin in order to write into it
        doc
          .fontSize(10)
          .fillColor('black')
          .text(`Druck erzeugt am: ${dayjs().format('DD.MM.YYYY HH:mm:ss')}`,
            doc.page.margins.left,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { lineBreak: false }
          )
          .text(
            `Seite: ${i + 1} von ${pages.count}`,
            0,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { align: 'right' }
          )
          .fontSize(12)
        doc.page.margins.bottom = oldBottomMargin // ReProtect bottom margin
      }

      doc.end()

      return reply.send(doc)
    }

  })

  // Praxis XLSX Export
  fastify.route({
    method: 'GET',
    url: '/results/praxis/stationen/:stationId/gruppen/:gruppeId/xlsx',
    preHandler: [
      //fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      //@ts-ignore
      const ausw = await auswertung(+request.params.stationId, +request.params.gruppeId)

      console.log(ausw)

      const bewerterIds = Array.from(ausw.bewertungsbogenResults.reduce((acc, val) => {
        acc.add(val.bewerterId)
        return acc
      }, new Set<number>()))

      const bewerter = (await fastify.prismaClient.bewerbstationBewerter.findMany({
        where: {
          id: {
            in: bewerterIds,
          }
        }
      })).reduce((acc, val, currentIndex) => ({
        ...acc,
        [val.id]: {
          ...val,
          bewerterNummer: currentIndex + 1,
          bewerterName: val.hauptbewerter ? 'Hauptbewerter:in' : `Bewerter:in ${currentIndex + 1}`,
        },
      }), {})

      console.log(bewerter)

      const data = [
        ['LANDESJUGENDCAMP 2025'],
        ['SAALBACH'],
        ['BEWERBSAUSWERTUNG'],
        [],
        ['Station ID', ausw.station.id],
        ['Gruppe', `${ausw.gruppe.id} ${ausw.gruppe.name}`],
        [],
        [],
        ['Bewerter:in', 'Kriterium', 'Mögl. Punkte', 'Erreichte Punkte'],
        ...(ausw.bewertungsbogenResults.map((result) => ([
          bewerter[result.bewerterId].bewerterName, result.text, result.punkte, result.bewertetePunkte
        ]))),
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(data)
      const workbook = XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Auswertung');

      const buffer = XLSX.writeFile(workbook, 'export.xlsx', {
        type: 'buffer',
        compression: true,
      })

      reply.header('Content-Disposition', 'attachment; filename="export.xlsx"')

      return reply.send(buffer)
    }

  })

  // Theorie PDF Export
  fastify.route({
    method: 'GET',
    url: '/results/theorie/stationen/:stationId/gruppen/:gruppeId/pdf',
    preHandler: [
      //fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      //@ts-ignore
      const ausw = await auswertung(+request.params.stationId, +request.params.gruppeId)

      console.log(ausw)


      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        margins: {
          top: 120,
          bottom: 50,
          left: 50,
          right: 50,
        },
        info: {
          Title: 'LJC 2025 Bewerbsauswertung',
          Creator: 'Bewerb Digital App',
        },
      })

      if (process.env.NODE_ENV === 'production') {
        doc.registerFont('Dunant-Regular', path.resolve('routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('routes/v1/results/NotoSans-Regular.ttf'))
      } else {
        doc.registerFont('Dunant-Regular', path.resolve('src/routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('src/routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('src/routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('src/routes/v1/results/NotoSans-Regular.ttf'))
      }


      if ((ausw.gruppe.altersklasse === Altersklasse.HELFI && !ausw.result) || ausw.teilnehmerResults?.length === 0) {
        doc
          .font('Dunant-Bold')
          .text(`Station ID: `, { continued: true })
          .font('Dunant-Regular')
          .text(`${ausw.station.id}`)
          .font('Dunant-Bold')
          .text(`Station: `, { continued: true })
          .font('Dunant-Regular')
          .text(`${ausw.station.name} (ID: ${ausw.station.id})`)
          .font('Dunant-Bold')
          .text(`Ort: `, { continued: true })
          .font('Dunant-Regular')
          .text(ausw.station.location)
          .font('Dunant-Bold')
          .text(`Gruppe: `, { continued: true })
          .font('Dunant-Regular')
          .text(`${ausw.gruppe.name} (${ausw.gruppe.jugendgruppe})`)
      }

      if (ausw.gruppe.altersklasse === Altersklasse.HELFI) {
        //doc.end()
        //return reply.send(doc)
        ausw.teilnehmerResults = [
          //{ result: ausw.result }
          {
            ...ausw
          }
        ]
      }


      for (let i = 0; i < ausw.teilnehmerResults.length; i++) {
        const teilnehmerResult = ausw.teilnehmerResults[i]

        doc
          .font('Dunant-Bold')
          .text(`Station ID: `, { continued: true })
          .font('Dunant-Regular')
          .text(`${ausw.station.id}`)
          .font('Dunant-Bold')
          .text(`Station: `, { continued: true })
          .font('Dunant-Regular')
          .text(`${ausw.station.name} (ID: ${ausw.station.id})`)
          .font('Dunant-Bold')
          .text(`Ort: `, { continued: true })
          .font('Dunant-Regular')
          .text(ausw.station.location)
          .font('Dunant-Bold')
          .text(`Gruppe: `, { continued: true })
          .font('Dunant-Regular')
          .text(`${ausw.gruppe.name} (${ausw.gruppe.jugendgruppe})`)

        if (ausw.gruppe.altersklasse !== Altersklasse.HELFI) {
          doc
            .font('Dunant-Bold')
            .text(`Startnummer: `, { continued: true })
            .font('Dunant-Regular')
            .text(`${teilnehmerResult.teilnehmer?.pernr}`.slice(0, -1) + '-' + `${teilnehmerResult.teilnehmer?.pernr}`.slice(-1))
            .moveDown()
        }

       doc
          .font('Dunant-Bold')
          .text(`Korrekt beantwortet: `, { continued: true })
          .font('Dunant-Regular')
          .text(`${teilnehmerResult.korrekteFragen} von ${teilnehmerResult.anzahlFragen} Fragen`)

        for (let result of teilnehmerResult.result) {
          console.log(result)
          console.log(result.antworten)
          doc
            .moveDown(1)
            .font('Dunant-Bold')
            .text(`${result.fragebogenFrage.text}`)

          for (let antwort of result.antworten) {
            doc
              //'Source Sans Pro',Roboto,"San Francisco","Segoe UI",sans-serif
              .font('Dunant-Regular')
              .fillColor(
                (!antwort.checked && !antwort.antwortmoeglichkeit.correctAnswer)
                || (antwort.checked && antwort.antwortmoeglichkeit.correctAnswer)
                  ? 'black'//'green'
                  : 'red'
              )
              .font('NotoSansSymbols2-Regular')
              .text(`${antwort.checked ? '☒' : '☐'} `, { continued: true })
              .font('NotoSans-Regular')
              .text(`${antwort.antwortmoeglichkeit.text}`)
              .font('Dunant-Regular')
          }

          doc.fillColor('black').moveDown(1)
        }

        if (i !== ausw.teilnehmerResults.length - 1) {
          doc.addPage()
        }
      }



      //Global Edits to All Pages (Header/Footer, etc)
      let pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)

        //Header: Add page number
        let oldTopMargin = doc.page.margins.top
        doc.page.margins.top = 0 //Dumb: Have to remove top margin in order to write into it
        doc
          .font('Dunant-Bold')
          .text('LANDESJUGENDCAMP 2025', 50, 40)
          .text('SAALBACH')
          .font('Dunant-Regular')
          .text('BEWERBSAUSWERTUNG', { paragraphGap: 50 })

        if (process.env.NODE_ENV === 'production') {
          doc.image(path.resolve('routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        } else {
          doc.image(path.resolve('src/routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        }
        doc.page.margins.top = oldTopMargin // ReProtect top margin

        //Footer: Add page number
        let oldBottomMargin = doc.page.margins.bottom
        doc.page.margins.bottom = 0 //Dumb: Have to remove bottom margin in order to write into it
        doc
          .fontSize(10)
          .text(`Druck erzeugt am: ${dayjs().format('DD.MM.YYYY HH:mm:ss')}`,
            doc.page.margins.left,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { lineBreak: false }
          )
          .text(
            `Seite: ${i + 1} von ${pages.count}`,
            0,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { align: 'right' }
          )
        doc.page.margins.bottom = oldBottomMargin // ReProtect bottom margin
      }

      doc.end()

      return reply.send(doc)
    }

  })

  // Zivil PDF Export
  fastify.route({
    method: 'GET',
    url: '/results/sozial/stationen/:stationId/gruppen/:gruppeId/pdf',
    preHandler: [
      //fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      //@ts-ignore
      const ausw = await auswertung(+request.params.stationId, +request.params.gruppeId)

      console.log(ausw)


      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        margins: {
          top: 120,
          bottom: 50,
          left: 50,
          right: 50,
        },
        info: {
          Title: 'LJC 2025 Bewerbsauswertung',
          Creator: 'Bewerb Digital App',
        },
      })

      if (process.env.NODE_ENV === 'production') {
        doc.registerFont('Dunant-Regular', path.resolve('routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('routes/v1/results/NotoSans-Regular.ttf'))
      } else {
        doc.registerFont('Dunant-Regular', path.resolve('src/routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('src/routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('src/routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('src/routes/v1/results/NotoSans-Regular.ttf'))
      }


      doc
        .font('Dunant-Bold')
        .text(`Station ID: `, { continued: true })
        .font('Dunant-Regular')
        .text(`${ausw.station.id}`)
        .font('Dunant-Bold')
        .text(`Station: `, { continued: true })
        .font('Dunant-Regular')
        .text(`${ausw.station.name} (ID: ${ausw.station.id})`)
        .font('Dunant-Bold')
        .text(`Ort: `, { continued: true })
        .font('Dunant-Regular')
        .text(ausw.station.location)
        .font('Dunant-Bold')
        .text(`Gruppe: `, { continued: true })
        .font('Dunant-Regular')
        .text(`${ausw.gruppe.name} (${ausw.gruppe.jugendgruppe})`)
        .moveDown(2)

      if (ausw.gruppe.altersklasse === Altersklasse.HELFI) {

        doc.table({
          rowStyles: (i) => {
            if (i === 0 || i === ausw.ergebnis.length + 1) return { backgroundColor: '#ccc', font: 'Dunant-Bold' }
          },
          // @ts-ignore
          data: [
            [{ text: 'Runde', font: { font: 'Dunant-Bold' } }, { text: 'Bild', font: 'Dunant-Bold' }, { text: 'Einordnung', font: 'Dunant-Bold' }, { text: 'Mögl. Punkte', font: 'Dunant-Bold' }, { text: 'Erreichte Punkte', font: 'Dunant-Bold' }],
            ...(ausw.ergebnis.map((rundenergebnis, index) => ([
              index + 1, rundenergebnis.runde.bild, rundenergebnis.runde.type, { text: rundenergebnis.runde.punkteProTeilnehmer,  align: { x: 'right', y: 'top' } }, { text: rundenergebnis.punkte, align: { x: 'right', y: 'top' } }
            ]))),
            [
              { text: 'SUMME', colSpan: 3 },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => acc + rundenergebnis.runde.punkteProTeilnehmer, 0),
                align: { x: 'right', y: 'top' }
              },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => acc + rundenergebnis.punkte, 0),
                align: { x: 'right', y: 'top' }
              }
            ]
          ]
        })
          .moveDown(2)

      } else {

        doc.table({
          rowStyles: (i) => {
            if (i === 0 || i === ausw.ergebnis.length + 1) return { backgroundColor: '#ccc', font: 'Dunant-Bold' }
          },
          columnStyles: [45, '*', 65, 65, 65, 50, 50],
          // @ts-ignore
          data: [
            [{ text: 'Runde', font: { font: 'Dunant-Bold' } }, { text: 'Begriff', font: 'Dunant-Bold' }, { text: 'Grundsatz', font: 'Dunant-Bold' }, { text: 'Begriff erkannt', font: 'Dunant-Bold' }, { text: 'Grundsatz erkannt', font: 'Dunant-Bold' }, { text: 'Mögl. Punkte', font: 'Dunant-Bold' }, { text: 'Err. Punkte', font: 'Dunant-Bold' }],
            ...(ausw.ergebnis.map((rundenergebnis, index) => ([
              index + 1, rundenergebnis.begriff.begriff, rundenergebnis.begriff.grundsatz ? 'ja' : 'nein', rundenergebnis.erkannt ? 'ja' : 'nein', rundenergebnis.begriff.grundsatz ? (rundenergebnis.grundsatzErkannt ? 'ja' : 'nein') : '', { text: rundenergebnis.begriff.grundsatz ? `${rundenergebnis.begriff.punkteErraten} + ${rundenergebnis.begriff.punkteErraten}` : rundenergebnis.begriff.punkteErraten,  align: { x: 'right', y: 'top' } }, { text: rundenergebnis.punkte, align: { x: 'right', y: 'top' } }
            ]))),
            [
              { text: 'SUMME', colSpan: 5 },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => {
                  if (rundenergebnis.begriff.grundsatz) {
                    return acc + 2 * rundenergebnis.begriff.punkteErraten
                  }

                  return acc + rundenergebnis.begriff.punkteErraten
                }, 0),
                align: { x: 'right', y: 'top' }
              },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => acc + rundenergebnis.punkte, 0),
                align: { x: 'right', y: 'top' }
              }
            ]
          ]
        })
          .moveDown(2)
      }



      //Global Edits to All Pages (Header/Footer, etc)
      let pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)

        //Header: Add page number
        let oldTopMargin = doc.page.margins.top
        doc.page.margins.top = 0 //Dumb: Have to remove top margin in order to write into it
        doc
          .font('Dunant-Bold')
          .text('LANDESJUGENDCAMP 2025', 50, 40)
          .text('SAALBACH')
          .font('Dunant-Regular')
          .text('BEWERBSAUSWERTUNG', { paragraphGap: 50 })

        if (process.env.NODE_ENV === 'production') {
          doc.image(path.resolve('routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        } else {
          doc.image(path.resolve('src/routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        }
        doc.page.margins.top = oldTopMargin // ReProtect top margin

        //Footer: Add page number
        let oldBottomMargin = doc.page.margins.bottom
        doc.page.margins.bottom = 0 //Dumb: Have to remove bottom margin in order to write into it
        doc
          .fontSize(10)
          .text(`Druck erzeugt am: ${dayjs().format('DD.MM.YYYY HH:mm:ss')}`,
            doc.page.margins.left,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { lineBreak: false }
          )
          .text(
            `Seite: ${i + 1} von ${pages.count}`,
            0,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { align: 'right' }
          )
        doc.page.margins.bottom = oldBottomMargin // ReProtect bottom margin
      }

      doc.end()

      return reply.send(doc)
    }

  })

  // Zivil PDF Export
  fastify.route({
    method: 'GET',
    url: '/results/zivil/stationen/:stationId/gruppen/:gruppeId/pdf',
    preHandler: [
      //fastify.authenticate,
    ],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      //@ts-ignore
      const ausw = await auswertung(+request.params.stationId, +request.params.gruppeId)

      console.log(ausw)

      const doc = new PDFDocument({
        size: 'A4',
        bufferPages: true,
        margins: {
          top: 120,
          bottom: 50,
          left: 50,
          right: 50,
        },
        info: {
          Title: 'LJC 2025 Bewerbsauswertung',
          Creator: 'Bewerb Digital App',
        },
      })

      if (process.env.NODE_ENV === 'production') {
        doc.registerFont('Dunant-Regular', path.resolve('routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('routes/v1/results/NotoSans-Regular.ttf'))
      } else {
        doc.registerFont('Dunant-Regular', path.resolve('src/routes/v1/results/Dunant-Regular.ttf'))
        doc.registerFont('Dunant-Bold', path.resolve('src/routes/v1/results/Dunant-Bold.ttf'))
        doc.registerFont('NotoSansSymbols2-Regular', path.resolve('src/routes/v1/results/NotoSansSymbols2-Regular.ttf'))
        doc.registerFont('NotoSans-Regular', path.resolve('src/routes/v1/results/NotoSans-Regular.ttf'))
      }


      doc
        .font('Dunant-Bold')
        .text(`Station ID: `, { continued: true })
        .font('Dunant-Regular')
        .text(`${ausw.station.id}`)
        .font('Dunant-Bold')
        .text(`Station: `, { continued: true })
        .font('Dunant-Regular')
        .text(`${ausw.station.name} (ID: ${ausw.station.id})`)
        .font('Dunant-Bold')
        .text(`Ort: `, { continued: true })
        .font('Dunant-Regular')
        .text(ausw.station.location)
        .font('Dunant-Bold')
        .text(`Gruppe: `, { continued: true })
        .font('Dunant-Regular')
        .text(`${ausw.gruppe.name} (${ausw.gruppe.jugendgruppe})`)
        .moveDown(2)

      if (ausw.gruppe.altersklasse === Altersklasse.HELFI) {
        doc.table({
          rowStyles: (i) => {
            if (i === 0 || i === ausw.ergebnis.length + 1) return { backgroundColor: '#ccc', font: 'Dunant-Bold' }
          },
          columnStyles: [45, '*', 75, 75],
          // @ts-ignore
          data: [
            [{ text: 'Runde', font: { font: 'Dunant-Bold' } }, { text: 'Aussage', font: 'Dunant-Bold' }, { text: 'Mögl. Punkte', font: 'Dunant-Bold' }, { text: 'Err.Punkte', font: 'Dunant-Bold' }],
            ...(ausw.ergebnis.map((rundenergebnis, index) => ([
              index + 1, rundenergebnis.aussage.aussage, { text: rundenergebnis.aussage.punkteProTeilnehmer * 5,  align: { x: 'right', y: 'top' } }, { text: rundenergebnis.punkte, align: { x: 'right', y: 'top' } }
            ]))),
            [
              { text: 'SUMME', colSpan: 2 },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => acc + 5 * rundenergebnis.aussage.punkteProTeilnehmer, 0),
                align: { x: 'right', y: 'top' }
              },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => acc + rundenergebnis.punkte, 0),
                align: { x: 'right', y: 'top' }
              }
            ]
          ]
        })
          .moveDown(2)
      } else {
        doc.table({
          rowStyles: (i) => {
            if (i === 0 || i === ausw.ergebnis.length + 1) return { backgroundColor: '#ccc', font: 'Dunant-Bold' }
          },
          columnStyles: [45, '*', 80, 75, 75],
          // @ts-ignore
          data: [
            [{ text: 'Runde', font: { font: 'Dunant-Bold' } }, { text: 'Begriff', font: 'Dunant-Bold' }, { text: 'Darstellung', font: 'Dunant-Bold' }, { text: 'Mögl. Punkte', font: 'Dunant-Bold' }, { text: 'Err.Punkte', font: 'Dunant-Bold' }],
            ...(ausw.ergebnis.map((rundenergebnis, index) => ([
              index + 1, rundenergebnis.begriff.begriff, rundenergebnis.begriff.darstellungsart === 'DRAW' ? 'zeichnerisch' : 'pantomimisch', { text: rundenergebnis.begriff.punkte,  align: { x: 'right', y: 'top' } }, { text: rundenergebnis.punkte, align: { x: 'right', y: 'top' } }
            ]))),
            [
              { text: 'SUMME', colSpan: 3 },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => acc + rundenergebnis.begriff.punkte, 0),
                align: { x: 'right', y: 'top' }
              },
              {
                text: ausw.ergebnis.reduce((acc, rundenergebnis) => acc + rundenergebnis.punkte, 0),
                align: { x: 'right', y: 'top' }
              }
            ]
          ]
        })
          .moveDown(2)
      }



      //Global Edits to All Pages (Header/Footer, etc)
      let pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)

        //Header: Add page number
        let oldTopMargin = doc.page.margins.top
        doc.page.margins.top = 0 //Dumb: Have to remove top margin in order to write into it
        doc
          .font('Dunant-Bold')
          .text('LANDESJUGENDCAMP 2025', 50, 40)
          .text('SAALBACH')
          .font('Dunant-Regular')
          .text('BEWERBSAUSWERTUNG', { paragraphGap: 50 })

        if (process.env.NODE_ENV === 'production') {
          doc.image(path.resolve('routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        } else {
          doc.image(path.resolve('src/routes/v1/results/ljc2025_logo.png'), 480, 25, {fit: [75, 75]})
        }
        doc.page.margins.top = oldTopMargin // ReProtect top margin

        //Footer: Add page number
        let oldBottomMargin = doc.page.margins.bottom
        doc.page.margins.bottom = 0 //Dumb: Have to remove bottom margin in order to write into it
        doc
          .fontSize(10)
          .text(`Druck erzeugt am: ${dayjs().format('DD.MM.YYYY HH:mm:ss')}`,
            doc.page.margins.left,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { lineBreak: false }
          )
          .text(
            `Seite: ${i + 1} von ${pages.count}`,
            0,
            doc.page.height - (oldBottomMargin/2), // Centered vertically in bottom margin
            { align: 'right' }
          )
        doc.page.margins.bottom = oldBottomMargin // ReProtect bottom margin
      }

      doc.end()

      return reply.send(doc)
    }

  })
}
