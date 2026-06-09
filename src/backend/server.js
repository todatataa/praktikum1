const express = require("express");
require("dotenv").config();
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

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

function generateReviewToken() {
  return crypto.randomBytes(24).toString("hex");
}

function generateRsvpToken() {
  return crypto.randomBytes(24).toString("hex");
}

function getAppBaseUrl(req) {
  const fallbackUrl = req
    ? `${req.protocol}://${req.get("host")}`
    : `http://localhost:${PORT}`;
  return (process.env.APP_BASE_URL || fallbackUrl).replace(/\/$/, "");
}

function buildGuestReviewLink(req, token) {
  return `${getAppBaseUrl(req)}/event-review.html?token=${encodeURIComponent(token)}`;
}

function buildRsvpLink(req, token) {
  return `${getAppBaseUrl(req)}/rsvp.html?token=${encodeURIComponent(token)}`;
}

function normalizeGuestList(rawGuests) {
  const source =
    typeof rawGuests === "string"
      ? rawGuests
          .split(/\r?\n|;/)
          .map((line) => line.trim())
          .filter(Boolean)
      : Array.isArray(rawGuests)
        ? rawGuests
        : [];

  const seen = new Set();
  const guests = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const item of source) {
    let guestName = "";
    let email = "";

    if (typeof item === "string") {
      const angleMatch = item.match(/^(.*?)<([^>]+)>$/);
      if (angleMatch) {
        guestName = angleMatch[1].trim();
        email = angleMatch[2].trim().toLowerCase();
      } else {
        const parts = item.split(",").map((part) => part.trim());
        if (parts.length >= 2 && emailRegex.test(parts[parts.length - 1])) {
          email = parts.pop().toLowerCase();
          guestName = parts.join(" ");
        } else {
          email = item.trim().toLowerCase();
        }
      }
    } else if (item && typeof item === "object") {
      guestName = String(item.guest_name || item.name || "").trim();
      email = String(item.email || item.e_mail || "").trim().toLowerCase();
    }

    if (!emailRegex.test(email) || seen.has(email)) continue;
    seen.add(email);
    guests.push({ guest_name: guestName || null, email });
  }

  return guests;
}

