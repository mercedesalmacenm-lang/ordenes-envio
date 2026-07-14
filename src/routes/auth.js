const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, insert, update, count } = require('../db');
const { loginLimiter, registerLimiter, validateRegistration } = require('../middleware');

const router = express.Router();

router.post('/registro', registerLimiter, async (req, res) => {
  try {
    const { nombre, username, password } = req.body;
    const errors = [];
    if (!nombre || nombre.trim().length < 2) errors.push('Nombre requerido (mín. 2 caracteres)');
    if (!username || username.trim().length < 3) errors.push('Usuario requerido (mín. 3 caracteres)');
    if (!password || password.length < 6) errors.push('Contraseña requerida (mín. 6 caracteres)');
    if (password && !/[A-Z]/.test(password)) errors.push('La contraseña debe tener al menos una mayúscula');
    if (password && !/[0-9]/.test(password)) errors.push('La contraseña debe tener al menos un número');
    if (errors.length > 0) return res.status(400).json({ error: errors.join('. ') });

    const exists = await queryOne('usuarios', { username: username.trim().toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Este nombre de usuario ya está registrado' });

    const hash = bcrypt.hashSync(password, 10);
    const totalUsers = await count('usuarios');
    const isFirst = totalUsers === 0;

    const newUser = await insert('usuarios', {
      nombre: nombre.trim(),
      username: username.trim().toLowerCase(),
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
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });

    const user = await queryOne('usuarios', { username: username.trim().toLowerCase() });
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

module.exports = router;
