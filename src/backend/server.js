// ============================================================
//  White Orchid Events – Node.js / Express server
//
//  Struktura projekta:
//    project/
//    ├── frontend/   ← HTML, CSS, slike
//    └── backend/
//        ├── server.js   ← ovaj fajl
//        └── package.json
//
//  Instalacija:  npm install
//  Pokretanje:   node server.js
//  Browser:      http://localhost:3000
// ============================================================

const express = require('express');
const { Pool } = require('pg');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────
// Dozvoljava frontend-u (koji je u drugom folderu / portu)
// da poziva ovaj backend bez greške u browseru
app.use(cors({
    origin: '*' // u produkciji zamijeniti s konkretnim URL-om
}));

// ── PostgreSQL konekcija ──────────────────────────────────────
const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'moja_baza',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'superVarnoGeslo',
});

pool.connect()
    .then(() => console.log('✅  Spojen na PostgreSQL bazu'))
    .catch(err => console.error('❌  Greška pri spajanju na bazu:', err.message));

// ── Serviraj frontend statičke fajlove ───────────────────────
// __dirname = backend/  →  ../frontend = folder sa HTML fajlovima
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API: GET /api/organizers ──────────────────────────────────
app.get('/api/organizers', async (req, res) => {
    const { search, city, tip_eventa, min_price, max_price, ocena_min } = req.query;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (search) {
        conditions.push(`(o.ime ILIKE $${idx} OR o.priimek ILIKE $${idx} OR o.tip_eventa ILIKE $${idx})`);
        params.push(`%${search}%`);
        idx++;
    }

    if (city) {
        conditions.push(`o.city = $${idx}`);
        params.push(city);
        idx++;
    }

    if (tip_eventa) {
        conditions.push(`o.tip_eventa = $${idx}`);
        params.push(tip_eventa);
        idx++;
    }

    if (min_price !== undefined && min_price !== '') {
        conditions.push(`o.cena_od >= $${idx}`);
        params.push(parseInt(min_price));
        idx++;
    }

    if (max_price !== undefined && max_price !== '') {
        conditions.push(`o.cena_od <= $${idx}`);
        params.push(parseInt(max_price));
        idx++;
    }

    if (ocena_min !== undefined && ocena_min !== '') {
        conditions.push(`o.ocena >= $${idx}`);
        params.push(parseFloat(ocena_min));
        idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        SELECT
            o.id_organizator,
            o.ime,
            o.priimek,
            o.email,
            o.portfolio,
            o.telefon,
            o.image_content,
            o.city,
            o.tip_eventa,
            o.cena_od,
            o.ocena,
            COUNT(DISTINCT e.id_event) AS stevilo_eventov
        FROM organizator o
        LEFT JOIN event e ON e.TK_organizatorid_organizator = o.id_organizator
        ${whereClause}
        GROUP BY o.id_organizator
        ORDER BY o.ocena DESC, o.ime ASC
    `;

    try {
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('SQL greška:', err.message);
        res.status(500).json({ error: 'Greška pri dohvatanju podataka: ' + err.message });
    }
});

// ── API: GET /api/organizers/:id ──────────────────────────────
app.get('/api/organizers/:id', async (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT
            o.id_organizator,
            o.ime,
            o.priimek,
            o.email,
            o.portfolio,
            o.telefon,
            o.image_content,
            o.city,
            o.tip_eventa,
            o.cena_od,
            o.ocena,
            COUNT(DISTINCT e.id_event) AS stevilo_eventov
        FROM organizator o
        LEFT JOIN event e ON e.TK_organizatorid_organizator = o.id_organizator
        WHERE o.id_organizator = $1
        GROUP BY o.id_organizator
    `;

    try {
        const result = await pool.query(sql, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organizator nije pronađen' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('SQL greška:', err.message);
        res.status(500).json({ error: 'Greška pri dohvatanju podataka: ' + err.message });
    }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🌸  White Orchid server pokrenut: http://localhost:${PORT}`);
    console.log(`    Pritisnite Ctrl+C za zaustavljanje`);
});