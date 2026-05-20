const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));

// Database connection parameters matching your Docker setup
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "moja_baza",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "superVarnoGeslo",
});

pool
  .connect()
  .then(() => console.log("✅ Spojen na PostgreSQL bazu"))
  .catch((err) =>
    console.error("❌ Greška pri spajanju na bazu:", err.message),
  );

// Serve your static frontend files automatically
app.use(express.static(path.join(__dirname, "..", "frontend")));

// ENDPOINT 1: Fetch all organizers (sorted by highest rating natively)
app.get("/api/organizers", async (req, res) => {
  const sql = `
    SELECT
    o.id_organizator, o.ime, o.priimek, o.email, o.portfolio,
    o.telefon, o.image_content, o.city, o.tip_eventa, o.cena_od, o.ocena,
    COUNT(DISTINCT e.id_event) AS stevilo_eventov
    FROM organizator o
    LEFT JOIN event e ON e.TK_organizatorid_organizator = o.id_organizator
    GROUP BY o.id_organizator
    ORDER BY o.ocena DESC, o.ime ASC
    `;
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("SQL Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ENDPOINT 2: Fetch a single organizer matching an ID for the profile page
app.get("/api/organizers/:id", async (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT
    o.id_organizator, o.ime, o.priimek, o.email, o.portfolio,
    o.telefon, o.image_content, o.city, o.tip_eventa, o.cena_od, o.ocena,
    COUNT(DISTINCT e.id_event) AS stevilo_eventov
    FROM organizator o
    LEFT JOIN event e ON e.TK_organizatorid_organizator = o.id_organizator
    WHERE o.id_organizator = $1
    GROUP BY o.id_organizator
    `;
  try {
    const result = await pool.query(sql, [parseInt(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Organizer not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("SQL Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`White Orchid server pokrenut: http://localhost:${PORT}`);
});
