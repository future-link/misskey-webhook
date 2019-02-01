import mongoose from 'mongoose'

import db from '../db/mongodb'

export default db.model('Account', new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  // caching, user information
  cache: mongoose.Schema.Types.Mixed
}))
