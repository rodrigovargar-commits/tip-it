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

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
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

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Recurso no encontrado' });
});

app.use(errorHandler);

module.exports = app;
