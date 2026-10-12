const Worker = require('../models/Worker');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { GIROS, suggestGiro, RFC_FISICA, normalizeRfc } = require('../utils/cheqpayGiro');

// Where Cheqpay's own terms live (linked from its onboarding form).
const CHEQPAY_TERMS_URL = 'https://drive.google.com/file/d/1soz5SUFvIA7ZDd177B0XI9cjZ1YXXhLY/view?usp=drive_link';
const CHEQPAY_FORM_URL = 'https://cheqpay.fillout.com/t/cmBJhdbeFrus';

const maskRfc = (rfc) => (rfc ? `${rfc.slice(0, 4)}••••••${rfc.slice(-3)}` : '');

const toDTO = (worker, user) => {
  const c = worker.cheqpay || {};
  const suggested = suggestGiro(worker.activity);
  return {
    status: c.status || 'none',
    legalName: c.legalName || user?.name || '',
    rfcMasked: maskRfc(c.rfc),
    hasRfc: Boolean(c.rfc),
    nationality: c.nationality || 'Mexicana',
    phone: c.phone || user?.phone || '',
    email: c.email || user?.email || '',
    giro: c.giro || suggested.giro,
    giroOther: c.giro ? c.giroOther || '' : suggested.giroOther,
    termsAccepted: Boolean(c.termsAcceptedAt),
    giros: GIROS,
    termsUrl: CHEQPAY_TERMS_URL,
    formUrl: CHEQPAY_FORM_URL,
  };
};

const getApplication = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil no encontrado', 404);
  const user = await User.findById(req.user._id);
  res.json({ success: true, application: toDTO(worker, user) });
});

const saveApplication = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.user.worker);
  if (!worker) throw new AppError('Perfil no encontrado', 404);
  if (['submitted', 'approved'].includes(worker.cheqpay?.status)) {
    throw new AppError('Tu solicitud ya fue enviada. Si necesitas cambiar algo, escríbenos.', 409);
  }

  const { legalName, rfc, nationality, phone, email, giro, giroOther, acceptTerms } = req.body;

  const cleanRfc = normalizeRfc(rfc);
  if (cleanRfc && !RFC_FISICA.test(cleanRfc)) throw new AppError('El RFC debe tener 13 caracteres (persona física)', 400);
  if (giro === 'otros' && !String(giroOther || '').trim()) {
    throw new AppError('Cuéntanos qué servicio das, porque elegiste "Otros servicios"', 400);
  }
  if (acceptTerms !== true) throw new AppError('Para continuar acepta los términos de Cheqpay', 400);

  worker.cheqpay = {
    ...(worker.cheqpay?.toObject?.() || {}),
    status: 'collected',
    legalName: String(legalName).trim(),
    // An empty field keeps the RFC already saved (the form says so).
    rfc: cleanRfc || worker.cheqpay?.rfc || '',
    nationality: String(nationality).trim(),
    phone: String(phone).replace(/\D/g, ''),
    email: String(email).trim().toLowerCase(),
    giro,
    giroOther: giro === 'otros' ? String(giroOther).trim() : '',
    termsAcceptedAt: worker.cheqpay?.termsAcceptedAt || new Date(),
    updatedAt: new Date(),
  };
  await worker.save();

  const user = await User.findById(req.user._id);
  res.json({ success: true, application: toDTO(worker, user) });
});

module.exports = { getApplication, saveApplication };
