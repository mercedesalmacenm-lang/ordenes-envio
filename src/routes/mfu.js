const express = require('express');
const path = require('path');
const router = express.Router();

const mfuData = require('../mfu.json');

router.get('/', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) return res.json({ items: mfuData.slice(0, 50) });
  const query = q.toLowerCase();
  const filtered = mfuData.filter(i =>
    i.id.toLowerCase().includes(query) ||
    i.desc.toLowerCase().includes(query)
  ).slice(0, 30);
  res.json({ items: filtered });
});

module.exports = router;
