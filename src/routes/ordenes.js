const express = require('express');
const multer = require('multer');
const { queryAll, queryOne, queryPaginated, insert, update, remove, count } = require('../db');
const { requireAuth, uploadImage, deleteImage, validateOrder } = require('../middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const generateFolio = async () => {
  const supabase = require('../supabase');
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(2);
  const prefix = `OE-${yy}${mm}${dd}`;

  const { data } = await supabase.from('ordenes').select('folio').like('folio', `${prefix}%`);
  const next = (data ? data.length : 0) + 1;
  return `${prefix}-${String(next).padStart(4, '0')}`;
};

router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, estado, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

    const filters = {};
    if (estado) filters.estado = estado;

    const searchCols = search ? ['folio', 'nombre', 'equipo', 'destino'] : [];

    const { items, total } = await queryPaginated('ordenes', {
      filters,
      search: search || null,
      searchCols,
      page: pageNum,
      limit: limitNum,
      order: { column: 'fecha', asc: false }
    });

    const totalPages = Math.ceil(total / limitNum);
    res.json({ items, page: pageNum, totalPages, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/folio', requireAuth, async (req, res) => {
  try {
    const folio = await generateFolio();
    res.json({ folio });
  } catch (err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/', requireAuth, upload.single('imagen'), validateOrder, async (req, res) => {
  try {
    const { nombre, equipo, destino, notas, articulos, fecha, estado } = req.body;
    if (!nombre || !equipo) return res.status(400).json({ error: 'Nombre y equipo son requeridos' });

    const folio = await generateFolio();
    let imagen = '';
    if (req.file) imagen = await uploadImage(req.file);

    const row = {
      folio,
      nombre: nombre.trim(),
      equipo: equipo.trim(),
      destino: destino || '',
      notas: notas || '',
      imagen,
      articulos: articulos || '[]',
      fecha: fecha || new Date().toISOString().slice(0, 10),
      estado: estado || 'Pendiente',
      creado_por: req.session.user.username,
      creado_por_id: req.session.user.id
    };

    await insert('ordenes', row);
    res.json({ ok: true, folio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/:folio', requireAuth, upload.single('imagen'), validateOrder, async (req, res) => {
  try {
    const { estado, nombre, equipo, destino, notas, articulos, fecha } = req.body;
    const folio = req.params.folio;

    const order = await queryOne('ordenes', { folio });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    if (order.creado_por_id !== req.session.user.id && req.session.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para editar esta orden' });
    }

    const updates = {
      estado: estado || order.estado,
      nombre: nombre ? nombre.trim() : order.nombre,
      equipo: equipo ? equipo.trim() : order.equipo,
      destino: destino !== undefined ? destino : (order.destino || ''),
      notas: notas !== undefined ? notas : order.notas,
      articulos: articulos || order.articulos,
      fecha: fecha || order.fecha,
      imagen: order.imagen
    };

    if (req.file) {
      await deleteImage(order.imagen);
      updates.imagen = await uploadImage(req.file);
    } else if (req.body.removeImagen === '1') {
      await deleteImage(order.imagen);
      updates.imagen = '';
    }

    await update('ordenes', updates, { folio });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/:folio', requireAuth, async (req, res) => {
  try {
    const order = await queryOne('ordenes', { folio: req.params.folio });
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    if (order.creado_por_id !== req.session.user.id && req.session.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar esta orden' });
    }

    await deleteImage(order.imagen);
    await remove('ordenes', { folio: req.params.folio });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
