import Actor from "./Actor"
import DomainSession from "./DomainSession"
import DomSession from "./DomSession"
import http, { IncomingMessage, ServerResponse } from "http"
import { promisify } from "util"
import { AddressInfo } from "net"
import { After, Before, setWorldConstructor } from "cucumber"
import { Interaction, ISession } from "./types"

const SESSION = process.env.SESSION
const API = process.env.API

export { Actor, DomainSession, DomSession, Interaction }

interface IbsenOptions<Api> {
  makeRenderApp: (api: Api) => ($root: HTMLElement) => void

  makeDomainApi: () => Api

  makeHttpApi: (baseurl: string) => Api

  makeRequestListener: (api: Api) => (request: IncomingMessage, response: ServerResponse) => void
}

export default function ibsen<Api>(options: IbsenOptions<Api>) {
  class World {
    private domainApi: Api
    private readonly actors = new Map<string, Actor<Api>>()
    protected readonly stoppables: Array<() => void> = []

    async getActor(actorName: string): Promise<Actor<Api>> {
      if (this.actors.has(actorName)) return this.actors.get(actorName)

      if (!SESSION) {
        throw new Error(`Please define the $SESSION environment variable`)
      }

      const session = await this.makeSession(SESSION, actorName)
      if (!session) {
        throw new Error(`No ${SESSION} defined in ${this.constructor.name}`)
      }
      await session.start()
      this.stoppables.push(session.stop.bind(session))

      const actor = new Actor(actorName, this.domainApi, session)
      this.actors.set(actorName, actor)
      return actor
    }

    async start() {
      this.domainApi = await options.makeDomainApi()
    }

    async stop() {
      for (const stoppable of this.stoppables.reverse()) {
        await stoppable()
      }
    }

    protected async makeSession(sessionType: string, actorName: string): Promise<ISession> {
      const api = await this.makeApi(API)

      switch (sessionType) {
        case "DomainSession":
          return new DomainSession(actorName, api)

        case "DomSession":
          return new DomSession(actorName, options.makeRenderApp(api))

        default:
          throw new Error(`Unsupported Session: ${sessionType}`)
      }
    }

    protected async makeApi(chatApiType: string): Promise<Api> {
      switch (chatApiType) {
        case "Direct":
          return this.domainApi

        case "HTTP":
          const app = options.makeRequestListener(this.domainApi)
          const server = http.createServer(app)
          const listen = promisify(server.listen.bind(server))
          await listen()
          this.stoppables.push(async () => {
            const close = promisify(server.close.bind(server))
            await close()
          })
          const addr = server.address() as AddressInfo
          const port = addr.port
          const baseurl = `http://localhost:${port}`
          return options.makeHttpApi(baseurl)

        default:
          throw new Error(`Unsupported ChatApi: ${chatApiType}`)
      }
    }
  }

  Before(async function () {
    await this.start()
  })

  After(async function () {
    await this.stop()
  })

  setWorldConstructor(World)
}