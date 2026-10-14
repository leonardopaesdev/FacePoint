from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


class Database:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    registration TEXT NOT NULL UNIQUE,
                    role TEXT NOT NULL,
                    department TEXT NOT NULL,
                    photo_path TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS time_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id INTEGER NOT NULL,
                    entry_type TEXT NOT NULL CHECK(entry_type IN ('entrada', 'saida', 'intervalo')),
                    recorded_at TEXT NOT NULL,
                    confidence REAL,
                    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
                );
                """
            )

    def fetch_all(self, query: str, parameters: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(query, parameters).fetchall()
        return [dict(row) for row in rows]

    def fetch_one(self, query: str, parameters: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(query, parameters).fetchone()
        return dict(row) if row else None

    def execute(self, query: str, parameters: tuple[Any, ...]) -> int:
        with self.connect() as connection:
            cursor = connection.execute(query, parameters)
            return int(cursor.lastrowid)
