"""Database package for Manas Group voice agent.

Supports both SQLite and MongoDB backends via DB_BACKEND env var.

Usage:
    from database import create_database
    db = create_database()                  # reads DB_BACKEND env var
    db = create_database(backend="mongodb") # explicit
"""

import os
import logging

logger = logging.getLogger("manas-db")


def create_database(backend: str = None, **kwargs):
    """Factory: returns a DatabaseBase implementation.

    Reads DB_BACKEND from env unless explicitly overridden:
      - "sqlite"  -> SQLiteDatabase (default, in wide use)
      - "mongodb" -> MongoDatabase (new)

    Extra kwargs are passed to the implementation's __init__.
    Falls back to SQLite with a warning if MongoDB is configured but unreachable.
    """
    if backend is None:
        backend = os.getenv("DB_BACKEND", "sqlite").lower()

    if backend == "mongodb":
        try:
            from db.mongo import MongoDatabase
            logger.info("Creating MongoDatabase backend")
            return MongoDatabase(**kwargs)
        except Exception as e:
            logger.warning(
                f"MongoDB backend unavailable ({e}), falling back to SQLite. "
                f"Set DB_BACKEND=sqlite to suppress this warning."
            )

    # Default: SQLite
    from db.sqlite import SQLiteDatabase
    logger.info("Creating SQLiteDatabase backend")
    return SQLiteDatabase(**kwargs)


# Re-export for convenience
from db.base import DatabaseBase
from db.sqlite import SQLiteDatabase

__all__ = ["create_database", "DatabaseBase", "SQLiteDatabase", "MongoDatabase"]


def __getattr__(name):
    """Lazy import MongoDatabase so the package loads even without pymongo."""
    if name == "MongoDatabase":
        from db.mongo import MongoDatabase
        return MongoDatabase
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
