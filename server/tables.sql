-- SQLite
CREATE TABLE tx (
    id        INTEGER NOT NULL,
    address   TEXT    NOT NULL,
    json      TEXT    NOT NULL,
    processed BOOLEAN NOT NULL,
    notified  BOOLEAN,
    hash      TEXT,
    amount    REAL,
    addresses TEXT,
    actions   TEXT,
    timestamp TEXT,
    PRIMARY KEY(id, address)
);

CREATE TABLE watch (
    address  TEXT    NOT NULL,
    channel  TEXT    NOT NULL,
    minimum  REAL    NOT NULL,
    type     TEXT    NOT NULL,
    PRIMARY KEY (address, channel)
);

CREATE TABLE label (
    address TEXT,
    label   TEXT,
    PRIMARY KEY (address)
);