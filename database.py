"""
Compatibility wrapper — re-exports SQLiteDatabase as Database.

During migration to the db/ package, existing callers
can continue to `from database import Database` without changes.

Prefer `from db import create_database` for new code.
"""

from db.sqlite import SQLiteDatabase as Database

__all__ = ["Database"]
