-- Inicializacija podatkovne baze (PostgreSQL)

DROP TABLE IF EXISTS image CASCADE;
DROP TABLE IF EXISTS invitation CASCADE;
DROP TABLE IF EXISTS event CASCADE;
DROP TABLE IF EXISTS zahtev CASCADE;
DROP TABLE IF EXISTS client CASCADE;
DROP TABLE IF EXISTS organizator CASCADE;

-- Tabela: client
CREATE TABLE client (
    id_client   SERIAL PRIMARY KEY,
    ime         VARCHAR(255) NOT NULL,
    priimek     VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    geslo       VARCHAR(50)  NOT NULL
);

-- Tabela: organizator
CREATE TABLE organizator (
    id_organizator  SERIAL PRIMARY KEY,
    ime             VARCHAR(255) NOT NULL,
    priimek         VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    portfolio       VARCHAR(255),
    telefon         INTEGER,
    geslo           VARCHAR(255) NOT NULL,
    image_content   VARCHAR(255),
    city            VARCHAR(255),
    tip_eventa      VARCHAR(255)
);

-- Tabela: zahtev

CREATE TABLE zahtev (
    id_zahtev                       SERIAL PRIMARY KEY,
    datum                           DATE NOT NULL,
    opis                            VARCHAR(255),
    status                          VARCHAR(255),
    TK_clientid_client              INTEGER NOT NULL REFERENCES client(id_client),
    TK_organizatorid_organizator    INTEGER REFERENCES organizator(id_organizator),
    komentar                        VARCHAR(255),
    ocena                           INTEGER,
    cena                            INTEGER,
    gosti                           INTEGER
);

-- Tabela: event
CREATE TABLE event (
    id_event                        SERIAL PRIMARY KEY,
    naziv                           VARCHAR(255) NOT NULL,
    datum_eventa                    DATE NOT NULL,
    stevilo_gostov                  INTEGER DEFAULT 10000,
    TK_organizatorid_organizator    INTEGER NOT NULL REFERENCES organizator(id_organizator),
    venue_name                      VARCHAR(255),
    venue_lokacija                  VARCHAR(255),
    koordinate                      INTEGER,
    TK_zahtevid_zahtev              INTEGER REFERENCES zahtev(id_zahtev),
    opis                            VARCHAR(255),
    e_mail_notification             VARCHAR(255),
    rsvp_due_date                   DATE
);

-- Tabela: invitation
CREATE TABLE invitation (
    id_invitation       SERIAL PRIMARY KEY,
    naziv               VARCHAR(255),
    TK_clientid_client  INTEGER NOT NULL REFERENCES client(id_client),
    TK_eventid_event    INTEGER NOT NULL REFERENCES event(id_event),
    e_mail              VARCHAR(255),
    rsvp_approved_guest INTEGER,
    invited_guests      INTEGER
);

-- Tabela: image
CREATE TABLE image (
    id_image        SERIAL PRIMARY KEY,
    cover_image     BOOLEAN,
    image_content   VARCHAR(255),
    eventid_event   INTEGER REFERENCES event(id_event)
);

-- Testni podatki

INSERT INTO client (ime, priimek, email, geslo) VALUES
    ('Ana', 'Novak', 'ana.novak@email.com', 'geslo123'),
    ('Miha', 'Horvat', 'miha.horvat@email.com', 'geslo456');

INSERT INTO organizator (ime, priimek, email, portfolio, telefon, geslo, city, tip_eventa) VALUES
    ('Maja', 'Kovač', 'info@events.si', 'https://events.si', 41234567, 'orggeslo1', 'Ljubljana', 'poroka'),
    ('Luka', 'Zupan', 'kontakt@zabave.si', NULL, NULL, 'orggeslo2', 'Maribor', 'rojstni dan');

INSERT INTO zahtev (datum, opis, status, TK_clientid_client, TK_organizatorid_organizator, cena, gosti) VALUES
    ('2025-06-01', 'Poroka za 100 oseb', 'v obravnavi', 1, 1, 5000, 100),
    ('2025-07-15', 'Rojstni dan', 'potrjeno', 2, 2, 1200, 30);

INSERT INTO event (naziv, datum_eventa, TK_organizatorid_organizator, venue_name, venue_lokacija, TK_zahtevid_zahtev, rsvp_due_date) VALUES
    ('Poroka Novak', '2025-09-20', 1, 'Grand Hotel', 'Ljubljana', 1, '2025-08-01'),
    ('Rojstni dan Horvat', '2025-10-05', 2, 'Restavracija Lipa', 'Maribor', 2, '2025-09-15');

INSERT INTO invitation (naziv, TK_clientid_client, TK_eventid_event, e_mail, invited_guests) VALUES
    ('Vabilo poroka', 1, 1, 'ana.novak@email.com', 100),
    ('Vabilo rojstni dan', 2, 2, 'miha.horvat@email.com', 30);

INSERT INTO image (cover_image, image_content, eventid_event) VALUES
    (TRUE, 'poroka_cover.jpg', 1),
    (FALSE, 'poroka_sala.jpg', 1),
    (TRUE, 'rojstni_dan.jpg', 2);

-- Preveri podatke

SELECT * FROM client;
SELECT * FROM organizator;
SELECT * FROM zahtev;
SELECT * FROM event;
SELECT * FROM invitation;
SELECT * FROM image;