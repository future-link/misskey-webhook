import URL from 'url'
import request from 'request-promise-native'
import util from 'util'

import config from '../config'

export const callAPI = (path, body) => {
  const url = URL.resolve(config.api.uri, path.startsWith('/') ? path.substr(1) : path)

  return request({
    url,
    body: JSON.stringify(body),
    headers: {
      passkey: config.api.key,
      'content-type': 'application/json'
    },
    method: 'post'
  }).then(r => JSON.parse(r))
}

export const denyNonAuthorized = ctx => {
  if (!ctx.state.account) ctx.throw(401, 'must authenticate to request this endpoint.')
}

export class Logger {
  constructor (name) {
    this.name = name
  }

  showPadded (indicator, level) {
    const fourSpace = '    '
    const clams = typeof indicator === 'object' ? util.inspect(indicator) : indicator
    const shell = clams.split(/\r?\n/)
    console[level](fourSpace + shell.join('\n' + fourSpace))
  }

  log (str) {
    console.log(`[${(new Date()).toISOString()}] ${this.name} | ${str}`)
  }

  detail (indicator) {
    if (!config.flags.verbose) return
    this.showPadded(indicator, 'log')
  }

  error (indicator) {
    this.showPadded(indicator, 'error')
  }
}
