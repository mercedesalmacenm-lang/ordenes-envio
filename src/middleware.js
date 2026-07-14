const rateLimit = require('express-rate-limit');
const supabase = require('./supabase');
const path = require('path');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados registros. Intenta de nuevo en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  if (req.session.user.estado !== 'aprobado') return res.status(403).json({ error: 'Cuenta pendiente de aprobación' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
  if (req.session.user.rol !== 'admin') return res.status(403).json({ error: 'Se requiere rol de administrador' });
  next();
}

async function uploadImage(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET || 'ordenes')
    .upload(filename, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_BUCKET || 'ordenes')
    .getPublicUrl(filename);
  return urlData.publicUrl;
}

async function deleteImage(url) {
  if (!url || !url.includes('supabase')) return;
  try {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    await supabase.storage
      .from(process.env.SUPABASE_BUCKET || 'ordenes')
      .remove([filename]);
  } catch (e) {}
}

const validateOrder = (req, res, next) => {
  const { nombre, equipo } = req.body;
  const errors = [];
  if (nombre && nombre.length > 100) errors.push('Nombre máx. 100 caracteres');
  if (equipo && equipo.length > 100) errors.push('Equipo máx. 10 caracteres');
  if (req.body.notas && req.body.notas.length > 1000) errors.push('Notas máx. 1000 caracteres');
  if (req.body.estado && !['Pendiente', 'Enviada', 'Recibida', 'Cancelada'].includes(req.body.estado)) {
    errors.push('Estado no válido');
  }
  if (errors.length > 0) return res.status(400).json({ error: errors.join('. ') });
  next();
};

const validateRegistration = (req, res, next) => {
  next();
};

module.exports = {
  loginLimiter,
  registerLimiter,
  requireAuth,
  requireAdmin,
  uploadImage,
  deleteImage,
  validateOrder,
  validateRegistration
};
