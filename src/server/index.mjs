import path from 'path'

import Koa from 'koa'
import Router from 'koa-router'
import serve from 'koa-static'

import controllers from './controllers'

import config from '../config'

const app = new Koa()
const router = new Router()

app.proxy = config.flags.proxy

router.use('/api/v0', controllers.routes(), controllers.allowedMethods())
app.use(router.routes())
app.use(serve('dist'))

export default app
