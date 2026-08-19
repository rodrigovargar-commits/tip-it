const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/tip-it';
    await mongoose.connect(uri);
    console.log('MongoDB connected');

    // Mongoose only creates indexes that are missing — it never alters an
    // existing index whose options changed (e.g. email's unique index
    // gaining `sparse: true` for guest accounts). syncIndexes reconciles
    // the real DB indexes with the current schema on every boot.
    const User = require('../models/User');
    await User.syncIndexes();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
