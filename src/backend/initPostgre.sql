-- ============================================================
--  White Orchid Events – Inicializacija podatkovne baze (PostgreSQL)
-- ============================================================

DROP TABLE IF EXISTS event_review      CASCADE;
DROP TABLE IF EXISTS organizer_review  CASCADE;
DROP TABLE IF EXISTS review            CASCADE;
DROP TABLE IF EXISTS image             CASCADE;
DROP TABLE IF EXISTS invitation        CASCADE;
DROP TABLE IF EXISTS event             CASCADE;
DROP TABLE IF EXISTS zahtev            CASCADE;
DROP TABLE IF EXISTS client            CASCADE;
DROP TABLE IF EXISTS organizator       CASCADE;

-- ── Tabela: client ──────────────────────────────────────────
CREATE TABLE client (
    id_client   SERIAL PRIMARY KEY,
    ime         VARCHAR(255) NOT NULL,
    priimek     VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    geslo       VARCHAR(255) NOT NULL
);

-- ── Tabela: organizator ─────────────────────────────────────
CREATE TABLE organizator (
    id_organizator        SERIAL PRIMARY KEY,
    ime                   VARCHAR(255) NOT NULL,
    priimek               VARCHAR(255) NOT NULL,
    email                 VARCHAR(255) NOT NULL,
    portfolio             VARCHAR(255),
    telefon               INTEGER,
    geslo                 VARCHAR(255) NOT NULL,
    image_content         TEXT,
    city                  VARCHAR(255),
    tip_eventa            VARCHAR(255),
    portfolio_description TEXT,
    cena_od               INTEGER      DEFAULT 0,
    ocena                 NUMERIC(2,1) DEFAULT 5.0
);

-- ── Tabela: zahtev ──────────────────────────────────────────
CREATE TABLE zahtev (
    id_zahtev                       SERIAL PRIMARY KEY,
    datum                           DATE         NOT NULL,
    opis                            VARCHAR(255),
    status                          VARCHAR(255) DEFAULT 'pending',
    tip_eventa                      VARCHAR(255),
    venue                           VARCHAR(255),
    TK_clientid_client              INTEGER      NOT NULL REFERENCES client(id_client),
    TK_organizatorid_organizator    INTEGER      REFERENCES organizator(id_organizator),
    komentar                        VARCHAR(255),
    client_change_request           VARCHAR(255),
    client_change_details           TEXT,
    proposed_datum                  DATE,
    proposed_venue                  VARCHAR(255),
    proposed_cena                   INTEGER,
    proposed_gosti                  INTEGER,
    organizator_notified_change     BOOLEAN      DEFAULT FALSE,
    ocena                           INTEGER,
    cena                            INTEGER,
    gosti                           INTEGER,
    organizer_price                 INTEGER,
    price_offer_status              VARCHAR(255) DEFAULT 'none'
);

-- ── Tabela: event ───────────────────────────────────────────
CREATE TABLE event (
    id_event                        SERIAL PRIMARY KEY,
    naziv                           VARCHAR(255) NOT NULL,
    datum_eventa                    DATE         NOT NULL,
    stevilo_gostov                  INTEGER      DEFAULT 10000,
    TK_organizatorid_organizator    INTEGER      NOT NULL REFERENCES organizator(id_organizator),
    venue_name                      VARCHAR(255),
    venue_lokacija                  VARCHAR(255),
    koordinate                      INTEGER,
    TK_zahtevid_zahtev              INTEGER      REFERENCES zahtev(id_zahtev),
    opis                            VARCHAR(255),
    e_mail_notification             VARCHAR(255),
    rsvp_due_date                   DATE
);

-- ── Tabela: invitation ──────────────────────────────────────
--   Za preprosto simulacijo e-mail review povezav ima vsak gost svoj invite.
CREATE TABLE invitation (
    id_invitation       SERIAL PRIMARY KEY,
    naziv               VARCHAR(255),
    guest_name          VARCHAR(255),
    TK_clientid_client  INTEGER NOT NULL REFERENCES client(id_client),
    TK_eventid_event    INTEGER NOT NULL REFERENCES event(id_event),
    e_mail              VARCHAR(255),
    rsvp_approved_guest INTEGER,
    invited_guests      INTEGER,
    review_token        VARCHAR(255),
    review_sent         BOOLEAN      DEFAULT FALSE,
    review_sent_at      TIMESTAMP,
    review_submitted    BOOLEAN      DEFAULT FALSE
);

