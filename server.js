require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const authRoutes = require('./src/routes/auth');
const ordenesRoutes = require('./src/routes/ordenes');
const usuariosRoutes = require('./src/routes/usuarios');
const mfuRoutes = require('./src/routes/mfu');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/mfu', mfuRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${new Date().toISOString()}] Servidor corriendo en http://localhost:${PORT}`);
  console.log(`[${new Date().toISOString()}] Red local: http://0.0.0.0:${PORT}`);
});

const shutdown = (signal) => {
  console.log(`[${new Date().toISOString()}] ${signal} recibido. Cerrando servidor...`);
  httpServer.close(() => {
    console.log(`[${new Date().toISOString()}] Servidor cerrado correctamente`);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
