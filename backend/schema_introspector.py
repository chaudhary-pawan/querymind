"""
Dynamic schema introspection using SQLAlchemy's Inspector.
Replaces the hardcoded SCHEMA_INFO string with live database metadata.
"""

from sqlalchemy import inspect, Engine
from typing import Dict, List, Optional
from logging_config import get_logger

log = get_logger("schema_introspector")


class TableInfo:
    """Structured representation of a single table's schema."""
    def __init__(self, name: str, columns: List[dict], primary_keys: List[str], foreign_keys: List[dict]):
        self.name = name
        self.columns = columns
        self.primary_keys = primary_keys
        self.foreign_keys = foreign_keys


class SchemaIntrospector:
    """
    Reads the live database schema via SQLAlchemy Inspector.
    Caches results to avoid repeated introspection on every request.
    """

    def __init__(self, engine: Engine):
        self.engine = engine
        self._cache: Optional[Dict[str, TableInfo]] = None
        self._schema_string_cache: Optional[str] = None

    def invalidate_cache(self):
        """Clear cached schema (call after DB reset)."""
        self._cache = None
        self._schema_string_cache = None

    def get_tables(self) -> Dict[str, TableInfo]:
        """Get all table metadata, using cache if available."""
        if self._cache is not None:
            return self._cache

        inspector = inspect(self.engine)
        tables = {}

        for table_name in inspector.get_table_names():
            # Skip internal SQLite tables
            if table_name.startswith("sqlite_"):
                continue

            columns = []
            for col in inspector.get_columns(table_name):
                columns.append({
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                })

            pk_info = inspector.get_pk_constraint(table_name)
            primary_keys = pk_info.get("constrained_columns", []) if pk_info else []

            foreign_keys = []
            for fk in inspector.get_foreign_keys(table_name):
                foreign_keys.append({
                    "column": fk["constrained_columns"],
                    "references_table": fk["referred_table"],
                    "references_columns": fk["referred_columns"],
                })

            tables[table_name] = TableInfo(
                name=table_name,
                columns=columns,
                primary_keys=primary_keys,
                foreign_keys=foreign_keys,
            )

        self._cache = tables
        log.info("schema_introspected", tables=list(tables.keys()), column_count=sum(len(t.columns) for t in tables.values()))
        return tables

    def get_allowed_tables(self) -> set:
        """Get set of all valid table names."""
        return set(self.get_tables().keys())

    def get_allowed_columns(self) -> Dict[str, set]:
        """Get mapping of table_name -> set of valid column names."""
        tables = self.get_tables()
        return {
            name: {col["name"] for col in info.columns}
            for name, info in tables.items()
        }

    def get_schema_string(self, filter_tables: List[str] = None) -> str:
        """
        Format the schema as a string suitable for LLM prompts.
        Optionally filter to only specific tables.
        """
        tables = self.get_tables()

        if filter_tables:
            tables = {k: v for k, v in tables.items() if k in filter_tables}

        if not filter_tables and self._schema_string_cache:
            return self._schema_string_cache

        lines = ["Database Schema:"]

        for table_name, info in tables.items():
            col_descriptions = []
            for col in info.columns:
                parts = [f"{col['name']} ({col['type']})"]
                if col["name"] in info.primary_keys:
                    parts.append("PRIMARY KEY")
                col_descriptions.append(", ".join(parts))

            lines.append(f"\nTable: {table_name}")
            lines.append(f"  Columns: {'; '.join(col_descriptions)}")

            if info.foreign_keys:
                fk_strs = []
                for fk in info.foreign_keys:
                    src = ", ".join(fk["column"])
                    dst_table = fk["references_table"]
                    dst_cols = ", ".join(fk["references_columns"])
                    fk_strs.append(f"{table_name}.{src} → {dst_table}.{dst_cols}")
                lines.append(f"  Foreign Keys: {'; '.join(fk_strs)}")

        result = "\n".join(lines)

        if not filter_tables:
            self._schema_string_cache = result

        return result
