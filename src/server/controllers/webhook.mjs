import Router from 'koa-router'

import { OutgoingHook } from '../models'
const router = new Router()

router.get('/', async (ctx) => {
  ctx.body = { message: 'webhook endpoint!' }
})

export default router
