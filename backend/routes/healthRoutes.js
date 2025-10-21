const express = require('express');
const router = express.Router();
const initKnex = require('../db/initKnex');

// /api/health
router.get('/', (_req, res) => res.json({ ok: true }));

// /api/health/db
router.get('/db', async (_req, res) => {
  try {
    const k = await initKnex();
    await k.raw('select 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;