CREATE UNIQUE INDEX invitation_unique_event_email_idx
    ON invitation (TK_eventid_event, e_mail)
    WHERE e_mail IS NOT NULL;

CREATE UNIQUE INDEX invitation_unique_review_token_idx
    ON invitation (review_token)
    WHERE review_token IS NOT NULL;

-- ── Tabela: image ───────────────────────────────────────────
CREATE TABLE image (
    id_image        SERIAL PRIMARY KEY,
    cover_image     BOOLEAN,
    image_content   TEXT,
    eventid_event   INTEGER REFERENCES event(id_event)
);

-- ── Tabela: organizer_review ────────────────────────────────
--   Samo client, ki je bookal organizatorja, lahko pusti review.
--   event_id je opcijski dokaz, na kateri event se review nanaša.
CREATE TABLE organizer_review (
    review_id       SERIAL PRIMARY KEY,
    client_id       INTEGER NOT NULL REFERENCES client(id_client),
    organizator_id  INTEGER NOT NULL REFERENCES organizator(id_organizator),
    event_id        INTEGER REFERENCES event(id_event),
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    review_date     DATE    NOT NULL DEFAULT CURRENT_DATE
);

CREATE UNIQUE INDEX organizer_review_unique_client_organizer_idx
    ON organizer_review (client_id, organizator_id);

-- ── Tabela: event_review ────────────────────────────────────
--   Gostje ne potrebujejo accounta; review pustijo preko invitation linka.
CREATE TABLE event_review (
    event_review_id  SERIAL PRIMARY KEY,
    event_id         INTEGER      NOT NULL REFERENCES event(id_event),
    invitation_id    INTEGER      NOT NULL REFERENCES invitation(id_invitation),
    guest_email      VARCHAR(255) NOT NULL,
    guest_name       VARCHAR(255),
    rating           INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment          TEXT,
    review_date      DATE         NOT NULL DEFAULT CURRENT_DATE
);

CREATE UNIQUE INDEX event_review_unique_invitation_idx
    ON event_review (invitation_id);

-- ============================================================
--  TESTNI PODATKI
-- ============================================================

-- Clients
INSERT INTO client (ime, priimek, email, geslo) VALUES
    ('Ana',    'Novak',  'ana.novak@email.com',  'geslo123'),
    ('Miha',   'Horvat', 'miha.horvat@email.com','geslo456'),
    ('Petra',  'Vidmar', 'petra.v@email.com',    'geslo789'),
    ('Janez',  'Kranjc', 'janez.k@email.com',    'geslo000');

-- Organizers
INSERT INTO organizator (ime, priimek, email, portfolio, telefon, geslo, city, tip_eventa, cena_od, ocena) VALUES
    ('Maja',    'Kovač',     'info@elegantevents.si',  'https://elegantevents.si',  41234567, 'orgpw1',  'Ljubljana',  'poroka',       2500,  4.9),
    ('Luka',    'Zupan',     'kontakt@zabave.si',      NULL,                        NULL,     'orgpw2',  'Maribor',    'rojstni dan',  800,   4.5),
    ('Sara',    'Benko',     'sara@konference.si',     'https://konference.si',     40123456, 'orgpw3',  'Ljubljana',  'konferenca',   3000,  4.8),
    ('Rok',     'Petrovič',  'rok@soundstage.si',      'https://soundstage.si',     31234567, 'orgpw4',  'Maribor',    'koncert',      1500,  4.7),
    ('Nina',    'Leban',     'nina@festivali.si',      NULL,                        NULL,     'orgpw5',  'Koper',      'festival',     4000,  4.6),
    ('Tadej',   'Zorko',     'tadej@teamup.si',        'https://teamup.si',         40987654, 'orgpw6',  'Celje',      'teambuilding', 600,   4.4),
    ('Eva',     'Mohorič',   'eva@galaveceri.si',      'https://galaveceri.si',     41111222, 'orgpw7',  'Ljubljana',  'gala večer',   5000,  5.0),
    ('Gregor',  'Šuštar',    'gregor@corporate.si',    NULL,                        NULL,     'orgpw8',  'Kranj',      'konferenca',   2000,  4.3),
    ('Katja',   'Fišer',     'katja@weddings.si',      'https://weddings.si',       40555444, 'orgpw9',  'Novo Mesto', 'poroka',       3500,  4.8),
    ('Blaž',    'Medved',    'blaz@openair.si',        'https://openair.si',        41777888, 'orgpw10', 'Maribor',    'festival',     2200,  4.5),
    ('Urška',   'Tomažič',   'urska@sladkisvet.si',    NULL,                        NULL,     'orgpw11', 'Velenje',    'rojstni dan',  400,   4.2),
    ('Andrej',  'Pregl',     'andrej@poslovni.si',     'https://poslovni.si',       40333222, 'orgpw12', 'Celje',      'teambuilding', 900,   4.6);

