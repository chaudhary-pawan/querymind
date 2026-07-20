"""
Database initialization and ephemeral seeding.
Supports both default schema and dynamic user-uploaded custom schemas.
"""

import os
from sqlalchemy import text
from db import engine, Base, SessionLocal, DB_PATH
from models import User, Product, Order

CUSTOM_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "custom_schema.sql")
CUSTOM_INSERTS_PATH = os.path.join(os.path.dirname(__file__), "custom_inserts.sql")


def init_db(custom_ddl: str = None, insert_queries: list = None):
    """
    Reset the SQLite database.
    If custom DDL is provided, it uses that schema and seeds it.
    If custom files exist on disk (for a reset/restart), it reloads them.
    Otherwise, falls back to the default e-commerce dummy database.
    """
    # 1. Close active connections and delete current DB file
    engine.dispose()
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except Exception as e:
            print(f"Error removing database file: {e}")

    db = SessionLocal()

    # 2. Write custom files if provided dynamically
    if custom_ddl:
        with open(CUSTOM_SCHEMA_PATH, "w", encoding="utf-8") as f:
            f.write(custom_ddl)
        if insert_queries:
            with open(CUSTOM_INSERTS_PATH, "w", encoding="utf-8") as f:
                f.write("\n".join(insert_queries))

    # 3. Check if we should initialize custom schema
    has_custom = os.path.exists(CUSTOM_SCHEMA_PATH)
    
    try:
        if has_custom:
            # Read custom schema DDL
            with open(CUSTOM_SCHEMA_PATH, "r", encoding="utf-8") as f:
                ddl = f.read()
            
            # Execute CREATE statements
            # SQLite executes multiple statements via raw connection cursor
            connection = engine.raw_connection()
            try:
                cursor = connection.cursor()
                cursor.executescript(ddl)
                connection.commit()
            finally:
                connection.close()

            # Execute INSERT queries if they exist
            if os.path.exists(CUSTOM_INSERTS_PATH):
                with open(CUSTOM_INSERTS_PATH, "r", encoding="utf-8") as f:
                    inserts = f.read()
                
                connection = engine.raw_connection()
                try:
                    cursor = connection.cursor()
                    cursor.executescript(inserts)
                    connection.commit()
                finally:
                    connection.close()
            
            print("Database initialized successfully with custom schema.")
            
        else:
            # Fallback: Initialize default e-commerce schema
            Base.metadata.create_all(bind=engine)
            
            # Seed default users
            u1 = User(name="Alice Smith", email="alice@example.com")
            u2 = User(name="Bob Jones", email="bob@example.com")
            u3 = User(name="Charlie Brown", email="charlie@example.com")
            
            # Seed default products
            p1 = Product(name="Laptop", price=1200.00)
            p2 = Product(name="Smartphone", price=800.00)
            p3 = Product(name="Headphones", price=150.00)
            p4 = Product(name="Monitor", price=300.00)
            
            db.add_all([u1, u2, u3, p1, p2, p3, p4])
            db.commit()
            
            # Seed default orders
            o1 = Order(user_id=1, product_id=1, quantity=1, total_amount=1200.00)
            o2 = Order(user_id=1, product_id=3, quantity=2, total_amount=300.00)
            o3 = Order(user_id=2, product_id=2, quantity=1, total_amount=800.00)
            o4 = Order(user_id=3, product_id=4, quantity=1, total_amount=300.00)
            
            db.add_all([o1, o2, o3, o4])
            db.commit()
            
            print("Database initialized successfully with default e-commerce schema.")

    except Exception as e:
        print(f"Error during database initialization: {e}")
        # If custom schema load failed, remove the bad files so we fallback on next runs
        clear_custom_schema_files()
    finally:
        db.close()


def clear_custom_schema_files():
    """Delete any custom schema files from disk to restore default database."""
    if os.path.exists(CUSTOM_SCHEMA_PATH):
        try:
            os.remove(CUSTOM_SCHEMA_PATH)
        except Exception:
            pass
    if os.path.exists(CUSTOM_INSERTS_PATH):
        try:
            os.remove(CUSTOM_INSERTS_PATH)
        except Exception:
            pass


if __name__ == "__main__":
    init_db()
