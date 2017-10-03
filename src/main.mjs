import config from './config'
import server from './server'
import workers from './workers'

// initialize workers
workers.forEach(worker => worker.init())

console.log('> misskey webhook provider')
console.log('> https://github.com/future-link/misskey-webhook')
server.listen(config.port)
console.log(`> will listen on port ${config.port}.\n`)
