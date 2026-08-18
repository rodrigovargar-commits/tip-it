const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Worker = require('../models/Worker');

const getQRByUserId = asyncHandler(async (req, res) => {
  const worker = await Worker.findOne({ user: req.params.userid });
  if (!worker) {
    throw new AppError('Código QR no encontrado para este usuario', 404);
  }

  res.json({ success: true, qrCode: worker.qrCode, username: worker.username });
});

module.exports = { getQRByUserId };
