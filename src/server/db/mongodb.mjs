import mongoose from 'mongoose'

mongoose.Promise = global.Promise

import config from '../../config'

export default mongoose.createConnection(config.mongodb, {
  useMongoClient: true,
  promiseLibrary: global.Promise
})
