from pathlib import Path

from app.database import Database


def test_database_creates_employee_and_time_entry(tmp_path: Path) -> None:
    database = Database(tmp_path / "test.sqlite3")
    database.initialize()
    employee_id = database.execute(
        "INSERT INTO employees(name, registration, role, department, photo_path, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        ("Ana Oliveira", "2026001", "Analista", "Tecnologia", "ana.jpg", "2026-10-14T12:00:00+00:00"),
    )
    entry_id = database.execute(
        "INSERT INTO time_entries(employee_id, entry_type, recorded_at, confidence) VALUES (?, ?, ?, ?)",
        (employee_id, "entrada", "2026-10-14T12:01:00+00:00", 98.5),
    )

    employee = database.fetch_one("SELECT * FROM employees WHERE id = ?", (employee_id,))
    entry = database.fetch_one("SELECT * FROM time_entries WHERE id = ?", (entry_id,))

    assert employee and employee["registration"] == "2026001"
    assert entry and entry["entry_type"] == "entrada"
