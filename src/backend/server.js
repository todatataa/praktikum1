const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use(
  cors({
    origin: "*",
  }),
);

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "moja_baza",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "superVarnoGeslo",
});

pool
  .connect()
  .then(() => console.log("✅  Spojen na PostgreSQL bazu"))
  .catch((err) =>
    console.error("❌  Greška pri spajanju na bazu:", err.message),
  );

// ── Serviraj frontend statičke fajlove ───────────────────────

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("/api/organizers", async (req, res) => {
  const { search, city, tip_eventa, min_price, max_price, ocena_min } =
    req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(
      `(o.ime ILIKE $${idx} OR o.priimek ILIKE $${idx} OR o.tip_eventa ILIKE $${idx})`,
    );
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

  if (min_price !== undefined && min_price !== "") {
    conditions.push(`o.cena_od >= $${idx}`);
    params.push(parseInt(min_price));
    idx++;
  }

  if (max_price !== undefined && max_price !== "") {
    conditions.push(`o.cena_od <= $${idx}`);
    params.push(parseInt(max_price));
    idx++;
  }

  if (ocena_min !== undefined && ocena_min !== "") {
    conditions.push(`COALESCE(rs.avg_rating, o.ocena) >= $${idx}`);
    params.push(parseFloat(ocena_min));
    idx++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const sql = `
        SELECT
            o.id_organizator, o.ime, o.priimek, o.email, o.portfolio,
            o.telefon, o.image_content, o.city, o.tip_eventa, o.cena_od,
            COALESCE(rs.avg_rating, o.ocena) AS ocena,
            COALESCE(rs.review_count, 0) AS stevilo_reviews,
            COALESCE(ev.stevilo_eventov, 0) AS stevilo_eventov
        FROM organizator o
        LEFT JOIN (
            SELECT
                organizator_id,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(*) AS review_count
            FROM review
            GROUP BY organizator_id
        ) rs ON rs.organizator_id = o.id_organizator
        LEFT JOIN (
            SELECT
                TK_organizatorid_organizator,
                COUNT(*) AS stevilo_eventov
            FROM event
            GROUP BY TK_organizatorid_organizator
        ) ev ON ev.TK_organizatorid_organizator = o.id_organizator
        ${whereClause}
        ORDER BY COALESCE(rs.avg_rating, o.ocena) DESC, o.ime ASC
    `;

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("SQL greška:", err.message);
    res
      .status(500)
      .json({ error: "Greška pri dohvatanju podataka: " + err.message });
  }
});

