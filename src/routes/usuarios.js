const express = require('express');
const bcrypt = require('bcryptjs');
const { queryAll, queryOne, update, remove } = require('../db');
const { requireAdmin } = require('../middleware');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const users = await queryAll('usuarios', {}, { column: 'fecha_registro', asc: false });
    const safe = users.map(({ password, ...u }) => u);
    res.json({ items: safe });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/:id/aprobar', requireAdmin, async (req, res) => {
  try {
    await update('usuarios', { estado: 'aprobado' }, { id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/:id/rechazar', requireAdmin, async (req, res) => {
  try {
    await update('usuarios', { estado: 'rechazado' }, { id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (Number(req.params.id) === req.session.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    await remove('usuarios', { id: Number(req.params.id) });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const hash = bcrypt.hashSync('Cambio123', 10);
    await update('usuarios', { password: hash, must_change_password: true }, { id: Number(req.params.id) });
    res.json({ ok: true, message: 'Contraseña temporal: Cambio123. El usuario deberá cambiarla al iniciar sesión.' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
