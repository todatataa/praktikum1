-- ============================================================
--  White Orchid Events – Inicializacija podatkovne baze (PostgreSQL)
-- ============================================================

DROP TABLE IF EXISTS image      CASCADE;
DROP TABLE IF EXISTS invitation  CASCADE;
DROP TABLE IF EXISTS event       CASCADE;
DROP TABLE IF EXISTS zahtev      CASCADE;
DROP TABLE IF EXISTS client      CASCADE;
DROP TABLE IF EXISTS organizator CASCADE;

-- ── Tabela: client ──────────────────────────────────────────
CREATE TABLE client (
    id_client   SERIAL PRIMARY KEY,
    ime         VARCHAR(255) NOT NULL,
    priimek     VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    geslo       VARCHAR(50)  NOT NULL
);

-- ── Tabela: organizator ─────────────────────────────────────
--   cena_od  = izhodiščna cena za organizacijo (v EUR)
--   ocena    = povprečna ocena (1.0 – 5.0)
CREATE TABLE organizator (
    id_organizator  SERIAL PRIMARY KEY,
    ime             VARCHAR(255)   NOT NULL,
    priimek         VARCHAR(255)   NOT NULL,
    email           VARCHAR(255)   NOT NULL,
    portfolio       VARCHAR(255),
    telefon         INTEGER,
    geslo           VARCHAR(255)   NOT NULL,
    image_content   VARCHAR(255),
    city            VARCHAR(255),
    tip_eventa      VARCHAR(255),
    cena_od         INTEGER        DEFAULT 0,
    ocena           NUMERIC(2,1)   DEFAULT 5.0
);

