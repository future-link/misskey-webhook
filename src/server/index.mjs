import path from 'path'

import Koa from 'koa'
import Router from 'koa-router'
import serve from 'koa-static'

import APIv0 from './api_v0'
import { Logger } from './tools'

import config from '../config'

const app = new Koa()
const logger = new Logger('server')

const router = new Router()

app.proxy = config.flags.proxy

app.use(async (ctx, next) => {
  logger.log(`${ctx.method} ${ctx.path}, '${(ctx.ips.length > 0 ? ctx.ips : [ ctx.ip ]).join(" > ")}', '${ctx.headers['user-agent']}'`)
  await next()
})
router.get('/', async ctx => {
  ctx.body = 'under construction'
})
router.use('/api/v0', APIv0.routes())

app.use(router.routes())
app.use(serve('dist'))

export default app