-- Zahtevi
INSERT INTO zahtev (datum, opis, status, tip_eventa, venue, TK_clientid_client, TK_organizatorid_organizator, cena, gosti, client_change_request, client_change_details, proposed_datum, proposed_venue, proposed_cena, proposed_gosti, organizator_notified_change) VALUES
    ('2025-06-01', 'Poroka za 100 oseb',                'done',     'poroka',       'Grand Hotel Union',      1, 1,  5000,  100, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('2025-07-15', 'Rojstni dan – 30 gostov',           'done',     'rojstni dan',  'Restavracija Lipa',      2, 2,  1200,   30, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('2025-08-10', 'Tehnološka konferenca',             'pending',  'konferenca',   'Cankarjev dom',          3, 3,  8000,  200, 'edit_date,edit_venue', 'Client asked to move the conference one week later and suggested a new venue.', '2025-08-17', 'Gospodarsko razstavišče', NULL, NULL, TRUE),
    ('2025-09-05', 'Jazzovski večer v parku',           'accepted', 'koncert',      'Mestni park',            4, 4,  3000,  150, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('2025-10-20', 'Poletni festival na obali',         'accepted', 'festival',     'Amfiteater Koper',       1, 5, 12000,  500, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('2025-11-01', 'Teambuilding – 50 zaposlenih',      'done',     'teambuilding', 'Outdoor Center Celje',   2, 6,  2500,   50, NULL, NULL, NULL, NULL, NULL, NULL, FALSE),
    ('2025-12-15', 'Gala večer – dobrodelna prireditev','pending',  'gala večer',   'Kongresni center Atlas', 3, 7, 15000,  300, 'cancel', 'Client is considering cancellation due to sponsor availability.', NULL, NULL, NULL, NULL, TRUE);

-- Eventi
INSERT INTO event (naziv, datum_eventa, TK_organizatorid_organizator, venue_name, venue_lokacija, TK_zahtevid_zahtev, rsvp_due_date) VALUES
    ('Poroka Novak',          '2025-09-20', 1, 'Grand Hotel Union',      'Ljubljana',  1, '2025-08-01'),
    ('Rojstni dan Horvat',    '2025-10-05', 2, 'Restavracija Lipa',      'Maribor',    2, '2025-09-15'),
    ('TechSummit 2025',       '2025-11-10', 3, 'Cankarjev dom',          'Ljubljana',  3, '2025-10-01'),
    ('Jazz Under Stars',      '2025-08-22', 4, 'Mestni park',            'Maribor',    4, '2025-07-20'),
    ('Seaside Festival',      '2025-07-04', 5, 'Amfiteater Koper',       'Koper',      5, '2025-06-15'),
    ('TeamUp Challenge',      '2025-06-28', 6, 'Outdoor Center Celje',   'Celje',      6, '2025-06-01'),
    ('Gala za Srce',          '2025-12-20', 7, 'Kongresni center Atlas', 'Ljubljana',  7, '2025-11-30');

-- Invitations (1 row = 1 guest email)
INSERT INTO invitation (naziv, guest_name, TK_clientid_client, TK_eventid_event, e_mail, invited_guests, review_sent, review_submitted) VALUES
    ('Vabilo – Poroka Novak',      'Nika Bizjak',   1, 1, 'nika.bizjak@email.com',     1, FALSE, FALSE),
    ('Vabilo – Poroka Novak',      'Luka Rozman',   1, 1, 'luka.rozman@email.com',     1, FALSE, FALSE),
    ('Vabilo – Rojstni dan',       'Eva Kolar',     2, 2, 'eva.kolar@email.com',       1, FALSE, FALSE),
    ('Vabilo – Rojstni dan',       'Tim Novak',     2, 2, 'tim.novak@email.com',       1, FALSE, FALSE),
    ('Vabilo – TechSummit',        'Matic Kranjc',  3, 3, 'matic.kranjc@email.com',    1, FALSE, FALSE),
    ('Vabilo – TechSummit',        'Tina Zajc',     3, 3, 'tina.zajc@email.com',       1, FALSE, FALSE),
    ('Vabilo – Jazz Under Stars',  'Sara Mlakar',   4, 4, 'sara.mlakar@email.com',     1, FALSE, FALSE),
    ('Vabilo – Jazz Under Stars',  'Nejc Marin',    4, 4, 'nejc.marin@email.com',      1, FALSE, FALSE);

-- Images
INSERT INTO image (cover_image, image_content, eventid_event) VALUES
    (TRUE,  'poroka_cover.jpg',      1),
    (FALSE, 'poroka_sala.jpg',       1),
    (TRUE,  'rojstni_dan.jpg',       2),
    (TRUE,  'techsummit_cover.jpg',  3),
    (TRUE,  'jazz_cover.jpg',        4),
    (TRUE,  'seaside_cover.jpg',     5);

-- Organizer reviews
INSERT INTO organizer_review (client_id, organizator_id, event_id, rating, comment, review_date) VALUES
    (1, 1, 1, 5, 'Everything was beautifully organized from start to finish. Truly stress-free for our family.', '2024-01-15'),
    (2, 2, 2, 5, 'Elegant setup, clear communication, and perfect timing throughout the whole event.', '2024-03-02'),
    (3, 3, 3, 5, 'Our conference ran smoothly and looked extremely professional.', '2024-01-28'),
    (4, 4, 4, 4, 'Great energy and solid planning. Guests were very impressed overall.', '2024-06-07'),
    (1, 5, 5, 4, 'The festival was well managed and communication was smooth from beginning to end.', '2024-03-09'),
    (2, 6, 6, 4, 'A dependable organizer who delivered exactly what was promised.', '2024-01-22'),
    (3, 7, 7, 5, 'Exceptional attention to detail and a very refined event experience.', '2024-02-05');

-- Event reviews (guest-side reviews through invitations)
INSERT INTO event_review (event_id, invitation_id, guest_email, guest_name, rating, comment, review_date) VALUES
    (1, 1, 'nika.bizjak@email.com',  'Nika Bizjak', 5, 'Beautiful venue and excellent atmosphere throughout the evening.', '2024-01-15'),
    (2, 3, 'eva.kolar@email.com',    'Eva Kolar',   4, 'Very fun event, great coordination and smooth timing.', '2024-03-02'),
    (4, 7, 'sara.mlakar@email.com',  'Sara Mlakar', 5, 'Amazing music, good organization and a memorable guest experience.', '2024-06-07');

UPDATE invitation
SET review_submitted = TRUE,
    review_sent = TRUE,
    review_sent_at = CURRENT_TIMESTAMP,
    review_token = CONCAT('seed-token-', id_invitation)
WHERE id_invitation IN (1, 3, 7);

-- ── Preveri podatke ─────────────────────────────────────────
SELECT * FROM client;
SELECT * FROM organizator ORDER BY id_organizator;
SELECT * FROM zahtev;
SELECT * FROM event;
SELECT * FROM invitation;
SELECT * FROM image;
SELECT * FROM organizer_review;
SELECT * FROM event_review;
