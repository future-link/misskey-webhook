import mongoose from 'mongoose'

import db from '../db/mongodb'

export default db.model('OutgoingWebhookDeliveryHistory', new mongoose.Schema({
  target: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refs: 'OutgoingWebhook'
  },
  created_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  status_code: {
    type: Number,
    required: true
  },
  headers: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  body: {
    type: Buffer
  }
}, {
  capped: 1024
}))
