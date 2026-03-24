def is_safe_sql(sql: str) -> bool:
    """
    Simplified validator that allows all queries as requested by the user.
    """
    if not sql:
        return False
    
    # We allow everything now (UPDATE, DELETE, DROP, etc.)
    return True
