import mongoose from 'mongoose'
import uuid from 'uuid/v4'

import db from '../db/mongodb'

export default db.model('Token', new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    default: uuid
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    ref: 'Account'
  },
  context: mongoose.Schema.Types.Mixed,
  created_at: {
    type: Date,
    default: Date.now,
    required: true
  }
}))
