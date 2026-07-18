"""
Structured logging configuration using structlog.
Provides JSON-formatted logs with request correlation IDs.
"""

import structlog
import uuid
import logging
import sys
from contextvars import ContextVar

# Context variable for request-scoped correlation IDs
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="no-correlation")


def get_correlation_id() -> str:
    """Get the current correlation ID."""
    return correlation_id_var.get()


def new_correlation_id() -> str:
    """Generate and set a new correlation ID for the current request."""
    cid = str(uuid.uuid4())[:8]
    correlation_id_var.set(cid)
    return cid


def add_correlation_id(logger, method_name, event_dict):
    """Structlog processor that injects the correlation ID into every log."""
    event_dict["correlation_id"] = get_correlation_id()
    return event_dict


def setup_logging():
    """Configure structlog with JSON output and correlation ID injection."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            add_correlation_id,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.dev.ConsoleRenderer()  # Use JSONRenderer() in production
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None):
    """Get a structured logger instance."""
    return structlog.get_logger(name or __name__)