-- ── Tabela: zahtev ──────────────────────────────────────────
CREATE TABLE zahtev (
    id_zahtev                       SERIAL PRIMARY KEY,
    datum                           DATE         NOT NULL,
    opis                            VARCHAR(255),
    status                          VARCHAR(255),
    TK_clientid_client              INTEGER      NOT NULL REFERENCES client(id_client),
    TK_organizatorid_organizator    INTEGER      REFERENCES organizator(id_organizator),
    komentar                        VARCHAR(255),
    ocena                           INTEGER,
    cena                            INTEGER,
    gosti                           INTEGER
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
CREATE TABLE invitation (
    id_invitation       SERIAL PRIMARY KEY,
    naziv               VARCHAR(255),
    TK_clientid_client  INTEGER NOT NULL REFERENCES client(id_client),
    TK_eventid_event    INTEGER NOT NULL REFERENCES event(id_event),
    e_mail              VARCHAR(255),
    rsvp_approved_guest INTEGER,
    invited_guests      INTEGER
);

-- ── Tabela: image ───────────────────────────────────────────
CREATE TABLE image (
    id_image        SERIAL PRIMARY KEY,
    cover_image     BOOLEAN,
    image_content   VARCHAR(255),
    eventid_event   INTEGER REFERENCES event(id_event)
);

-- ============================================================
--  TESTNI PODATKI
-- ============================================================

-- Clients
INSERT INTO client (ime, priimek, email, geslo) VALUES
    ('Ana',    'Novak',  'ana.novak@email.com',  'geslo123'),
    ('Miha',   'Horvat', 'miha.horvat@email.com','geslo456'),
    ('Petra',  'Vidmar', 'petra.v@email.com',    'geslo789'),
    ('Janez',  'Kranjc', 'janez.k@email.com',    'geslo000');

-- Organizers  (cena_od v EUR, ocena 1–5)
INSERT INTO organizator (ime, priimek, email, portfolio, telefon, geslo, city, tip_eventa, cena_od, ocena) VALUES
    -- 1
    ('Maja',    'Kovač',     'info@elegantevents.si',  'https://elegantevents.si',  41234567, 'orgpw1',  'Ljubljana',  'poroka',       2500,  4.9),
    -- 2
    ('Luka',    'Zupan',     'kontakt@zabave.si',      NULL,                        NULL,     'orgpw2',  'Maribor',    'rojstni dan',  800,   4.5),
    -- 3
    ('Sara',    'Benko',     'sara@konference.si',     'https://konference.si',     40123456, 'orgpw3',  'Ljubljana',  'konferenca',   3000,  4.8),
    -- 4
    ('Rok',     'Petrovič',  'rok@soundstage.si',      'https://soundstage.si',     31234567, 'orgpw4',  'Maribor',    'koncert',      1500,  4.7),
    -- 5
    ('Nina',    'Leban',     'nina@festivali.si',      NULL,                        NULL,     'orgpw5',  'Koper',      'festival',     4000,  4.6),
    -- 6
    ('Tadej',   'Zorko',     'tadej@teamup.si',        'https://teamup.si',         40987654, 'orgpw6',  'Celje',      'teambuilding', 600,   4.4),
    -- 7
    ('Eva',     'Mohorič',   'eva@galaveceri.si',      'https://galaveceri.si',     41111222, 'orgpw7',  'Ljubljana',  'gala večer',   5000,  5.0),
    -- 8
    ('Gregor',  'Šuštar',    'gregor@corporate.si',    NULL,                        NULL,     'orgpw8',  'Kranj',      'konferenca',   2000,  4.3),
    -- 9
    ('Katja',   'Fišer',     'katja@weddings.si',      'https://weddings.si',       40555444, 'orgpw9',  'Novo Mesto', 'poroka',       3500,  4.8),
    -- 10
    ('Blaž',    'Medved',    'blaz@openair.si',        'https://openair.si',        41777888, 'orgpw10', 'Maribor',    'festival',     2200,  4.5),
    -- 11
    ('Urška',   'Tomažič',   'urska@sladkisvet.si',    NULL,                        NULL,     'orgpw11', 'Velenje',    'rojstni dan',  400,   4.2),
    -- 12
    ('Andrej',  'Pregl',     'andrej@poslovni.si',     'https://poslovni.si',       40333222, 'orgpw12', 'Celje',      'teambuilding', 900,   4.6);

-- Zahtevi (vzorci za prvih 4 organizatorje)
INSERT INTO zahtev (datum, opis, status, TK_clientid_client, TK_organizatorid_organizator, cena, gosti) VALUES
    ('2025-06-01', 'Poroka za 100 oseb',             'zaključeno', 1, 1,  5000,  100),
    ('2025-07-15', 'Rojstni dan – 30 gostov',        'zaključeno', 2, 2,  1200,   30),
    ('2025-08-10', 'Tehnološka konferenca',           'v obravnavi',3, 3,  8000,  200),
    ('2025-09-05', 'Jazzovski večer v parku',         'potrjeno',   4, 4,  3000,  150),
    ('2025-10-20', 'Poletni festival na obali',       'potrjeno',   1, 5, 12000,  500),
    ('2025-11-01', 'Teambuilding – 50 zaposlenih',    'zaključeno', 2, 6,  2500,   50),
    ('2025-12-15', 'Gala večer – dobrodelna prireditev','v obravnavi',3,7,15000, 300);

-- Eventi
INSERT INTO event (naziv, datum_eventa, TK_organizatorid_organizator, venue_name, venue_lokacija, TK_zahtevid_zahtev, rsvp_due_date) VALUES
    ('Poroka Novak',          '2025-09-20', 1, 'Grand Hotel Union',      'Ljubljana',  1, '2025-08-01'),
    ('Rojstni dan Horvat',    '2025-10-05', 2, 'Restavracija Lipa',      'Maribor',    2, '2025-09-15'),
    ('TechSummit 2025',       '2025-11-10', 3, 'Cankarjev dom',          'Ljubljana',  3, '2025-10-01'),
    ('Jazz Under Stars',      '2025-08-22', 4, 'Mestni park',            'Maribor',    4, '2025-07-20'),
    ('Seaside Festival',      '2025-07-04', 5, 'Amfiteater Koper',       'Koper',      5, '2025-06-15'),
    ('TeamUp Challenge',      '2025-06-28', 6, 'Outdoor Center Celje',   'Celje',      6, '2025-06-01'),
    ('Gala za Srce',          '2025-12-20', 7, 'Kongresni center Atlas', 'Ljubljana',  7, '2025-11-30');

-- Invitations
INSERT INTO invitation (naziv, TK_clientid_client, TK_eventid_event, e_mail, invited_guests) VALUES
    ('Vabilo – Poroka Novak',     1, 1, 'ana.novak@email.com',   100),
    ('Vabilo – Rojstni dan',      2, 2, 'miha.horvat@email.com',  30),
    ('Vabilo – TechSummit',       3, 3, 'petra.v@email.com',     200),
    ('Vabilo – Jazz Under Stars', 4, 4, 'janez.k@email.com',     150);

-- Images
INSERT INTO image (cover_image, image_content, eventid_event) VALUES
    (TRUE,  'poroka_cover.jpg',      1),
    (FALSE, 'poroka_sala.jpg',       1),
    (TRUE,  'rojstni_dan.jpg',       2),
    (TRUE,  'techsummit_cover.jpg',  3),
    (TRUE,  'jazz_cover.jpg',        4),
    (TRUE,  'seaside_cover.jpg',     5);

-- ── Preveri podatke ─────────────────────────────────────────
SELECT * FROM client;
SELECT * FROM organizator ORDER BY id_organizator;
SELECT * FROM zahtev;
SELECT * FROM event;
SELECT * FROM invitation;
SELECT * FROM image;