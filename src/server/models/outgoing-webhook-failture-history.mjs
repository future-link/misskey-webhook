import mongoose from 'mongoose'

import db from '../db/mongodb'

export default db.model('OutgoingWebhookFailtureHistory', new mongoose.Schema({
  target: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refs: 'OutgoingWebhook'
  },
  stack: {
    type: String,
    require: true
  }
}, {
  // 256KB
  capped: 1024 * 1024 * 256
}))
