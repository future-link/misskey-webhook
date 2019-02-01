import URL from 'url'
import request from 'request-promise-native'

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

// keep backward-compatibility
export { Logger } from '../utils'
