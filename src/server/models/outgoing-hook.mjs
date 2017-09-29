import mongoose from 'mongoose'

import db from '../db/mongodb'

export default db.model('OutgoingHook', new mongoose.Schema({
  uri: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  // 署名キー (GitHubのwebhookでのHMAC署名を模倣する予定)
  key: String
}))
