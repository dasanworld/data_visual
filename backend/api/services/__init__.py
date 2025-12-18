"""
Services layer for business logic.

Separates business logic from views for better testability.
"""

from .excel_parser import ExcelParser

__all__ = ["ExcelParser"]