function createMailer() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatEventDate(value) {
  if (!value) return "Date not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function sendRsvpEmail(req, invitation) {
  const mailer = createMailer();
  const rsvpLink = buildRsvpLink(req, invitation.rsvp_token);

  if (!mailer) {
    return { sent: false, reason: "SMTP is not configured", rsvp_link: rsvpLink };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = `RSVP for ${invitation.event_name}`;
  const guestLine = invitation.guest_name ? `Hi ${invitation.guest_name},` : "Hi,";
  const dueLine = invitation.rsvp_due_date
    ? `<p>Please confirm your attendance by <strong>${formatEventDate(invitation.rsvp_due_date)}</strong>.</p>`
    : "";

  await mailer.sendMail({
    from,
    to: invitation.guest_email,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0D1B2A">
        <p>${guestLine}</p>
        <p>You are invited to <strong>${invitation.event_name}</strong>.</p>
        <p><strong>Date:</strong> ${formatEventDate(invitation.event_date)}</p>
        <p><strong>Venue:</strong> ${invitation.venue_name || invitation.venue_location || "Venue not specified"}</p>
        ${dueLine}
        <p>
          <a href="${rsvpLink}" style="display:inline-block;background:#C9A84C;color:white;padding:12px 18px;text-decoration:none;letter-spacing:.08em;text-transform:uppercase;font-size:12px">
            Confirm RSVP
          </a>
        </p>
        <p>If the button does not work, open this link:<br>${rsvpLink}</p>
      </div>
    `,
    text: `${guestLine}

You are invited to ${invitation.event_name}.
Date: ${formatEventDate(invitation.event_date)}
Venue: ${invitation.venue_name || invitation.venue_location || "Venue not specified"}
${invitation.rsvp_due_date ? `Please confirm by ${formatEventDate(invitation.rsvp_due_date)}.` : ""}

Confirm RSVP: ${rsvpLink}`,
  });

  return { sent: true, rsvp_link: rsvpLink };
}

async function sendRsvpReminderEmail(invitation) {
  const mailer = createMailer();
  const rsvpLink = buildRsvpLink(null, invitation.rsvp_token);

  if (!mailer) {
    return { sent: false, reason: "SMTP is not configured", rsvp_link: rsvpLink };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const guestLine = invitation.guest_name ? `Hi ${invitation.guest_name},` : "Hi,";

  await mailer.sendMail({
    from,
    to: invitation.guest_email,
    subject: `Reminder: RSVP for ${invitation.event_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0D1B2A">
        <p>${guestLine}</p>
        <p>This is a reminder to confirm your attendance for <strong>${invitation.event_name}</strong>.</p>
        <p><strong>Date:</strong> ${formatEventDate(invitation.event_date)}</p>
        <p><strong>Venue:</strong> ${invitation.venue_name || invitation.venue_location || "Venue not specified"}</p>
        <p>
          <a href="${rsvpLink}" style="display:inline-block;background:#C9A84C;color:white;padding:12px 18px;text-decoration:none;letter-spacing:.08em;text-transform:uppercase;font-size:12px">
            Confirm RSVP
          </a>
        </p>
        <p>If the button does not work, open this link:<br>${rsvpLink}</p>
      </div>
    `,
    text: `${guestLine}

This is a reminder to confirm your attendance for ${invitation.event_name}.
Date: ${formatEventDate(invitation.event_date)}
Venue: ${invitation.venue_name || invitation.venue_location || "Venue not specified"}

Confirm RSVP: ${rsvpLink}`,
  });

  return { sent: true, rsvp_link: rsvpLink };
}

async function sendDueRsvpReminders() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  try {
    const result = await pool.query(
      `SELECT
          i.id_invitation,
          i.guest_name,
          i.e_mail AS guest_email,
          i.rsvp_token,
          e.naziv AS event_name,
          e.datum_eventa AS event_date,
          e.venue_name,
          e.venue_lokacija AS venue_location
       FROM invitation i
       INNER JOIN event e ON e.id_event = i.TK_eventid_event
       WHERE i.rsvp_token IS NOT NULL
         AND i.rsvp_status = 'pending'
         AND i.rsvp_sent = TRUE
         AND COALESCE(i.reminder_sent, FALSE) = FALSE
         AND e.rsvp_due_date IS NOT NULL
         AND e.rsvp_due_date <= CURRENT_DATE
       ORDER BY e.rsvp_due_date ASC, i.id_invitation ASC
       LIMIT 50`,
    );

    for (const invitation of result.rows) {
      try {
        const sent = await sendRsvpReminderEmail(invitation);
        if (sent.sent) {
          await pool.query(
            `UPDATE invitation
             SET reminder_sent = TRUE,
                 reminder_sent_at = CURRENT_TIMESTAMP
             WHERE id_invitation = $1`,
            [invitation.id_invitation],
          );
        }
      } catch (err) {
        console.error("RSVP reminder email error:", err.message);
      }
    }
  } catch (err) {
    console.error("RSVP reminder scan error:", err.message);
  }
}

async function sendRsvpEmailsForInvitations(req, invitations) {
  const results = [];

  for (const invitation of invitations) {
    try {
      const result = await sendRsvpEmail(req, invitation);
      if (result.sent) {
        await pool.query(
          `UPDATE invitation
           SET rsvp_sent = TRUE,
               rsvp_sent_at = CURRENT_TIMESTAMP
           WHERE id_invitation = $1`,
          [invitation.id_invitation],
        );
      }
      results.push({ invitation_id: invitation.id_invitation, ...result });
    } catch (err) {
      results.push({
        invitation_id: invitation.id_invitation,
        sent: false,
        reason: err.message,
        rsvp_link: buildRsvpLink(req, invitation.rsvp_token),
      });
    }
  }

  return results;
}

async function sendUnsentRsvpInvitations() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  try {
    const result = await pool.query(
      `SELECT
          i.id_invitation,
          i.guest_name,
          i.e_mail AS guest_email,
          i.rsvp_token,
          i.rsvp_status,
          e.naziv AS event_name,
          e.datum_eventa AS event_date,
          e.venue_name,
          e.venue_lokacija AS venue_location,
          e.rsvp_due_date
       FROM invitation i
       INNER JOIN event e ON e.id_event = i.TK_eventid_event
       WHERE i.rsvp_token IS NOT NULL
         AND COALESCE(i.rsvp_sent, FALSE) = FALSE
       ORDER BY i.id_invitation ASC
       LIMIT 50`,
    );

    await sendRsvpEmailsForInvitations(null, result.rows);
  } catch (err) {
    console.error("Unsent RSVP email scan error:", err.message);
  }
}

async function createRsvpInvitationsForRequest(db, eventId, requestId, eventData) {
  if (!requestId) return [];

  const requestResult = await db.query(
    `SELECT z.guest_list, z.TK_clientid_client AS client_id
     FROM zahtev z
     WHERE z.id_zahtev = $1`,
    [requestId],
  );

  if (requestResult.rows.length === 0) return [];

  const request = requestResult.rows[0];
  const guests = normalizeGuestList(request.guest_list || []);
  const invitations = [];

  for (const guest of guests) {
    const token = generateRsvpToken();
    const inserted = await db.query(
      `INSERT INTO invitation (
         naziv,
         guest_name,
         TK_clientid_client,
         TK_eventid_event,
         e_mail,
         invited_guests,
         rsvp_token,
         rsvp_status,
         rsvp_sent,
         review_token
       )
       VALUES ($1,$2,$3,$4,$5,1,$6,'pending',FALSE,$7)
       ON CONFLICT (TK_eventid_event, e_mail)
       WHERE e_mail IS NOT NULL
       DO UPDATE SET
         guest_name = EXCLUDED.guest_name,
         rsvp_token = COALESCE(invitation.rsvp_token, EXCLUDED.rsvp_token),
         rsvp_status = COALESCE(invitation.rsvp_status, 'pending')
       RETURNING id_invitation, guest_name, e_mail, rsvp_token, rsvp_status`,
      [
        `RSVP - ${eventData.naziv}`,
        guest.guest_name,
        request.client_id,
        eventId,
        guest.email,
        token,
        generateReviewToken(),
      ],
    );

    const row = inserted.rows[0];
    invitations.push({
      id_invitation: row.id_invitation,
      guest_name: row.guest_name,
      guest_email: row.e_mail,
      rsvp_token: row.rsvp_token,
      rsvp_status: row.rsvp_status,
      event_name: eventData.naziv,
      event_date: eventData.datum_eventa,
      venue_name: eventData.venue_name,
      venue_location: eventData.venue_lokacija,
      rsvp_due_date: eventData.rsvp_due_date,
    });
  }

  return invitations;
}

async function ensureReviewSchema() {
  try {
    await pool.query(`
      ALTER TABLE zahtev
      ADD COLUMN IF NOT EXISTS organizer_price INTEGER,
      ADD COLUMN IF NOT EXISTS price_offer_status VARCHAR(255) DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS guest_list JSONB DEFAULT '[]'::jsonb
    `);

    await pool.query(`
      ALTER TABLE image
      ALTER COLUMN image_content TYPE TEXT
    `);

    await pool.query(`
      ALTER TABLE invitation
      ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS review_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS review_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS review_submitted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS rsvp_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS rsvp_status VARCHAR(255) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS rsvp_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS rsvp_sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS rsvp_responded_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS invitation_unique_event_email_idx
      ON invitation (TK_eventid_event, e_mail)
      WHERE e_mail IS NOT NULL
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS invitation_unique_review_token_idx
      ON invitation (review_token)
      WHERE review_token IS NOT NULL
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS invitation_unique_rsvp_token_idx
      ON invitation (rsvp_token)
      WHERE rsvp_token IS NOT NULL
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizer_review (
        review_id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES client(id_client),
        organizator_id INTEGER NOT NULL REFERENCES organizator(id_organizator),
        event_id INTEGER REFERENCES event(id_event),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        review_date DATE NOT NULL DEFAULT CURRENT_DATE
      )
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS organizer_review_unique_client_organizer_idx
      ON organizer_review (client_id, organizator_id)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_review (
        event_review_id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES event(id_event),
        invitation_id INTEGER NOT NULL REFERENCES invitation(id_invitation),
        guest_email VARCHAR(255) NOT NULL,
        guest_name VARCHAR(255),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        review_date DATE NOT NULL DEFAULT CURRENT_DATE
      )
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS event_review_unique_invitation_idx
      ON event_review (invitation_id)
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'review'
        ) THEN
          ALTER TABLE review
          ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES event(id_event);

          INSERT INTO organizer_review (client_id, organizator_id, event_id, rating, comment, review_date)
          SELECT client_id, organizator_id, event_id, rating, comment, review_date
          FROM review
          ON CONFLICT DO NOTHING;
        END IF;
      END $$;
    `);
  } catch (err) {
    console.error("âŒ  GreÅ¡ka pri migraciji review sheme:", err.message);
  }
}

pool
  .connect()
  .then(async (client) => {
    client.release();
    console.log("âœ…  Spojen na PostgreSQL bazu");
    await ensureReviewSchema();
    await sendUnsentRsvpInvitations();
    await sendDueRsvpReminders();
    setInterval(sendDueRsvpReminders, 60 * 60 * 1000);
  })
  .catch((err) =>
    console.error("âŒ  GreÅ¡ka pri spajanju na bazu:", err.message),
  );

// â”€â”€ Serviraj frontend statiÄke fajlove â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            o.telefon, o.image_content, o.city, o.tip_eventa, o.portfolio_description, o.cena_od,
            COALESCE(rs.avg_rating, o.ocena) AS ocena,
            COALESCE(rs.review_count, 0) AS stevilo_reviews,
            COALESCE(ev.stevilo_eventov, 0) AS stevilo_eventov
        FROM organizator o
        LEFT JOIN (
            SELECT
                organizator_id,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(*) AS review_count
            FROM organizer_review
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
    console.error("SQL greÅ¡ka:", err.message);
    res
      .status(500)
      .json({ error: "GreÅ¡ka pri dohvatanju podataka: " + err.message });
  }
});

app.get("/api/organizers/:id", async (req, res) => {
  const { id } = req.params;

  const sql = `
        SELECT
            o.id_organizator, o.ime, o.priimek, o.email, o.portfolio,
            o.telefon, o.image_content, o.city, o.tip_eventa, o.portfolio_description, o.cena_od,
            COALESCE(rs.avg_rating, o.ocena) AS ocena,
            COALESCE(rs.review_count, 0) AS stevilo_reviews,
            COALESCE(ev.stevilo_eventov, 0) AS stevilo_eventov
        FROM organizator o
        LEFT JOIN (
            SELECT
                organizator_id,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(*) AS review_count
            FROM organizer_review
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
      return res.status(404).json({ error: "Organizator nije pronaÄ‘en" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("SQL greÅ¡ka:", err.message);
    res
      .status(500)
      .json({ error: "GreÅ¡ka pri dohvatanju podataka: " + err.message });
  }
});

app.get("/api/organizers/:id/reviewable-events", async (req, res) => {
  const organizerId = parseInt(req.params.id);
  const clientId = parseInt(req.query.client_id);

  if (!Number.isInteger(organizerId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid organizer id and client_id are required" });
  }

  try {
    const existingReview = await pool.query(
      `SELECT review_id
       FROM organizer_review
       WHERE client_id = $1 AND organizator_id = $2
       LIMIT 1`,
      [clientId, organizerId],
    );

    if (existingReview.rows.length > 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT
          e.id_event,
          e.naziv,
          e.datum_eventa,
          e.venue_name,
          e.venue_lokacija
       FROM event e
       INNER JOIN zahtev z ON z.id_zahtev = e.TK_zahtevid_zahtev
       WHERE e.TK_organizatorid_organizator = $1
         AND z.TK_clientid_client = $2
         AND z.TK_organizatorid_organizator = $1
       ORDER BY e.datum_eventa DESC, e.id_event DESC`,
      [organizerId, clientId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("SQL greÅ¡ka (GET reviewable events):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/organizers/:id/reviews", async (req, res) => {
  const { id } = req.params;

  const sql = `
        SELECT
            r.review_id,
            r.client_id,
            r.organizator_id,
            r.event_id,
            r.rating,
            r.comment,
            r.review_date,
            c.ime,
            c.priimek,
            e.naziv AS event_name,
            e.datum_eventa,
            CONCAT(c.ime, ' ', c.priimek) AS client_name
        FROM organizer_review r
        INNER JOIN client c ON c.id_client = r.client_id
        LEFT JOIN event e ON e.id_event = r.event_id
        WHERE r.organizator_id = $1
        ORDER BY r.review_date DESC, r.review_id DESC
    `;

  try {
    const result = await pool.query(sql, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error("SQL greÅ¡ka (GET organizer reviews):", err.message);
    res
      .status(500)
      .json({ error: "GreÅ¡ka pri dohvatanju review podataka: " + err.message });
  }
});

app.post("/api/organizers/:id/reviews", async (req, res) => {
  const organizerId = parseInt(req.params.id);
  const parsedRating = parseInt(req.body.rating);
  const clientId = parseInt(req.body.client_id);
  const rawEventId = req.body.event_id;
  const eventId =
    rawEventId !== undefined && rawEventId !== null && rawEventId !== ""
      ? parseInt(rawEventId)
      : null;
  const safeComment = String(req.body.comment || "").trim() || null;

  if (!Number.isInteger(organizerId)) {
    return res.status(400).json({ error: "Invalid organizer id" });
  }

  if (!Number.isInteger(clientId)) {
    return res.status(400).json({ error: "Valid client_id is required" });
  }

  if (
    rawEventId !== undefined &&
    rawEventId !== null &&
    rawEventId !== "" &&
    !Number.isInteger(eventId)
  ) {
    return res.status(400).json({ error: "event_id must be a valid integer" });
  }

  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res
      .status(400)
      .json({ error: "Rating must be an integer between 1 and 5" });
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
      return res.status(404).json({ error: "Organizator nije pronaÄ‘en" });
    }

    const clientCheck = await db.query(
      `SELECT id_client, CONCAT(ime, ' ', priimek) AS client_name
       FROM client
       WHERE id_client = $1`,
      [clientId],
    );

    if (clientCheck.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Client nije pronaÄ‘en" });
    }

    const eligibleEvents = await db.query(
      `SELECT
          e.id_event,
          e.naziv
       FROM event e
       INNER JOIN zahtev z ON z.id_zahtev = e.TK_zahtevid_zahtev
       WHERE e.TK_organizatorid_organizator = $1
         AND z.TK_clientid_client = $2
         AND z.TK_organizatorid_organizator = $1
       ORDER BY e.datum_eventa DESC, e.id_event DESC`,
      [organizerId, clientId],
    );

    if (eligibleEvents.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(403).json({
        error: "You can only review an organizer that you booked.",
      });
    }

    let selectedEvent = null;
    if (Number.isInteger(eventId)) {
      selectedEvent = eligibleEvents.rows.find(
        (event) => event.id_event === eventId,
      );
      if (!selectedEvent) {
        await db.query("ROLLBACK");
        return res.status(403).json({
          error:
            "You can only link an organizer review to an event that you booked with them.",
        });
      }
    }

    const existingReview = await db.query(
      `SELECT review_id
       FROM organizer_review
       WHERE client_id = $1
         AND organizator_id = $2
       LIMIT 1`,
      [clientId, organizerId],
    );

    if (existingReview.rows.length > 0) {
      await db.query("ROLLBACK");
      return res.status(409).json({
        error: "You have already submitted a review for this organizer.",
      });
    }

    const insertReview = await db.query(
      `INSERT INTO organizer_review (client_id, organizator_id, event_id, rating, comment, review_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
       RETURNING review_id, client_id, organizator_id, event_id, rating, comment, review_date`,
      [clientId, organizerId, eventId, parsedRating, safeComment],
    );

    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      client_id: clientId,
      review: {
        ...insertReview.rows[0],
        client_name: clientCheck.rows[0].client_name,
        event_name: selectedEvent ? selectedEvent.naziv : null,
      },
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greÅ¡ka (POST organizer review):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

app.get("/api/events/:id/reviews", async (req, res) => {
  const eventId = parseInt(req.params.id);

  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  try {
    const result = await pool.query(
      `SELECT
          er.event_review_id,
          er.event_id,
          er.invitation_id,
          er.guest_email,
          er.guest_name,
          er.rating,
          er.comment,
          er.review_date
       FROM event_review er
       WHERE er.event_id = $1
       ORDER BY er.review_date DESC, er.event_review_id DESC`,
      [eventId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("SQL greÅ¡ka (GET event reviews):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/events/:id/review-links/generate", async (req, res) => {
  const eventId = parseInt(req.params.id);
  const clientId = parseInt(req.body.client_id);

  if (!Number.isInteger(eventId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid event id and client_id are required" });
  }

  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const eventCheck = await db.query(
      `SELECT e.id_event, e.naziv
       FROM event e
       INNER JOIN zahtev z ON z.id_zahtev = e.TK_zahtevid_zahtev
       WHERE e.id_event = $1
         AND z.TK_clientid_client = $2
       LIMIT 1`,
      [eventId, clientId],
    );

    if (eventCheck.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({
        error: "Event not found for this client",
      });
    }

    const invitationsResult = await db.query(
      `SELECT id_invitation, guest_name, e_mail, review_token, review_submitted
       FROM invitation
       WHERE TK_eventid_event = $1
         AND TK_clientid_client = $2
         AND e_mail IS NOT NULL
       ORDER BY id_invitation ASC`,
      [eventId, clientId],
    );

    if (invitationsResult.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({
        error: "No guest invitations found for this event",
      });
    }

    const generatedLinks = [];

    for (const invitation of invitationsResult.rows) {
      let token = invitation.review_token;

      if (!token) {
        token = generateReviewToken();
        await db.query(
          `UPDATE invitation
           SET review_token = $1,
               review_sent = TRUE,
               review_sent_at = CURRENT_TIMESTAMP
           WHERE id_invitation = $2`,
          [token, invitation.id_invitation],
        );
      } else {
        await db.query(
          `UPDATE invitation
           SET review_sent = TRUE,
               review_sent_at = CURRENT_TIMESTAMP
           WHERE id_invitation = $1`,
          [invitation.id_invitation],
        );
      }

      generatedLinks.push({
        invitation_id: invitation.id_invitation,
        guest_name: invitation.guest_name,
        guest_email: invitation.e_mail,
        review_submitted: Boolean(invitation.review_submitted),
        review_link: buildGuestReviewLink(req, token),
      });
    }

    await db.query("COMMIT");

    res.json({
      success: true,
      event_id: eventId,
      event_name: eventCheck.rows[0].naziv,
      simulated_emails: generatedLinks,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greÅ¡ka (POST generate review links):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

app.get("/api/events/:id/review-links/generate", async (req, res) => {
  const eventId = parseInt(req.params.id);
  const clientId = parseInt(req.query.client_id);

  if (!Number.isInteger(eventId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid event id and client_id are required" });
  }

  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const eventCheck = await db.query(
      `SELECT e.id_event, e.naziv
       FROM event e
       INNER JOIN zahtev z ON z.id_zahtev = e.TK_zahtevid_zahtev
       WHERE e.id_event = $1
         AND z.TK_clientid_client = $2
       LIMIT 1`,
      [eventId, clientId],
    );

    if (eventCheck.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({
        error: "Event not found for this client",
      });
    }

    const invitationsResult = await db.query(
      `SELECT id_invitation, guest_name, e_mail, review_token, review_submitted
       FROM invitation
       WHERE TK_eventid_event = $1
         AND TK_clientid_client = $2
         AND e_mail IS NOT NULL
       ORDER BY id_invitation ASC`,
      [eventId, clientId],
    );

    if (invitationsResult.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({
        error: "No guest invitations found for this event",
      });
    }

    const generatedLinks = [];

    for (const invitation of invitationsResult.rows) {
      let token = invitation.review_token;

      if (!token) {
        token = generateReviewToken();
        await db.query(
          `UPDATE invitation
           SET review_token = $1,
               review_sent = TRUE,
               review_sent_at = CURRENT_TIMESTAMP
           WHERE id_invitation = $2`,
          [token, invitation.id_invitation],
        );
      } else {
        await db.query(
          `UPDATE invitation
           SET review_sent = TRUE,
               review_sent_at = CURRENT_TIMESTAMP
           WHERE id_invitation = $1`,
          [invitation.id_invitation],
        );
      }

      generatedLinks.push({
        invitation_id: invitation.id_invitation,
        guest_name: invitation.guest_name,
        guest_email: invitation.e_mail,
        review_submitted: Boolean(invitation.review_submitted),
        review_link: buildGuestReviewLink(req, token),
      });
    }

    await db.query("COMMIT");

    res.json({
      success: true,
      event_id: eventId,
      event_name: eventCheck.rows[0].naziv,
      simulated_emails: generatedLinks,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greÅ¡ka (GET generate review links):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

app.get("/api/events/:id/review-links", async (req, res) => {
  const eventId = parseInt(req.params.id);
  const clientId = parseInt(req.query.client_id);

  if (!Number.isInteger(eventId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid event id and client_id are required" });
  }

  try {
    const eventCheck = await pool.query(
      `SELECT e.id_event, e.naziv
       FROM event e
       INNER JOIN zahtev z ON z.id_zahtev = e.TK_zahtevid_zahtev
       WHERE e.id_event = $1
         AND z.TK_clientid_client = $2
       LIMIT 1`,
      [eventId, clientId],
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: "Event not found for this client" });
    }

    const result = await pool.query(
      `SELECT
          i.id_invitation AS invitation_id,
          i.guest_name,
          i.e_mail AS guest_email,
          i.review_sent,
          i.review_sent_at,
          i.review_submitted,
          i.review_token
       FROM invitation i
       WHERE i.TK_eventid_event = $1
         AND i.TK_clientid_client = $2
         AND i.e_mail IS NOT NULL
       ORDER BY i.id_invitation ASC`,
      [eventId, clientId],
    );

    res.json({
      event_id: eventId,
      event_name: eventCheck.rows[0].naziv,
      simulated_emails: result.rows.map((row) => ({
        invitation_id: row.invitation_id,
        guest_name: row.guest_name,
        guest_email: row.guest_email,
        review_sent: row.review_sent,
        review_sent_at: row.review_sent_at,
        review_submitted: row.review_submitted,
        review_link: row.review_token
          ? buildGuestReviewLink(req, row.review_token)
          : null,
      })),
    });
  } catch (err) {
    console.error("SQL greÅ¡ka (GET review links):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/event-review-access", async (req, res) => {
  const token = String(req.query.token || "").trim();

  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }

  try {
    const result = await pool.query(
      `SELECT
          i.id_invitation,
          i.guest_name,
          i.e_mail,
          i.review_submitted,
          e.id_event,
          e.naziv AS event_name,
          e.datum_eventa,
          e.venue_name,
          e.venue_lokacija,
          o.id_organizator,
          CONCAT(o.ime, ' ', o.priimek) AS organizer_name
       FROM invitation i
       INNER JOIN event e ON e.id_event = i.TK_eventid_event
       INNER JOIN organizator o ON o.id_organizator = e.TK_organizatorid_organizator
       WHERE i.review_token = $1
       LIMIT 1`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invalid review token" });
    }

    res.json({
      valid: true,
      invitation_id: result.rows[0].id_invitation,
      guest_name: result.rows[0].guest_name,
      guest_email: result.rows[0].e_mail,
      review_submitted: result.rows[0].review_submitted,
      event: {
        id_event: result.rows[0].id_event,
        naziv: result.rows[0].event_name,
        datum_eventa: result.rows[0].datum_eventa,
        venue_name: result.rows[0].venue_name,
        venue_lokacija: result.rows[0].venue_lokacija,
      },
      organizer: {
        id_organizator: result.rows[0].id_organizator,
        name: result.rows[0].organizer_name,
      },
    });
  } catch (err) {
    console.error("SQL greÅ¡ka (GET event review access):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/event-reviews", async (req, res) => {
  const token = String(req.body.token || "").trim();
  const rating = parseInt(req.body.rating);
  const safeComment = String(req.body.comment || "").trim() || null;

  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ error: "Rating must be an integer between 1 and 5" });
  }

  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const invitationResult = await db.query(
      `SELECT
          i.id_invitation,
          i.TK_eventid_event,
          i.e_mail,
          i.guest_name,
          i.review_submitted,
          e.naziv AS event_name
       FROM invitation i
       INNER JOIN event e ON e.id_event = i.TK_eventid_event
       WHERE i.review_token = $1
       LIMIT 1`,
      [token],
    );

    if (invitationResult.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Invalid review token" });
    }

    const invitation = invitationResult.rows[0];

    if (invitation.review_submitted) {
      await db.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "This guest review was already submitted" });
    }

    const existingReview = await db.query(
      `SELECT event_review_id
       FROM event_review
       WHERE invitation_id = $1
       LIMIT 1`,
      [invitation.id_invitation],
    );

    if (existingReview.rows.length > 0) {
      await db.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "This guest review already exists" });
    }

    const insertedReview = await db.query(
      `INSERT INTO event_review (
          event_id,
          invitation_id,
          guest_email,
          guest_name,
          rating,
          comment,
          review_date
       )
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
       RETURNING event_review_id, event_id, invitation_id, guest_email, guest_name, rating, comment, review_date`,
      [
        invitation.TK_eventid_event,
        invitation.id_invitation,
        invitation.e_mail,
        invitation.guest_name,
        rating,
        safeComment,
      ],
    );

    await db.query(
      `UPDATE invitation
       SET review_submitted = TRUE
       WHERE id_invitation = $1`,
      [invitation.id_invitation],
    );

    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      event_name: invitation.event_name,
      review: insertedReview.rows[0],
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greÅ¡ka (POST event review):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

app.get("/api/rsvp-access", async (req, res) => {
  const token = String(req.query.token || "").trim();

  if (!token) {
    return res.status(400).json({ error: "RSVP token is required" });
  }

  try {
    const result = await pool.query(
      `SELECT
          i.id_invitation,
          i.guest_name,
          i.e_mail AS guest_email,
          i.rsvp_status,
          i.rsvp_responded_at,
          e.naziv AS event_name,
          e.datum_eventa,
          e.venue_name,
          e.venue_lokacija,
          e.rsvp_due_date,
          CONCAT(o.ime, ' ', o.priimek) AS organizer_name
       FROM invitation i
       INNER JOIN event e ON e.id_event = i.TK_eventid_event
       INNER JOIN organizator o ON o.id_organizator = e.TK_organizatorid_organizator
       WHERE i.rsvp_token = $1
       LIMIT 1`,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "RSVP link was not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("SQL greÅ¡ka (GET RSVP access):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/rsvp", async (req, res) => {
  const token = String(req.body.token || "").trim();
  const status = String(req.body.status || "").trim().toLowerCase();

  if (!token) {
    return res.status(400).json({ error: "RSVP token is required" });
  }

  if (status !== "accepted" && status !== "declined") {
    return res
      .status(400)
      .json({ error: "RSVP status must be accepted or declined" });
  }

  try {
    const result = await pool.query(
      `UPDATE invitation
       SET rsvp_status = $1,
           rsvp_approved_guest = $2,
           rsvp_responded_at = CURRENT_TIMESTAMP
       WHERE rsvp_token = $3
       RETURNING id_invitation, guest_name, e_mail AS guest_email, rsvp_status, rsvp_responded_at`,
      [status, status === "accepted" ? 1 : 0, token],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "RSVP link was not found" });
    }

    res.json({ success: true, invitation: result.rows[0] });
  } catch (err) {
    console.error("SQL greÅ¡ka (POST RSVP):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ API: POST /api/organizers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Registracija novega organizatorja â€” kliÄe register.html
app.post("/api/organizers", async (req, res) => {
  const { ime, priimek, email, geslo, city, telefon, tip_eventa } = req.body;

  if (!ime || !priimek || !email || !geslo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Preveri Äe email Å¾e obstaja
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
    console.error("SQL greÅ¡ka:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ API: GET /api/events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    console.error("SQL greÅ¡ka (GET events):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ API: POST /api/organizers/:id/image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Upload profilne slike organizatora (base64)
app.post("/api/organizers/:id/image", async (req, res) => {
  const { id } = req.params;
  const { image_base64 } = req.body;

  if (!image_base64) {
    return res.status(400).json({ error: "image_base64 is required" });
  }

  // Provjeri veliÄinu â€” max ~2MB base64
  if (image_base64.length > 2_800_000) {
    return res.status(400).json({ error: "Image too large. Max 2MB." });
  }

  try {
    const result = await pool.query(
      "UPDATE organizator SET image_content = $1 WHERE id_organizator = $2 RETURNING id_organizator",
      [image_base64, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Organizator nije pronaÄ‘en" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("SQL greÅ¡ka (POST organizer image):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ API: POST /api/events/:id/image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Upload slike za event (base64) â€” Äuva u image tabeli
app.post("/api/events/:id/image", async (req, res) => {
  const { id } = req.params;
  const { image_base64, cover_image = true } = req.body;

  if (!image_base64) {
    return res.status(400).json({ error: "image_base64 is required" });
  }

  if (image_base64.length > 2_800_000) {
    return res.status(400).json({ error: "Image too large. Max 2MB." });
  }

  try {
    // Provjeri da event postoji
    const eventCheck = await pool.query(
      "SELECT id_event FROM event WHERE id_event = $1",
      [id],
    );
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: "Event nije pronaÄ‘en" });
    }

    // Ako je cover, ukloni stari cover
    if (cover_image) {
      await pool.query(
        "UPDATE image SET cover_image = false WHERE eventid_event = $1 AND cover_image = true",
        [id],
      );
    }

    const result = await pool.query(
      "INSERT INTO image (cover_image, image_content, eventid_event) VALUES ($1, $2, $3) RETURNING id_image",
      [cover_image, image_base64, id],
    );
    res.status(201).json({ success: true, id_image: result.rows[0].id_image });
  } catch (err) {
    console.error("SQL greÅ¡ka (POST event image):", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ API: GET /api/events/:id/image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Dohvati cover sliku za event
app.get("/api/events/:id/image", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "SELECT image_content FROM image WHERE eventid_event = $1 AND cover_image = true LIMIT 1",
      [id],
    );
    if (result.rows.length === 0 || !result.rows[0].image_content) {
      return res.status(404).json({ error: "No image found" });
    }
    res.json({ image_content: result.rows[0].image_content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ API: PATCH /api/events/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AÅ¾uriranje postojeÄ‡eg eventa â€” kliÄe Modify modal u profile-detail.html
app.patch("/api/events/:id", async (req, res) => {
  const { id } = req.params;
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

  if (!naziv || !datum_eventa) {
    return res
      .status(400)
      .json({ error: "naziv and datum_eventa are required" });
  }

  const sql = `
    UPDATE event
    SET naziv                        = $1,
        datum_eventa                 = $2,
        opis                         = $3,
        stevilo_gostov               = $4,
        venue_name                   = $5,
        venue_lokacija               = $6,
        rsvp_due_date                = $7,
        e_mail_notification          = $8
    WHERE id_event = $9
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
      parseInt(id),
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Event nije pronaÄ‘en" });
    }

    res.json({ success: true, id_event: result.rows[0].id_event });
  } catch (err) {
    console.error("SQL greÅ¡ka (PATCH event):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  const eventId = parseInt(req.params.id);

  if (!Number.isInteger(eventId)) {
    return res.status(400).json({ error: "Invalid event id" });
  }

  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const eventCheck = await db.query(
      `SELECT id_event FROM event WHERE id_event = $1 LIMIT 1`,
      [eventId],
    );

    if (eventCheck.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Event nije pronaÄ‘en" });
    }

    await db.query(
      `DELETE FROM event_review
       WHERE event_id = $1
          OR invitation_id IN (
            SELECT id_invitation FROM invitation WHERE TK_eventid_event = $1
          )`,
      [eventId],
    );

    await db.query(
      `DELETE FROM invitation
       WHERE TK_eventid_event = $1`,
      [eventId],
    );

    await db.query(
      `DELETE FROM image
       WHERE eventid_event = $1`,
      [eventId],
    );

    await db.query(
      `UPDATE organizer_review
       SET event_id = NULL
       WHERE event_id = $1`,
      [eventId],
    );

    await db.query(
      `DELETE FROM event
       WHERE id_event = $1`,
      [eventId],
    );

    await db.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greÅ¡ka (DELETE event):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

// â”€â”€ API: PATCH /api/organizers/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Posodobitev profila organizatorja â€” kliÄe profile-detail.html (Edit Profile modal)
app.patch("/api/organizers/:id", async (req, res) => {
  const { id } = req.params;
  const {
    ime,
    priimek,
    city,
    telefon,
    tip_eventa,
    portfolio,
    portfolio_description,
    cena_od,
  } = req.body;

  if (!ime || !priimek) {
    return res.status(400).json({ error: "ime and priimek are required" });
  }

  const sql = `
        UPDATE organizator
        SET ime                   = $1,
            priimek               = $2,
            city                  = $3,
            telefon               = $4,
            tip_eventa            = $5,
            portfolio             = $6,
            portfolio_description = $7,
            cena_od               = $8
        WHERE id_organizator = $9
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
      portfolio_description || null,
      cena_od !== undefined ? parseInt(cena_od) : 0,
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Organizator nije pronaÄ‘en" });
    }
    res.json({ success: true, id_organizator: result.rows[0].id_organizator });
  } catch (err) {
    console.error("SQL greÅ¡ka (PATCH organizer):", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/organizers/:id", async (req, res) => {
  const { id } = req.params;
  const organizerId = parseInt(id);

  if (!Number.isInteger(organizerId)) {
    return res.status(400).json({ error: "Invalid organizer id" });
  }

  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const organizerCheck = await db.query(
      `SELECT id_organizator FROM organizator WHERE id_organizator = $1 LIMIT 1`,
      [organizerId],
    );

    if (organizerCheck.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Organizator nije pronaÄ‘en" });
    }

    await db.query(
      `DELETE FROM event_review
       WHERE event_id IN (
         SELECT id_event FROM event WHERE TK_organizatorid_organizator = $1
       )
          OR invitation_id IN (
            SELECT id_invitation
            FROM invitation
            WHERE TK_eventid_event IN (
              SELECT id_event FROM event WHERE TK_organizatorid_organizator = $1
            )
          )`,
      [organizerId],
    );

    await db.query(
      `DELETE FROM invitation
       WHERE TK_eventid_event IN (
         SELECT id_event FROM event WHERE TK_organizatorid_organizator = $1
       )`,
      [organizerId],
    );

    await db.query(
      `DELETE FROM image
       WHERE eventid_event IN (
         SELECT id_event FROM event WHERE TK_organizatorid_organizator = $1
       )`,
      [organizerId],
    );

    await db.query(`DELETE FROM organizer_review WHERE organizator_id = $1`, [
      organizerId,
    ]);

    await db.query(
      `DELETE FROM event WHERE TK_organizatorid_organizator = $1`,
      [organizerId],
    );

    await db.query(
      `UPDATE zahtev
       SET TK_organizatorid_organizator = NULL
       WHERE TK_organizatorid_organizator = $1`,
      [organizerId],
    );

    await db.query(
      `DELETE FROM organizator
       WHERE id_organizator = $1`,
      [organizerId],
    );

    await db.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greÅ¡ka (DELETE organizer):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

// â”€â”€ API: POST /api/events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Kreiranje novog eventa â€” kliÄe create-event.html
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
    TK_zahtevid_zahtev,
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
             rsvp_due_date, e_mail_notification, TK_organizatorid_organizator, TK_zahtevid_zahtev)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id_event
    `;

  const db = await pool.connect();
  let rsvpInvitations = [];

  try {
    await db.query("BEGIN");

    const result = await db.query(sql, [
      naziv,
      datum_eventa,
      opis || null,
      stevilo_gostov ? parseInt(stevilo_gostov) : null,
      venue_name || null,
      venue_lokacija || null,
      rsvp_due_date || null,
      e_mail_notification || null,
      parseInt(TK_organizatorid_organizator),
      TK_zahtevid_zahtev ? parseInt(TK_zahtevid_zahtev) : null,
    ]);

    const eventId = result.rows[0].id_event;

    if (TK_zahtevid_zahtev) {
      await db.query(
        `UPDATE zahtev
         SET status = 'accepted',
             organizator_notified_change = FALSE,
             komentar = COALESCE(komentar, 'Event created by organizer.')
         WHERE id_zahtev = $1
           AND TK_organizatorid_organizator = $2`,
        [parseInt(TK_zahtevid_zahtev), parseInt(TK_organizatorid_organizator)],
      );

      rsvpInvitations = await createRsvpInvitationsForRequest(
        db,
        eventId,
        parseInt(TK_zahtevid_zahtev),
        {
          naziv,
          datum_eventa,
          venue_name,
          venue_lokacija,
          rsvp_due_date,
        },
      );
    }

    await db.query("COMMIT");

    const rsvpEmailResults = await sendRsvpEmailsForInvitations(
      req,
      rsvpInvitations,
    );

    res.status(201).json({
      id_event: eventId,
      rsvp_invitations: rsvpInvitations.length,
      rsvp_email_results: rsvpEmailResults,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("SQL greÅ¡ka (POST event):", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

// â”€â”€ POST /api/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Preveri organizatorja ali clienta v bazi po emailu in geslu
app.post("/api/login", async (req, res) => {
  const { email, passwordHash } = req.body;
  if (!email || !passwordHash) {
    return res.status(400).json({ error: "email and passwordHash required" });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Preveri organizatorje
    const orgResult = await pool.query(
      "SELECT id_organizator, ime, priimek, email, geslo FROM organizator WHERE LOWER(email) = $1",
      [normalizedEmail],
    );

    if (orgResult.rows.length > 0) {
      const org = orgResult.rows[0];
      // Sprejmi SHA-256 hash (novi profili) ALI plain text (seed profili)
      if (org.geslo === passwordHash || org.geslo === req.body.plainPassword) {
        return res.json({
          found: true,
          userType: "organizer",
          id: String(org.id_organizator),
          organizerId: org.id_organizator,
          clientDbId: null,
          firstName: org.ime,
          lastName: org.priimek,
          email: org.email,
        });
      } else {
        return res.status(401).json({ error: "Incorrect password" });
      }
    }

    // Preveri cliente
    const clientResult = await pool.query(
      "SELECT id_client, ime, priimek, email, geslo FROM client WHERE LOWER(email) = $1",
      [normalizedEmail],
    );

    if (clientResult.rows.length > 0) {
      const cli = clientResult.rows[0];
      if (cli.geslo === passwordHash || cli.geslo === req.body.plainPassword) {
        return res.json({
          found: true,
          userType: "client",
          id: String(cli.id_client),
          organizerId: null,
          clientDbId: cli.id_client,
          firstName: cli.ime,
          lastName: cli.priimek,
          email: cli.email,
        });
      } else {
        return res.status(401).json({ error: "Incorrect password" });
      }
    }

    return res
      .status(404)
      .json({ error: "No account found with this email address" });
  } catch (err) {
    console.error("SQL greÅ¡ka (POST login):", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// â”€â”€ POST /api/client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/client", async (req, res) => {
  const { ime, priimek, email, geslo } = req.body;
  if (!ime || !priimek || !email || !geslo)
    return res.status(400).json({ error: "Missing required fields" });
  try {
    const check = await pool.query(
      "SELECT id_client FROM client WHERE LOWER(email) = $1 LIMIT 1",
      [email.trim().toLowerCase()],
    );
    if (check.rows.length > 0)
      return res.status(409).json({ error: "Email already exists" });
    const result = await pool.query(
      "INSERT INTO client (ime, priimek, email, geslo) VALUES ($1, $2, $3, $4) RETURNING id_client",
      [ime, priimek, email.trim().toLowerCase(), geslo],
    );
    res.status(201).json({ id_client: result.rows[0].id_client });
  } catch (err) {
    console.error("POST /api/client error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ GET /api/client/by-email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/client/by-email", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const result = await pool.query(
      "SELECT id_client, ime, priimek, email FROM client WHERE LOWER(email) = $1 LIMIT 1",
      [email.trim().toLowerCase()],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Client not found" });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ POST /api/requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/requests", async (req, res) => {
  const {
    organizer_id,
    client_id,
    event_type,
    event_date,
    guest_count,
    budget,
    venue,
    message,
  } = req.body;

  const organizerId = parseInt(organizer_id);
  const clientId = parseInt(client_id);
  const guests = guest_count ? parseInt(guest_count) : null;
  const price = budget ? parseInt(budget) : null;
  const safeVenue = String(venue || "").trim() || null;
  const safeMessage = String(message || "").trim();
  const safeEventType = String(event_type || "").trim();
  const safeDate = String(event_date || "").trim();

  if (!Number.isInteger(organizerId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid organizer_id and client_id are required" });
  }
  if (!safeEventType || !safeDate || !safeMessage) {
    return res
      .status(400)
      .json({ error: "event_type, event_date and message are required" });
  }

  try {
    const organizerCheck = await pool.query(
      "SELECT id_organizator FROM organizator WHERE id_organizator = $1",
      [organizerId],
    );
    if (organizerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    const clientCheck = await pool.query(
      "SELECT id_client FROM client WHERE id_client = $1",
      [clientId],
    );
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const result = await pool.query(
      `INSERT INTO zahtev (
        datum,
        opis,
        status,
        tip_eventa,
        venue,
        TK_clientid_client,
        TK_organizatorid_organizator,
        cena,
        gosti
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id_zahtev, status`,
      [
        safeDate,
        safeMessage,
        "pending",
        safeEventType,
        safeVenue,
        clientId,
        organizerId,
        price,
        guests,
      ],
    );

    res.status(201).json({
      success: true,
      request: result.rows[0],
    });
  } catch (err) {
    console.error("POST /api/requests error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ GET /api/requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/requests", async (req, res) => {
  const { client_id, organizer_id } = req.query;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (client_id) {
    conditions.push(`z.TK_clientid_client = $${idx}`);
    params.push(parseInt(client_id));
    idx++;
  }

  if (organizer_id) {
    conditions.push(`z.TK_organizatorid_organizator = $${idx}`);
    params.push(parseInt(organizer_id));
    idx++;
  }

  if (conditions.length === 0) {
    return res
      .status(400)
      .json({ error: "client_id or organizer_id is required" });
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const sql = `
    SELECT
      z.id_zahtev,
      z.datum,
      z.opis,
      z.status,
      z.tip_eventa,
      z.venue,
      z.komentar,
      z.client_change_request,
      z.client_change_details,
      z.proposed_datum,
      z.proposed_venue,
      z.proposed_cena,
      z.proposed_gosti,
      z.organizator_notified_change,
      z.ocena,
      z.cena,
      z.gosti,
      z.organizer_price,
      z.price_offer_status,
      z.guest_list,
      z.TK_clientid_client,
      z.TK_organizatorid_organizator,
      c.ime AS client_ime,
      c.priimek AS client_priimek,
      c.email AS client_email,
      o.ime AS organizer_ime,
      o.priimek AS organizer_priimek,
      o.email AS organizer_email
    FROM zahtev z
    INNER JOIN client c ON c.id_client = z.TK_clientid_client
    LEFT JOIN organizator o ON o.id_organizator = z.TK_organizatorid_organizator
    ${whereClause}
    ORDER BY z.datum DESC, z.id_zahtev DESC
  `;

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/requests error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ PUT /api/requests/:id/guests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.put("/api/requests/:id/guests", async (req, res) => {
  const requestId = parseInt(req.params.id);
  const clientId = parseInt(req.body.client_id);
  const guests = normalizeGuestList(req.body.guests || req.body.guest_list || []);

  if (!Number.isInteger(requestId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid request id and client_id are required" });
  }

  if (guests.length === 0) {
    return res.status(400).json({
      error: "Please add at least one valid guest email address.",
    });
  }

  try {
    const requestCheck = await pool.query(
      `SELECT id_zahtev, price_offer_status
       FROM zahtev
       WHERE id_zahtev = $1
         AND TK_clientid_client = $2`,
      [requestId, clientId],
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({ error: "Request not found for this client" });
    }

    if (requestCheck.rows[0].price_offer_status !== "approved") {
      return res.status(403).json({
        error: "Guest emails can be added after the price offer is approved.",
      });
    }

    const result = await pool.query(
      `UPDATE zahtev
       SET guest_list = $1::jsonb
       WHERE id_zahtev = $2
         AND TK_clientid_client = $3
       RETURNING id_zahtev, guest_list`,
      [JSON.stringify(guests), requestId, clientId],
    );

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error("PUT /api/requests/:id/guests error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ PATCH /api/requests/:id/status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/requests/:id/status", async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { status, organizer_id, komentar } = req.body;
  const organizerId = parseInt(organizer_id);
  const safeStatus = String(status || "")
    .trim()
    .toLowerCase();
  const safeComment = String(komentar || "").trim() || null;
  const allowedStatuses = ["pending", "accepted", "declined", "done"];

  if (!Number.isInteger(requestId) || !Number.isInteger(organizerId)) {
    return res
      .status(400)
      .json({ error: "Valid request id and organizer_id are required" });
  }
  if (!allowedStatuses.includes(safeStatus)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  try {
    const result = await pool.query(
      `UPDATE zahtev
       SET status = $1,
           komentar = COALESCE($2, komentar),
           organizator_notified_change = FALSE
       WHERE id_zahtev = $3
         AND TK_organizatorid_organizator = $4
       RETURNING id_zahtev, status, komentar`,
      [safeStatus, safeComment, requestId, organizerId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found for this organizer" });
    }

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/requests/:id/status error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ PATCH /api/requests/:id/client-action â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/requests/:id/client-action", async (req, res) => {
  const requestId = parseInt(req.params.id);
  const {
    client_id,
    details,
    proposed_date,
    proposed_venue,
    proposed_budget,
    proposed_guests,
    cancel_request,
  } = req.body;

  const clientId = parseInt(client_id);
  const safeDetails = String(details || "").trim() || null;
  const safeProposedDate = String(proposed_date || "").trim() || null;
  const safeProposedVenue = String(proposed_venue || "").trim() || null;
  const proposedBudget =
    proposed_budget !== undefined &&
    proposed_budget !== null &&
    proposed_budget !== ""
      ? parseInt(proposed_budget)
      : null;
  const proposedGuests =
    proposed_guests !== undefined &&
    proposed_guests !== null &&
    proposed_guests !== ""
      ? parseInt(proposed_guests)
      : null;
  const wantsCancel = Boolean(cancel_request);

  const selectedActions = [];
  if (safeProposedDate) selectedActions.push("edit_date");
  if (safeProposedVenue) selectedActions.push("edit_venue");
  if (Number.isInteger(proposedBudget)) selectedActions.push("edit_budget");
  if (Number.isInteger(proposedGuests)) selectedActions.push("edit_guests");
  if (wantsCancel) selectedActions.push("cancel");

  if (!Number.isInteger(requestId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid request id and client_id are required" });
  }
  if (selectedActions.length === 0 && !safeDetails) {
    return res.status(400).json({
      error: "Provide at least one change value or cancellation request",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE zahtev
       SET client_change_request = $1,
           client_change_details = $2,
           proposed_datum = $3,
           proposed_venue = $4,
           proposed_cena = $5,
           proposed_gosti = $6,
           organizator_notified_change = TRUE
       WHERE id_zahtev = $7
         AND TK_clientid_client = $8
       RETURNING id_zahtev, status, client_change_request, client_change_details, proposed_datum, proposed_venue, proposed_cena, proposed_gosti`,
      [
        selectedActions.join(",") || null,
        safeDetails,
        safeProposedDate,
        safeProposedVenue,
        proposedBudget,
        proposedGuests,
        requestId,
        clientId,
      ],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found for this client" });
    }

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/requests/:id/client-action error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ PATCH /api/requests/:id/price-offer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/requests/:id/price-offer", async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { organizer_id, price } = req.body;
  const organizerId = parseInt(organizer_id);
  const organizerPrice = parseInt(price);

  if (
    !Number.isInteger(requestId) ||
    !Number.isInteger(organizerId) ||
    !Number.isInteger(organizerPrice)
  ) {
    return res
      .status(400)
      .json({ error: "Valid request id, organizer_id and price are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE zahtev
       SET organizer_price = $1,
           price_offer_status = 'pending'
       WHERE id_zahtev = $2
         AND TK_organizatorid_organizator = $3
       RETURNING id_zahtev, organizer_price, price_offer_status`,
      [organizerPrice, requestId, organizerId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found for this organizer" });
    }

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error("PATCH /api/requests/:id/price-offer error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ PATCH /api/requests/:id/price-offer/respond â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.patch("/api/requests/:id/price-offer/respond", async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { client_id, response } = req.body;
  const clientId = parseInt(client_id);
  const safeResponse = String(response || "")
    .trim()
    .toLowerCase();

  if (!Number.isInteger(requestId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid request id and client_id are required" });
  }
  if (safeResponse !== "approved" && safeResponse !== "declined") {
    return res
      .status(400)
      .json({ error: "Response must be either 'approved' or 'declined'" });
  }

  try {
    const checkQuery = await pool.query(
      `SELECT organizer_price FROM zahtev WHERE id_zahtev = $1 AND TK_clientid_client = $2`,
      [requestId, clientId],
    );
    if (checkQuery.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Request not found for this client" });
    }

    const result = await pool.query(
      `UPDATE zahtev
       SET price_offer_status = $1
       WHERE id_zahtev = $2
         AND TK_clientid_client = $3
       RETURNING id_zahtev, organizer_price, price_offer_status`,
      [safeResponse, requestId, clientId],
    );

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error(
      "PATCH /api/requests/:id/price-offer/respond error:",
      err.message,
    );
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ DELETE /api/requests/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.delete("/api/requests/:id", async (req, res) => {
  const requestId = parseInt(req.params.id);
  const { client_id } = req.query;
  const clientId = parseInt(client_id);

  if (!Number.isInteger(requestId) || !Number.isInteger(clientId)) {
    return res
      .status(400)
      .json({ error: "Valid request id and client_id are required" });
  }

  try {
    const result = await pool.query(
      `DELETE FROM zahtev
       WHERE id_zahtev = $1
         AND TK_clientid_client = $2
         AND id_zahtev NOT IN (
           SELECT COALESCE(TK_zahtevid_zahtev, -1) FROM event WHERE TK_zahtevid_zahtev IS NOT NULL
         )
       RETURNING id_zahtev`,
      [requestId, clientId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Request not found, or it is already linked to an event",
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/requests/:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ GET /api/organizers/:id/notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get("/api/organizers/:id/notifications", async (req, res) => {
  const organizerId = parseInt(req.params.id);

  if (!Number.isInteger(organizerId)) {
    return res.status(400).json({ error: "Invalid organizer id" });
  }

  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM zahtev
       WHERE TK_organizatorid_organizator = $1
         AND organizator_notified_change = TRUE`,
      [organizerId],
    );

    res.json({ unread_count: result.rows[0].unread_count });
  } catch (err) {
    console.error("GET /api/organizers/:id/notifications error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ POST /api/requests/:id/create-event â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post("/api/requests/:id/create-event", async (req, res) => {
  const requestId = parseInt(req.params.id);
  const {
    organizer_id,
    naziv,
    opis,
    datum_eventa,
    stevilo_gostov,
    venue_name,
    venue_lokacija,
    rsvp_due_date,
    e_mail_notification,
  } = req.body;

  const organizerId = parseInt(organizer_id);

  if (
    !Number.isInteger(requestId) ||
    !Number.isInteger(organizerId) ||
    !naziv ||
    !datum_eventa
  ) {
    return res.status(400).json({
      error: "request id, organizer_id, naziv and datum_eventa are required",
    });
  }

  const db = await pool.connect();
  let rsvpInvitations = [];

  try {
    await db.query("BEGIN");

    const requestResult = await db.query(
      `SELECT * FROM zahtev
       WHERE id_zahtev = $1 AND TK_organizatorid_organizator = $2`,
      [requestId, organizerId],
    );

    if (requestResult.rows.length === 0) {
      await db.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "Request not found for this organizer" });
    }

    const existingEvent = await db.query(
      `SELECT id_event FROM event WHERE TK_zahtevid_zahtev = $1 LIMIT 1`,
      [requestId],
    );

    if (existingEvent.rows.length > 0) {
      await db.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "An event already exists for this request" });
    }

    const createdEvent = await db.query(
      `INSERT INTO event (
        naziv,
        datum_eventa,
        opis,
        stevilo_gostov,
        venue_name,
        venue_lokacija,
        rsvp_due_date,
        e_mail_notification,
        TK_organizatorid_organizator,
        TK_zahtevid_zahtev
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id_event`,
      [
        naziv,
        datum_eventa,
        opis || null,
        stevilo_gostov ? parseInt(stevilo_gostov) : null,
        venue_name || null,
        venue_lokacija || null,
        rsvp_due_date || null,
        e_mail_notification || null,
        organizerId,
        requestId,
      ],
    );

    rsvpInvitations = await createRsvpInvitationsForRequest(
      db,
      createdEvent.rows[0].id_event,
      requestId,
      {
        naziv,
        datum_eventa,
        venue_name,
        venue_lokacija,
        rsvp_due_date,
      },
    );

    await db.query(
      `UPDATE zahtev
       SET status = 'accepted',
           komentar = COALESCE(komentar, 'Event created by organizer.'),
           organizator_notified_change = FALSE
       WHERE id_zahtev = $1`,
      [requestId],
    );

    await db.query("COMMIT");

    const rsvpEmailResults = await sendRsvpEmailsForInvitations(
      req,
      rsvpInvitations,
    );

    res.status(201).json({
      success: true,
      id_event: createdEvent.rows[0].id_event,
      rsvp_invitations: rsvpInvitations.length,
      rsvp_email_results: rsvpEmailResults,
    });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("POST /api/requests/:id/create-event error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    db.release();
  }
});

// â”€â”€ Start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

app.listen(PORT, () => {
  console.log(`ðŸŒ¸  White Orchid server pokrenut: http://localhost:${PORT}`);
  console.log(`    Pritisnite Ctrl+C za zaustavljanje`);
});
