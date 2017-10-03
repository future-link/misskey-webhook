import Router from 'koa-router'
import mongoose from 'mongoose'

import createRedisClient from '../db/redis'
import { OutgoingWebhook } from '../models'
import { denyNonAuthorized } from '../tools'

const router = new Router()
const redis = createRedisClient()

router.get('/outgoings', async ctx => {
  denyNonAuthorized(ctx)
  ctx.body = { outgoing_hooks: await OutgoingWebhook.find({ account: ctx.state.account }).then(r => r.map(r => r.toObject())) }
})

router.post('/outgoings', async ctx => {
  denyNonAuthorized(ctx)

  if (Object.keys(ctx.request.body).length === 0) ctx.throw(400, 'bad request body specified.')
  if (!ctx.request.body.uri) ctx.throw(400, 'uri field must be specified.')

  const oh = new OutgoingWebhook({
    uri: ctx.request.body.uri,
    account: ctx.state.account._id
  })

  await oh.save()
  redis.publish('mw:events:webhooks:outgoings', JSON.stringify({
    type: 'add',
    id: oh._id.toString(),
    account: ctx.state.account._id.toString(),
    document: oh.toObject()
  }))

  ctx.status = 204
})

router.delete('/outgoings/:id', async ctx => {
  denyNonAuthorized(ctx)

  const id = ctx.params.id

  // ENOENT: an error, express 'there is no entry has a given ID'.
  const ENOENT = [404, 'there is no outgoing hook that has a given ID.']

  if (!mongoose.Types.ObjectId.isValid(id)) ctx.throw(...ENOENT)
  const oh = await OutgoingWebhook.findById(id)
  if (!oh) ctx.throw(...ENOENT)
  // should be hidden
  if (!oh.account.equals(ctx.state.account._id)) ctx.throw(...ENOENT)

  await oh.remove()
  redis.publish('mw:events:webhooks:outgoings', JSON.stringify({
    type: 'delete',
    id,
    account: ctx.state.account._id.toString()
  }))

  ctx.status = 204
})

router.put('/outgoings/:id', async ctx => {
  denyNonAuthorized(ctx)

  const id = ctx.params.id

  // ENOENT: an error, express 'there is no entry has a given ID'.
  const ENOENT = [404, 'there is no outgoing hook that has a given ID.']

  if (!mongoose.Types.ObjectId.isValid(id)) ctx.throw(...ENOENT)
  const oh = await OutgoingWebhook.findById(id)
  if (!oh) ctx.throw(...ENOENT)
  // should be hidden
  if (!oh.account.equals(ctx.state.account._id)) ctx.throw(...ENOENT)

  if (Object.keys(ctx.request.body).length === 0) ctx.throw(400, 'bad request body specified.')
  if (!ctx.request.body.uri) ctx.throw(400, 'uri field must be specified.')

  oh.uri = ctx.request.body.uri

  await oh.save()
  redis.publish('mw:events:webhooks:outgoings', JSON.stringify({
    type: 'update',
    id: oh._id.toString(),
    account: ctx.state.account._id.toString(),
    document: oh.toObject()
  }))

  ctx.status = 204
})

export default router
