import path from 'path'

import Koa from 'koa'
import Router from 'koa-router'
import serve from 'koa-static'

import controllers from './controllers'

const app = new Koa()
const router = new Router()

router.use('/api/v0', controllers.routes())
app.use(router.routes())
app.use(serve('dist'))

export default app