app.get("/api/organizers/:id", async (req, res) => {
  const { id } = req.params;

  const sql = `
        SELECT
            o.id_organizator, o.ime, o.priimek, o.email, o.portfolio,
            o.telefon, o.image_content, o.city, o.tip_eventa, o.cena_od,
            COALESCE(rs.avg_rating, o.ocena) AS ocena,
            COALESCE(rs.review_count, 0) AS stevilo_reviews,
            COALESCE(ev.stevilo_eventov, 0) AS stevilo_eventov
        FROM organizator o
        LEFT JOIN (
            SELECT
                organizator_id,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(*) AS review_count
            FROM review
            GROUP BY organizator_id
        ) rs ON rs.organizator_id = o.id_organizator
        LEFT JOIN (
            SELECT
                TK_organizatorid_organizator,
                COUNT(*) AS stevilo_eventov
            FROM event
            GROUP BY TK_organizatorid_organizator
        ) ev ON ev.TK_organizatorid_organizator = o.id_organizator
        WHERE o.id_organizator = $1
    `;

  try {
    const result = await pool.query(sql, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Organizator nije pronađen" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("SQL greška:", err.message);
    res
      .status(500)
      .json({ error: "Greška pri dohvatanju podataka: " + err.message });
  }
});

app.get("/api/organizers/:id/reviews", async (req, res) => {
  const { id } = req.params;

  const sql = `
        SELECT
            r.review_id,
            r.client_id,
            r.organizator_id,
            r.rating,
            r.comment,
            r.review_date,
            c.ime,
            c.priimek,
            CONCAT(c.ime, ' ', c.priimek) AS client_name
        FROM review r
        INNER JOIN client c ON c.id_client = r.client_id
        WHERE r.organizator_id = $1
        ORDER BY r.review_date DESC, r.review_id DESC
    `;

  try {
    const result = await pool.query(sql, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("SQL greška (GET organizer reviews):", err.message);
    res
      .status(500)
      .json({ error: "Greška pri dohvatanju review podataka: " + err.message });
  }
});

app.post("/api/organizers/:id/reviews", async (req, res) => {
  const { id } = req.params;
  const {
    rating,
    comment,
    client_id,
    client_email,
    client_first_name,
    client_last_name,
  } = req.body;

  const organizerId = parseInt(id);
  const parsedRating = parseInt(rating);
  const safeEmail = String(client_email || "")
    .trim()
    .toLowerCase();
  const firstName = String(client_first_name || "").trim() || "Client";
  const lastName = String(client_last_name || "").trim() || "User";
  const safeComment = String(comment || "").trim() || null;

  if (!Number.isInteger(organizerId)) {
    return res.status(400).json({ error: "Invalid organizer id" });
  }

  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res
      .status(400)
      .json({ error: "Rating must be an integer between 1 and 5" });
  }

  if (!safeEmail) {
    return res.status(400).json({ error: "Client email is required" });
  }

  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const organizerCheck = await db.query(
      "SELECT id_organizator FROM organizator WHERE id_organizator = $1",
      [organizerId],
    );

    if (organizerCheck.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Organizator nije pronađen" });
    }

    let resolvedClientId = null;

    if (client_id && Number.isInteger(parseInt(client_id))) {
      const existingClientById = await db.query(
        "SELECT id_client FROM client WHERE id_client = $1",
        [parseInt(client_id)],
      );
      if (existingClientById.rows.length > 0) {
        resolvedClientId = existingClientById.rows[0].id_client;
      }
    }

    if (!resolvedClientId) {
      const existingClientByEmail = await db.query(
        "SELECT id_client FROM client WHERE LOWER(email) = $1 ORDER BY id_client ASC LIMIT 1",
        [safeEmail],
      );

      if (existingClientByEmail.rows.length > 0) {
        resolvedClientId = existingClientByEmail.rows[0].id_client;
        await db.query(
          `UPDATE client
           SET ime = $1,
               priimek = $2
           WHERE id_client = $3`,
          [firstName, lastName, resolvedClientId],
        );
      } else {
        const insertedClient = await db.query(
          `INSERT INTO client (ime, priimek, email, geslo)
           VALUES ($1, $2, $3, $4)
           RETURNING id_client`,
          [firstName, lastName, safeEmail, "review-placeholder"],
        );
        resolvedClientId = insertedClient.rows[0].id_client;
      }
    }

    const insertReview = await db.query(
      `INSERT INTO review (client_id, organizator_id, rating, comment, review_date)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       RETURNING review_id, client_id, organizator_id, rating, comment, review_date`,
      [resolvedClientId, organizerId, parsedRating, safeComment],
    );

    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      client_id: resolvedClientId,
      review: {
        ...insertReview.rows[0],
        client_name: `${firstName} ${lastName}`,
      },
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greška (POST organizer review):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

// ── API: POST /api/organizers ─────────────────────────────────
// Registracija novega organizatorja — kliče register.html
app.post("/api/organizers", async (req, res) => {
  const { ime, priimek, email, geslo, city, telefon, tip_eventa } = req.body;

  if (!ime || !priimek || !email || !geslo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Preveri če email že obstaja
  const checkSql = `SELECT id_organizator FROM organizator WHERE email = $1`;
  try {
    const checkResult = await pool.query(checkSql, [email]);
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "Email already exists" });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const insertSql = `
        INSERT INTO organizator (ime, priimek, email, geslo, city, telefon, tip_eventa)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id_organizator
    `;

  try {
    const result = await pool.query(insertSql, [
      ime,
      priimek,
      email,
      geslo, // hashirano geslo iz frontenda
      city || null,
      telefon ? parseInt(telefon) : null,
      tip_eventa || null,
    ]);
    res.status(201).json({ id_organizator: result.rows[0].id_organizator });
  } catch (err) {
    console.error("SQL greška:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: GET /api/events ──────────────────────────────────────
// Dohvati sve evente (opciono filtrirano po org_id)
app.get("/api/events", async (req, res) => {
  const { org_id } = req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (org_id) {
    conditions.push(`e.TK_organizatorid_organizator = $${idx}`);
    params.push(parseInt(org_id));
    idx++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const sql = `
        SELECT
            e.id_event, e.naziv, e.datum_eventa, e.opis,
            e.stevilo_gostov, e.venue_name, e.venue_lokacija,
            e.rsvp_due_date, e.e_mail_notification,
            e.TK_organizatorid_organizator
        FROM event e
        ${whereClause}
        ORDER BY e.datum_eventa ASC
    `;

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("SQL greška (GET events):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: DELETE /api/events/:id ───────────────────────────────
app.delete("/api/events/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM event WHERE id_event = $1 RETURNING id_event",
      [id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event nije pronađen" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("SQL greška (DELETE event):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: PATCH /api/organizers/:id ───────────────────────────
// Posodobitev profila organizatorja — kliče profile-detail.html (Edit Profile modal)
app.patch("/api/organizers/:id", async (req, res) => {
  const { id } = req.params;
  const { ime, priimek, city, telefon, tip_eventa, portfolio, cena_od } =
    req.body;

  if (!ime || !priimek) {
    return res.status(400).json({ error: "ime and priimek are required" });
  }

  const sql = `
        UPDATE organizator
        SET ime        = $1,
            priimek    = $2,
            city       = $3,
            telefon    = $4,
            tip_eventa = $5,
            portfolio  = $6,
            cena_od    = $7
        WHERE id_organizator = $8
        RETURNING id_organizator
    `;

  try {
    const result = await pool.query(sql, [
      ime,
      priimek,
      city || null,
      telefon ? parseInt(telefon) : null,
      tip_eventa || null,
      portfolio || null,
      cena_od !== undefined ? parseInt(cena_od) : 0,
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Organizator nije pronađen" });
    }
    res.json({ success: true, id_organizator: result.rows[0].id_organizator });
  } catch (err) {
    console.error("SQL greška (PATCH organizer):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: POST /api/events ──────────────────────────────────────
// Kreiranje novog eventa — kliče create-event.html
app.post("/api/events", async (req, res) => {
  const {
    naziv,
    datum_eventa,
    opis,
    stevilo_gostov,
    venue_name,
    venue_lokacija,
    rsvp_due_date,
    e_mail_notification,
    TK_organizatorid_organizator,
  } = req.body;

  if (!naziv || !datum_eventa || !TK_organizatorid_organizator) {
    return res.status(400).json({
      error:
        "naziv, datum_eventa and TK_organizatorid_organizator are required",
    });
  }

  const sql = `
        INSERT INTO event
            (naziv, datum_eventa, opis, stevilo_gostov, venue_name, venue_lokacija,
             rsvp_due_date, e_mail_notification, TK_organizatorid_organizator)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id_event
    `;

  try {
    const result = await pool.query(sql, [
      naziv,
      datum_eventa,
      opis || null,
      stevilo_gostov ? parseInt(stevilo_gostov) : null,
      venue_name || null,
      venue_lokacija || null,
      rsvp_due_date || null,
      e_mail_notification || null,
      parseInt(TK_organizatorid_organizator),
    ]);
    res.status(201).json({ id_event: result.rows[0].id_event });
  } catch (err) {
    console.error("SQL greška (POST event):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🌸  White Orchid server pokrenut: http://localhost:${PORT}`);
  console.log(`    Pritisnite Ctrl+C za zaustavljanje`);
});
