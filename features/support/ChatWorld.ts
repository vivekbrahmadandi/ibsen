import { IncomingMessage, ServerResponse } from "http"
import ibsen from "../../src/ibsen"
import { After, Before, setWorldConstructor } from "cucumber"
import ChatApp from "../src/domain/ChatApp"
import IChatApi from "../src/domain/IChatApi"
import makeChatListener from "../src/server/makeChatListener"
import renderApp from "../src/client/renderApp"
import ChatClient from "../src/client/ChatClient"
import ChatSession from "../src/client/ChatSession"
import ApiChatSession from "../src/client/ApiChatSession"
import DomChatSession from "./DomChatSession"

ibsen<IChatApi, ChatSession>({
  makeDomainApi(): IChatApi {
    return new ChatApp()
  },

  makeHttpApi(baseurl: string): IChatApi {
    return new ChatClient(baseurl)
  },

  makeRenderApp(api: IChatApi): ($root: HTMLElement) => void {
    return ($root: HTMLElement) => renderApp($root, api)
  },

  makeRequestListener(api: IChatApi): (request: IncomingMessage, response: ServerResponse) => void {
    return makeChatListener(api)
  },

  makeApiSession(actorName: string, api: IChatApi): ChatSession {
    return new ApiChatSession(actorName, api)
  },

  makeDomSession(actorName: string, $root: HTMLElement): ChatSession {
    return new DomChatSession(actorName, $root)
  }
})

