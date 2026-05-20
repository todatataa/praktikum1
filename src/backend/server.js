

const express = require('express');
const { Pool } = require('pg');
const path    = require('path');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
    origin: '*' // u produkciji zamijeniti s konkretnim URL-om
}));


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


app.use(express.static(path.join(__dirname, '..', 'frontend')));


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


app.listen(PORT, () => {
    console.log(`    White Orchid server pokrenut: http://localhost:${PORT}`);
    console.log(`    Pritisnite Ctrl+C za zaustavljanje`);
});