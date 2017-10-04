import ws from 'ws'
import URL from 'url'
import EventEmitter from 'events'
import request from 'request-promise-native'
import requestErrors from 'request-promise-native/errors'

import { OutgoingWebhook, OutgoingWebhookDeliveryHistory, OutgoingWebhookFailtureHistory } from '../server/models'
import createRedisClient from '../server/db/redis'
import config from '../config'
import { Logger } from '../server/tools'

const wsURI = config.api.uri.replace('http', 'ws')
const logger = new Logger('outgoingWebhooksWorker')

process.on('unhandledRejection', e => console.log(e.stack));


export default class extends EventEmitter {
  createConnection (accountId) {
    return new Promise((res, rej) => {
      const conn = new ws(URL.resolve(wsURI, `streams/home?passkey=${config.api.key}&user-id=${accountId}`))
      const pinger = () => conn.ping()
      conn.on('error', e => {
        rej(e)
      })
      conn.on('message', (m) => {
        const message = JSON.parse(m)
        if (message.type !== 'notification') return
        this.emit('message', JSON.stringify({
          target: accountId,
          value: message.value
        }))
      })
      conn.on('close', async () => {
        clearInterval(pinger)
        if (Object.keys(this.outgoings[accountId]).length === 0) return
        logger.log(`#${accountId} | will re-establish websocket connection`)
        this.connections[accountId] = await this.createConnection(accountId)
      })
      conn.on('open', () => {
        // ping every 30s
        setInterval(pinger, 1000 * 30)
        res(conn)
      })
    })
  }

  async init () {
    this.redis = createRedisClient()
    /**
     * this.outgoings {
     *   [accountId: string]: {
     *     [outgoingId: string]: OutgoingWebhook
     *   }
     * }
     */
    this.outgoings = {}
    /**
     * this.connections {
     *  [accountId: string]: ws[]
     * }
     */
    this.connections = {}
    // initialize this.outgoings
    await Promise.all((await OutgoingWebhook.find({
      health: true
    })).map(async d => {
      const accountId = d.account.toString()
      if (!this.outgoings[accountId]) this.outgoings[accountId] = {}
      this.outgoings[accountId][d._id.toString()] = d.toObject()
    }))
    // initialize this.connections
    await Promise.all(Object.keys(this.outgoings).map(async accountId => {
      logger.log(`#${accountId} | will establish websocket connection`)
      this.connections[accountId] = await this.createConnection(accountId)
    }))
    // registry redis handler
    this.redis.subscribe('mw:events:webhooks:outgoings')
    this.redis.on('message', async (ch, payload) => {
      if (ch !== 'mw:events:webhooks:outgoings') throw new Error(`redis connection seem to be subscribed to ${ch}, what's happened...?`)
      const message = JSON.parse(payload)
      const accountId = message.account
      const outgoingId = message.id
      if (message.type === 'add') {
        logger.log(`#${accountId} | add outgoing hook #${outgoingId}`)
        if (!this.outgoings[accountId]) this.outgoings[accountId] = []
        this.outgoings[accountId][outgoingId] = message.document
      } else if (message.type === 'delete') {
        logger.log(`#${accountId} | delete outgoing hook #${outgoingId}`)
        delete this.outgoings[accountId][outgoingId]
      } else if (message.type === 'update') {
        logger.log(`#${accountId} | update outgoing hook #${outgoingId}`)
        this.outgoings[accountId][outgoingId] = message.document
      }
      if (Object.keys(this.outgoings[accountId]).length === 0) {
        logger.log(`#${accountId} | will close websocket connection`)
        this.connections[accountId].close()
        delete this.connections[accountId]
      } else if (!(accountId in this.connections)) {
        logger.log(`#${accountId} | will establish websocket connection`)
        this.connections[accountId] = await this.createConnection(accountId)
      }
    })
    // registry message handler
    this.on('message', payload => {
      const message = JSON.parse(payload)

      logger.log(`#${message.target} | notification #${message.value.id} incomming`)

      delete message.value.cursor
      delete message.value.isRead
      delete message.value.app
      Promise.all(Object.values(this.outgoings[message.target]).map(oh => request({
        url: oh.uri,
        body: JSON.stringify(message.value),
        method: 'post',
        resolveWithFullResponse: true,
        encoding: null,
        headers: {
          'content-type': 'application/json'
        }
      }).catch(async e => {
        const owfh = new OutgoingWebhookFailtureHistory({
          target: oh._id,
          stack: e.stack
        })
        logger.log(`#${message.target} | request error happned for incomming webhook #${oh._id}.`)
        logger[e instanceof requestErrors.StatusCodeError ? 'detail' : 'error'](e.stack)

        // disable a hook if StatusCodeError happened or it has failed over 3 times (includes 'owfh' genereted in this time)
        if (
          (e instanceof requestErrors.StatusCodeError) ||
          (await OutgoingWebhookFailtureHistory.count({ target: oh._id }) >= 2)
        ) {
          await Promise.all([
            OutgoingWebhook.findByIdAndUpdate(oh._id, {
              health: false
            }),
            owfh.save()
          ])
          this.redis.publish('mw:events:webhooks:outgoings', JSON.stringify({
            type: 'delete',
            id: oh._id,
            account: message.target
          }))
        } else {
          await owfh.save()
        }

        // chain
        if (e instanceof requestErrors.StatusCodeError) return e.response
        return
      }).then(async r => {
        if (!r) return
        const ohdh = new OutgoingWebhookDeliveryHistory({
          target: oh._id,
          status_code: r.statusCode,
          body: r.body,
          headers: r.headers
        })
        return ohdh.save()
      }).catch(e => {
        logger.log(`#${message.target} | unknown error happened for incomming webhook #${oh._id}!`)
        logger.error(e.stack)
      })))
    })
  }
}
