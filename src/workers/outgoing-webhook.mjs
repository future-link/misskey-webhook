import ws from 'ws'
import URL from 'url'
import EventEmitter from 'events'
import request from 'request-promise-native'

import { OutgoingWebhook, OutgoingWebhookDeliveryHistory } from '../server/models'
import createRedisClient from '../server/db/redis'
import config from '../config'
import { Logger } from '../server/tools'

const wsURI = config.api.uri.replace('http', 'ws')
const logger = new Logger('worker#outgoingWebhooks')

export default class extends EventEmitter {
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
    await Promise.all(Object.keys(this.outgoings).map(accountId => new Promise((res, rej) => {
      logger.log(`#${accountId} | will establish websocket connection`)
      const conn = new ws(URL.resolve(wsURI, `streams/home?passkey=${config.api.key}&user-id=${accountId}`))
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
      this.connections[accountId] = conn
      conn.on('open', () => {
        res()
      })
    })))
    // registry redis handler
    this.redis.subscribe('mw:events:webhooks:outgoings')
    this.redis.on('message', (ch, payload) => {
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
        const conn = new ws(URL.resolve(wsURI, `streams/home?passkey=${config.api.key}&user-id=${accountId}`))
        conn.on('error', e => {
          throw e
        })
        conn.on('message', (m) => {
          const message = JSON.parse(m)
          if (message.type !== 'notification') return
          this.emit('message', JSON.stringify({
            target: accountId,
            value: message.value
          }))
        })
        this.connections[accountId] = conn
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
        encoding: null
      }).catch(async e => {
        await OutgoingWebhook.findByIdAndUpdate(oh._id, {
          health: false
        })
        // disable unhealth hook
        this.redis.publish('mw:events:webhooks:outgoings', JSON.stringify({
          type: 'delete',
          id: oh._id,
          account: message.target
        }))
        return e.response
      }).then(async r => {
        const ohdh = new OutgoingWebhookDeliveryHistory({
          target: oh._id,
          status_code: r.statusCode,
          body: r.body,
          headers: r.headers
        })
        return ohdh.save()
      })))
    })
  }
}
