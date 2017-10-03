import cluster from 'cluster'
import os from 'os'

import config from './config'
import server from './server'
import workers from './workers'

import { Logger } from './server/tools'

const logger = new Logger(cluster.isMaster ? 'master' : `slave#${cluster.worker.id}`)

/**
 * signature
 */
if (cluster.isMaster) {
  console.log('> misskey webhook provider')
  console.log('> https://github.com/future-link/misskey-webhook')
  console.log(`> will listen on port ${config.port}.\n`)
}

/**
 * kickstart workers
 */
if (cluster.isMaster) {
  logger.log(`kickstart webhook workers.`)
  workers.forEach(worker => worker.init())
}

/**
 * clustering
 */
if (cluster.isMaster && config.flags.clustering) {
  logger.log(`kickstart server slaves.`)
  const cpuCores = os.cpus().length

  cluster.on('exit', (worker) => {
    logger.log(`slave#${worker.id} is down.`)
    cluster.fork()
  })

  cluster.on('online', (worker) => {
    logger.log(`slave#${worker.id} is online.`)
  })

  // fork workers each cpu cores.
  for (let i = 0; i < cpuCores; i++) {
    cluster.fork()
  }
} else {
  server.listen(config.port)
  // notice worker number in worker
  if (cluster.isWorker) logger.log(`slave is ready.`)
}
