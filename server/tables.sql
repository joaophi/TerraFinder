-- SQLite
CREATE TABLE tx (
    id INTEGER PRIMARY KEY,
    json TEXT NOT NULL
);

CREATE TABLE watch (
    account TEXT PRIMARY KEY,
    amount FLOAT NOT NULL,
    swap BOOLEAN NOT NULL,
    channel TEXT NOT NULL,
    lastProcessed INTEGER,
);

CREATE TABLE label (
    account TEXT PRIMARY KEY,
    label TEXT
);