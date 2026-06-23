import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).with_name("calculator_history.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expression TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def add_history(expression, result):
    init_db()
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO history (expression, result) VALUES (?, ?)",
            (str(expression), str(result)),
        )


def get_history(limit=50):
    init_db()
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, expression, result, created_at
            FROM history
            ORDER BY id DESC
            LIMIT ?
            """,
            (int(limit),),
        ).fetchall()

    return [dict(row) for row in rows]


def clear_history():
    init_db()
    with get_connection() as conn:
        conn.execute("DELETE FROM history")


init_db()
