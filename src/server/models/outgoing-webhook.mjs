import mongoose from 'mongoose'

import db from '../db/mongodb'

export default db.model('OutgoingWebhook', new mongoose.Schema({
  uri: {
    type: String,
    required: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'Account'
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  // 署名キー (GitHubのwebhookでのHMAC署名を模倣する予定)
  key: String
}))
