import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'

import webhook from './webhook'

import { callAPI, denyNonAuthorized, Logger } from '../tools'
import { Account, Token } from '../models'

const router = new Router()
const logger = new Logger()

router.use(async (ctx, next) => {
  try {
    await next()
  } catch (e) {
    const expose = e.expose || (e.status && e.message)
    logger[expose ? 'detail' : 'error'](e.stack)
    ctx.status = expose ? e.status : 500
    ctx.body = {
      message: expose ? e.message : 'an unexpected error has occurred, please contact to operators.'
    }
  }
})

// CORS
router.use(async (ctx,next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  if (ctx.method === 'OPTIONS' && ctx.header['access-control-request-method']) {
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    ctx.set('Access-Control-Allow-Headers', 'Content-Type')
    ctx.status = 204
    return
  }
  await next()
})

router.use(bodyParser({
  enableTypes: [ 'json' ],
  onerror: (e, ctx) => {
    ctx.throw(400, e.message)
  }
}))

const schemes = [ 'bearer' ]
const authenticater = {
  bearer: token => Token.findOne({ token }).populate('account')
}
router.use(async (ctx, next) => {
  ctx.state.account = null
  ctx.state.token = null

  if (!ctx.headers['authorization']) return await next()

  const as = ctx.header['authorization'].split(' ')
  const scheme = as.shift().toLowerCase()
  const value = as.join(' ')
  if (!schemes.includes(scheme)) ctx.throw(400, 'unsupported authorization scheme specified.')

  const token = await authenticater[scheme](value)
  if (!token) ctx.throw(400, 'incorrect authentication information specified.')

  ctx.state.account = token.account
  ctx.state.token = token
  await next()
})

router.all('(.*)', async (...rest) => {
  const ctx = rest.shift()
  const next = rest.pop()
  await next()
  if (ctx.status === 404 && !ctx.body) ctx.throw(404, 'there is no content available.')
})

router.post('/session', async ctx => {
  const user = await callAPI('/login', {
    'screen-name': ctx.request.body.account,
    'password': ctx.request.body.password
  }).catch(e => {
    if (e.name === 'StatusCodeError') ctx.throw(400, 'maybe screen-name or password is, or both are incorrect.')
    throw e
  })
  const account = (await Account.findById(user.id)) || new Account({
    _id: user.id
  })
  account.cache = user
  const token = new Token({
    account: user.id,
    context: {
      headers: ctx.header,
      ips: ctx.ips.length > 0 ? ctx.ips : [ctx.ip]
    }
  })
  await Promise.all([account.save(), token.save()])
  ctx.body = { token: token.token }
})

router.get('/account', async ctx => {
  denyNonAuthorized(ctx)
  ctx.body = ctx.state.account.cache
})

router.use('/webhooks', webhook.routes())

export default router
