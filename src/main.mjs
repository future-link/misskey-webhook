import config from './config'
import server from './server'

console.log('> misskey webhook provider')
console.log('> https://github.com/future-link/misskey-webhook')
server.listen(config.port)
console.log(`> will listen on port ${config.port}.\n`)
