const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const Contact = require('../models/Contact');
const Worker = require('../models/Worker');

const listContacts = asyncHandler(async (req, res) => {
  const contacts = await Contact.find({ owner: req.user._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'worker',
      select: 'username bio ratingSum ratingCount',
      populate: { path: 'user', select: 'name avatarUrl' },
    });

  res.json({
    success: true,
    contacts: contacts
      .filter((c) => c.worker)
      .map((c) => ({
        id: c._id,
        worker: {
          id: c.worker._id,
          username: c.worker.username,
          bio: c.worker.bio,
          rating: c.worker.rating,
          name: c.worker.user?.name,
          avatarUrl: c.worker.user?.avatarUrl,
        },
      })),
  });
});

const addContact = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const worker = await Worker.findOne({ username: String(username).toLowerCase() });
  if (!worker) throw new AppError('Trabajador no encontrado', 404);
  if (String(worker.user) === String(req.user._id)) {
    throw new AppError('No puedes agregarte a ti mismo como contacto', 400);
  }

  const existing = await Contact.findOne({ owner: req.user._id, worker: worker._id });
  if (existing) {
    return res.status(200).json({ success: true, alreadyExists: true });
  }

  await Contact.create({ owner: req.user._id, worker: worker._id });
  res.status(201).json({ success: true });
});

const removeContact = asyncHandler(async (req, res) => {
  const result = await Contact.deleteOne({ _id: req.params.id, owner: req.user._id });
  if (result.deletedCount === 0) {
    throw new AppError('Contacto no encontrado', 404);
  }
  res.json({ success: true });
});

module.exports = { listContacts, addContact, removeContact };
