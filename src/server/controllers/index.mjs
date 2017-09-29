import Router from 'koa-router'

import webhook from './webhook'

const router = new Router()

router.all('(.*)', async (...rest) => {
  const next = rest.pop()
  await next()
  const ctx = rest.shift()
  if (ctx.status === 404 && !ctx.body) {
    ctx.status = 404
    ctx.body = {
      message: 'there is no content available.'
    }
  }
})

router.use('/webhook', webhook.routes())

export default router
