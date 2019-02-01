import mongoose from 'mongoose'

mongoose.Promise = global.Promise

import config from '../config'

const db = mongoose.createConnection(config.mongodb, {
  useMongoClient: true,
  promiseLibrary: global.Promise
})

db.catch(e => {
  console.error(e.stack)
  process.exit(1)
})

export default db
