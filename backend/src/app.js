const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const webhookRoutes = require('./routes/webhookRoutes');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const workerRoutes = require('./routes/workerRoutes');
const tipRoutes = require('./routes/tipRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leadRoutes = require('./routes/leadRoutes');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
// CLIENT_URL accepts a comma-separated list (e.g. the Vercel URL AND the custom
// domain, with and without www). The native iOS/Android shells (Capacitor)
// send their own fixed origins, so those are always allowed too.
const NATIVE_APP_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, allowedOrigins.includes(origin) || NATIVE_APP_ORIGINS.includes(origin));
    },
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Stripe webhooks need the raw body for signature verification,
// so this route is mounted BEFORE the JSON body parser.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde.' },
});
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/leads', leadRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Recurso no encontrado' });
});

app.use(errorHandler);

module.exports = app;
