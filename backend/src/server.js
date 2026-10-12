require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Rebuild any worker QR that doesn't point at the current public address.
  require('./utils/ensureWorkerQRs')().catch((err) => logger.error({ err: err.message }, 'QR check failed'));
});

const server = app.listen(PORT, () => {
  logger.info(`TIP-IT API listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled Rejection');
  server.close(() => process.exit(1));
});
