import type { FastifyInstanceWithPrisma } from '../../../app.mjs';
import type { FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import * as crypto from 'node:crypto';


function formatDateYmdH(): string {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')

  return `${year}${month}${day}${hour}`
}

const generateRKToken = () => {
  //const secret = 'zHv6S9gRnY83QVsNPrrXIHZrgRVXsy0VThgA9kFDo2uCRbzC0znWL1wROHodERe0X0NVm'
  const secret = 'QGtme3q9MLjdljl1fDQ90T0AiEpSbLVjva2rfGCtx9bVPE2bnvyW6zw74DtjHmrULRx'
  const hash = crypto.createHash('sha1').update(`${formatDateYmdH()}${secret}`).digest('hex')
  return `JGAPI-${hash}`
}

interface SignInRequestBody {
  pernr: string;
  password: string;
}

export default async function AuthRoutes(fastify: FastifyInstanceWithPrisma, opts: FastifyPluginOptions) {
  fastify.route({
    method: 'POST',
    url: '/signin',
    schema: {
      body: {
        type: 'object',
        properties: {
          pernr: { type: 'string' },
          password: { type: 'string' },
        },
        required: [ 'pernr', 'password' ],
      },
    },
    handler: async (request: FastifyRequest<{ Body: SignInRequestBody }>, reply: FastifyReply) => {
      const response = await fetch(`https://portal.s.roteskreuz.at/jgapp_api/`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'loginUser',
          campid: 1,
          username: request.body.pernr,
          password: request.body.password,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          //'Authorization': `Basic ZGV2OmRldmRldg==`,
          'token': generateRKToken(),
        },
        // Timeout auf 10 sek
        signal: AbortSignal.timeout(10000),
      }).then(response => response.json())
        .catch((err) => {
          console.log(err)
          throw fastify.httpErrors.serviceUnavailable('Portal antwortet nicht')
        })

      if (!response.valid) {
        throw fastify.httpErrors.unauthorized('Kombination Username/Passwort nicht gefunden')
      }

      if (response.details.length === 0) {
        const whitelistEntry = await fastify.prismaClient.whitelist.findUnique({
          where: {
            pernr: +request.body.pernr,
          }
        })


        if (whitelistEntry) {
          response.valid = true
          response.details = [{
            persnr: request.body.pernr,
            tag: whitelistEntry.tag,
            name: whitelistEntry.name,
            vorname: `${whitelistEntry.vorname} (WL)` || `${request.body.pernr} (WL)`,
          }]
        } else {
          throw fastify.httpErrors.unauthorized('Keine Berechtigung für diese Anwendung')
        }
      }

      const details = response.details[0]

      const token = fastify.jwt.sign({ pernr: details.persnr, tag: details.tag }, { expiresIn: '1d' })

      return {
        userdata: {
          pernr: details.persnr,
          tag: details.tag,
          name: details.name,
          vorname: details.vorname,
        },
        tag: details.tag,
        token: token,
      }
    }
  })

}
