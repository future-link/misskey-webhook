import mongoose from 'mongoose'

import config from '../../config'

export default mongoose.createConnection(config.mongodb, {
  useMongoClient: true,
  promiseLibrary: global.Promise
})
