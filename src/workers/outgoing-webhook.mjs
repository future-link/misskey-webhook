import EventEmitter from 'events'
import request from 'request-promise-native'
import requestErrors from 'request-promise-native/errors'

import { OutgoingWebhook, OutgoingWebhookDeliveryHistory, OutgoingWebhookFailtureHistory } from '../server/models'
import createRedisClient from '../server/db/redis'
import { Logger } from '../utils'

const logger = new Logger('outgoingWebhooksWorker')

process.on('unhandledRejection', e => console.log(e.stack));


export default class {
  init () {
    const redis = createRedisClient()

    // registry message handler
    redis.on('message', (_,payload) => {
      const message = JSON.parse(payload)

      const { targetId, value } = message

      logger.log(`#${targetId} | notification #${value.id} incomming`)

      delete value.cursor
      delete value.isRead
      delete value.app

      const ows = await OutgoingWebhook.find({
        health: true,
        account: targetId
      })

      if (ows.length === 0) return

      Promise.all(ows.map(oh => request({
        url: oh.uri,
        body: JSON.stringify(value),
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

    redis.subscribe('misskey:notification')
  }
}
