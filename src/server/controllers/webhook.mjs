import Router from 'koa-router'

import { OutgoingHook } from '../models'
import { denyNonAuthorized } from '../tools'

const router = new Router()

router.get('/outgoings', async ctx => {
  denyNonAuthorized(ctx)
  ctx.body = { outgoing_hooks: await OutgoingHook.find({ account: ctx.state.account }).then(r => r.map(r => r.toObject())) }
})

router.post('/outgoings', async ctx => {
  denyNonAuthorized(ctx)
  if (Object.keys(ctx.request.body).length === 0) ctx.throw(400, 'bad request body specified.')
  if (!ctx.request.body.uri) ctx.throw(400, 'uri field must be specified.')
  const oh = new OutgoingHook({
    uri: ctx.request.body.uri,
    account: ctx.state.account._id
  })
  await oh.save()
  ctx.status = 204
})

export default router
