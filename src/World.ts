import Actor from "./Actor"
import ISession from "./ISession"

const SESSION = process.env.SESSION

export default abstract class World {
  private readonly actors = new Map<string, Actor>()
  protected readonly stoppables: Array<() => void> = []

  async getActor(actorName: string): Promise<Actor> {
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

    const actor = new Actor(actorName, this, session)
    this.actors.set(actorName, actor)
    return actor
  }

  async start() {
    // no-op
  }

  async stop() {
    for (const stoppable of this.stoppables.reverse()) {
      await stoppable()
    }
  }

  public abstract makeSession(sessionType: string, actorName: string): Promise<ISession>
}
