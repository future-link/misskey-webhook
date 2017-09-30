import Router from 'koa-router'
import bodyParser from 'koa-bodyparser'

import webhook from './webhook'

import { callAPI, denyNonAuthorized } from '../tools'
import { Account, Token } from '../models'

const router = new Router()

router.use(async (ctx, next) => {
  try {
    await next()
  } catch (e) {
    console.error(e)
    ctx.status = e.expose ? e.status : 500
    ctx.body = {
      message: e.expose ? e.message : 'some error'
    }
  }
})

router.use(bodyParser({
  enableTypes: [ 'json' ],
  onerror: (e, ctx) => {
    ctx.throw(400, e.message)
  }
}))

const schemes = [ 'bearer' ]
const authenticater = {
  bearer: token => Token.findById({ token }).populate('account')
}
router.use(async (ctx, next) => {
  ctx.state.account = null

  if (!ctx.headers['authorization']) return await next()

  const as = ctx.header['authorization'].split(' ')
  const scheme = as.shift().toLowerCase()
  const value = as.join(' ')
  if (!schemes.includes(scheme)) ctx.throw(400, 'unsupported authorization scheme specified.')

  const account = await authenticater[scheme](value)
  if (!account) ctx.throw(400, 'incorrect authentication information specified.')

  ctx.state.account = account
  await next()
})

router.all('(.*)', async (...rest) => {
  const ctx = rest.shift()
  const next = rest.pop()
  await next()
  if (ctx.status === 404 && !ctx.body) {
    ctx.status = 404
    ctx.body = {
      message: 'there is no content available.'
    }
  }
})

router.post('/session', async ctx => {
  const user = await callAPI('/login', {
    'screen-name': ctx.request.body.account,
    'password': ctx.request.body.password
  })
  const account = (await Account.findById(user.id)) || new Account({
    _id: user.id
  })
  account.cache = user
  const token = new Token({
    account: user.id,
    context: {
      headers: ctx.header,
      ips: ctx.ips || [ctx.ip]
    }
  })
  await Promise.all([account.save(), token.save()])
  ctx.body = {
    token: token.token,
    account: user
  }
})

router.get('/account', async ctx => {
  denyNonAuthorized(ctx)
  ctx.body = ctx.state.account.cache
})

router.use('/webhook', webhook.routes())

export default router
