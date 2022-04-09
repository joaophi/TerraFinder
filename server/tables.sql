-- SQLite
CREATE TABLE tx (
    id INTEGER NOT NULL,
    address TEXT NOT NULL,
    hash TEXT NOT NULL,
    json TEXT NOT NULL,
    amount REAL,
    addresses TEXT,
    actions TEXT,
    notify INTEGER,
    timestamp TEXT,
    PRIMARY KEY(id, address)
);

CREATE TABLE watch (
    account TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    swap BOOLEAN NOT NULL,
    channel TEXT NOT NULL,
    lastProcessed INTEGER
);

CREATE TABLE label (
    account TEXT PRIMARY KEY,
    label TEXT
);