const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

async function connectDB() {
  try {
    // Never log the URI itself — it carries the DB credential in plain
    // text (§2.1: no secrets in logs, same reasoning as not logging a
    // connection string in code).
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/tip-it';
    await mongoose.connect(uri);
    logger.info('MongoDB connected');

    // Mongoose only creates indexes that are missing — it never alters an
    // existing index whose options changed (e.g. email's unique index
    // gaining `sparse: true` for guest accounts). syncIndexes reconciles
    // the real DB indexes with the current schema on every boot.
    const User = require('../models/User');
    await User.syncIndexes();
  } catch (err) {
    logger.error({ err: err.message }, 'MongoDB connection error');
    process.exit(1);
  }
}

module.exports = connectDB;
