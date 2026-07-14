const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { queryOne, insert, update, count } = require('../db');
const { loginLimiter, registerLimiter, validateRegistration } = require('../middleware');

const router = express.Router();

router.post('/registro', registerLimiter, validateRegistration, async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const exists = await queryOne('usuarios', { email: email.trim().toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Este correo ya está registrado' });

    const hash = bcrypt.hashSync(password, 10);
    const totalUsers = await count('usuarios');
    const isFirst = totalUsers === 0;

    const newUser = await insert('usuarios', {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      rol: isFirst ? 'admin' : 'usuario',
      estado: isFirst ? 'aprobado' : 'pendiente'
    });

    if (isFirst) {
      const { password: _, ...safeUser } = newUser;
      req.session.user = safeUser;
      return res.json({ user: safeUser, message: 'Cuenta creada. Eres el administrador.' });
    }
    res.json({ message: 'Registro exitoso. Tu cuenta está pendiente de aprobación.' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son requeridos' });

    const user = await queryOne('usuarios', { email: email.trim().toLowerCase() });
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciales incorrectas' });
    if (user.estado === 'rechazado') return res.status(403).json({ error: 'Tu cuenta fue rechazada' });
    if (user.estado === 'pendiente') return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });

    const { password: _, ...safeUser } = user;
    req.session.user = safeUser;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  try {
    if (!req.session.user) return res.status(401).json({ error: 'No autenticado' });
    const fresh = await queryOne('usuarios', { id: req.session.user.id });
    if (!fresh) return res.status(401).json({ error: 'Usuario no encontrado' });
    const { password: _, ...safeUser } = fresh;
    req.session.user = safeUser;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Correo requerido' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000;

    await update('usuarios', { reset_token: token, reset_expires: expires }, { email: email.trim().toLowerCase() });

    res.json({ message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.', token });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y contraseña son requeridos' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const user = await queryOne('usuarios', { reset_token: token });
    if (!user || (user.reset_expires && user.reset_expires < Date.now())) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const hash = bcrypt.hashSync(password, 10);
    await update('usuarios', { password: hash, reset_token: null, reset_expires: null }, { id: user.id });
    res.json({ message: 'Contraseña actualizada. Ahora puedes iniciar sesión.' });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
