"""
Unit tests for ExcelParser service.

Tests date normalization, decimal/integer conversion, and data parsing.
Follows test-plan.md specifications.
"""

from datetime import datetime
from decimal import Decimal

import pandas as pd
import pytest

from api.services.excel_parser import ExcelParser


class TestNormalizeDate:
    """Test cases for ExcelParser.normalize_date() method."""

    def test_already_formatted_yyyy_mm(self):
        """YYYY-MM format should pass through unchanged."""
        assert ExcelParser.normalize_date('2024-05') == '2024-05'
        assert ExcelParser.normalize_date('2024-01') == '2024-01'
        assert ExcelParser.normalize_date('2024-12') == '2024-12'

    def test_yyyymm_string_format(self):
        """YYYYMM string format should be converted to YYYY-MM."""
        assert ExcelParser.normalize_date('202405') == '2024-05'
        assert ExcelParser.normalize_date('202401') == '2024-01'
        assert ExcelParser.normalize_date('202312') == '2023-12'

    def test_yyyymm_integer_format(self):
        """YYYYMM integer format should be converted to YYYY-MM."""
        assert ExcelParser.normalize_date(202405) == '2024-05'
        assert ExcelParser.normalize_date(202401) == '2024-01'

    def test_yyyymm_float_format(self):
        """YYYYMM float format (e.g., Excel) should be converted to YYYY-MM."""
        assert ExcelParser.normalize_date(202405.0) == '2024-05'
        assert ExcelParser.normalize_date(202401.0) == '2024-01'

    def test_yyyy_slash_mm_format(self):
        """YYYY/MM format should be converted to YYYY-MM."""
        assert ExcelParser.normalize_date('2024/05') == '2024-05'
        assert ExcelParser.normalize_date('2024/01') == '2024-01'

    def test_datetime_object(self):
        """datetime objects should be converted to YYYY-MM."""
        dt = datetime(2024, 5, 15)
        assert ExcelParser.normalize_date(dt) == '2024-05'

    def test_pandas_timestamp(self):
        """pandas Timestamp should be converted to YYYY-MM."""
        ts = pd.Timestamp('2024-05-15')
        assert ExcelParser.normalize_date(ts) == '2024-05'

    def test_none_value(self):
        """None/NaN values should return empty string."""
        assert ExcelParser.normalize_date(None) == ''
        assert ExcelParser.normalize_date(pd.NA) == ''
        assert ExcelParser.normalize_date(float('nan')) == ''

    def test_whitespace_handling(self):
        """Whitespace should be stripped."""
        assert ExcelParser.normalize_date('  2024-05  ') == '2024-05'
        assert ExcelParser.normalize_date(' 202405 ') == '2024-05'

    def test_edge_cases(self):
        """Edge cases should be handled gracefully."""
        # Short strings
        assert ExcelParser.normalize_date('2024') == '2024'
        # Unexpected format - returns first 7 chars
        assert ExcelParser.normalize_date('20240501') == '2024050'


class TestToDecimal:
    """Test cases for ExcelParser.to_decimal() method."""

    def test_integer_conversion(self):
        """Integer values should convert to Decimal."""
        assert ExcelParser.to_decimal(1000) == Decimal('1000')
        assert ExcelParser.to_decimal(0) == Decimal('0')

    def test_float_conversion(self):
        """Float values should convert to Decimal."""
        assert ExcelParser.to_decimal(1234.56) == Decimal('1234.56')

    def test_string_conversion(self):
        """String values should convert to Decimal."""
        assert ExcelParser.to_decimal('1234.56') == Decimal('1234.56')
        assert ExcelParser.to_decimal('1000') == Decimal('1000')

    def test_thousand_separator(self):
        """Thousand separators should be handled."""
        assert ExcelParser.to_decimal('1,234,567.89') == Decimal('1234567.89')
        assert ExcelParser.to_decimal('1,000') == Decimal('1000')

    def test_none_returns_default(self):
        """None/NaN values should return default."""
        assert ExcelParser.to_decimal(None) == Decimal('0')
        assert ExcelParser.to_decimal(pd.NA) == Decimal('0')
        assert ExcelParser.to_decimal(None, default=100) == Decimal('100')

    def test_invalid_value_returns_default(self):
        """Invalid values should return default."""
        assert ExcelParser.to_decimal('invalid') == Decimal('0')
        assert ExcelParser.to_decimal('abc', default=50) == Decimal('50')

    def test_whitespace_handling(self):
        """Whitespace should be stripped."""
        assert ExcelParser.to_decimal('  1234.56  ') == Decimal('1234.56')


class TestToInt:
    """Test cases for ExcelParser.to_int() method."""

    def test_integer_passthrough(self):
        """Integer values should pass through."""
        assert ExcelParser.to_int(1000) == 1000
        assert ExcelParser.to_int(0) == 0

    def test_float_conversion(self):
        """Float values should be truncated to int."""
        assert ExcelParser.to_int(1234.56) == 1234
        assert ExcelParser.to_int(1234.99) == 1234

    def test_string_conversion(self):
        """String values should convert to int."""
        assert ExcelParser.to_int('1234') == 1234
        assert ExcelParser.to_int('1234.0') == 1234

    def test_thousand_separator(self):
        """Thousand separators should be handled."""
        assert ExcelParser.to_int('1,234') == 1234
        assert ExcelParser.to_int('1,234,567') == 1234567

    def test_none_returns_default(self):
        """None/NaN values should return default."""
        assert ExcelParser.to_int(None) == 0
        assert ExcelParser.to_int(pd.NA) == 0
        assert ExcelParser.to_int(None, default=10) == 10

    def test_invalid_value_returns_default(self):
        """Invalid values should return default."""
        assert ExcelParser.to_int('invalid') == 0
        assert ExcelParser.to_int('abc', default=5) == 5


class TestParseRow:
    """Test cases for ExcelParser.parse_row() method."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_valid_row_parsing(self, parser):
        """Valid row should be parsed correctly."""
        row = pd.Series({
            'reference_date': '2024-05',
            'department': '연구개발팀',
            'department_code': 'RND001',
            'revenue': '1,000,000',
            'budget': '500,000',
            'expenditure': '300,000',
            'paper_count': 10,
            'patent_count': 2,
            'project_count': 5,
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['reference_date'] == '2024-05'
        assert result['department'] == '연구개발팀'
        assert result['department_code'] == 'RND001'
        assert result['revenue'] == Decimal('1000000')
        assert result['budget'] == Decimal('500000')
        assert result['expenditure'] == Decimal('300000')
        assert result['paper_count'] == 10
        assert result['patent_count'] == 2
        assert result['project_count'] == 5

    def test_row_with_missing_optional_fields(self, parser):
        """Row with missing optional fields should use defaults."""
        row = pd.Series({
            'reference_date': '2024-05',
            'department': '테스트팀',
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['reference_date'] == '2024-05'
        assert result['department'] == '테스트팀'
        assert result['revenue'] == Decimal('0')
        assert result['paper_count'] == 0

    def test_row_with_null_reference_date(self, parser):
        """Row with null reference_date should return None."""
        row = pd.Series({
            'reference_date': None,
            'department': '테스트팀',
        })

        result = parser.parse_row(row)
        assert result is None

    def test_row_with_extra_metrics(self, parser):
        """Row with extra metrics should include them."""
        row = pd.Series({
            'reference_date': '2024-05',
            'department': '테스트팀',
            'extra_metric_1': '123.45',
            'extra_metric_2': '678.90',
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['extra_metric_1'] == Decimal('123.45')
        assert result['extra_metric_2'] == Decimal('678.90')


class TestColumnMapping:
    """Test cases for column mapping functionality."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_korean_column_names(self, parser):
        """Korean column names should be mapped correctly."""
        assert parser.COLUMN_MAPPING['기준년월'] == 'reference_date'
        assert parser.COLUMN_MAPPING['기준 년월'] == 'reference_date'
        assert parser.COLUMN_MAPPING['부서명'] == 'department'
        assert parser.COLUMN_MAPPING['매출액'] == 'revenue'
        assert parser.COLUMN_MAPPING['논문수'] == 'paper_count'

    def test_english_column_names(self, parser):
        """English column names should be mapped correctly."""
        assert parser.COLUMN_MAPPING['reference_date'] == 'reference_date'
        assert parser.COLUMN_MAPPING['department'] == 'department'
        assert parser.COLUMN_MAPPING['revenue'] == 'revenue'

    def test_short_korean_names(self, parser):
        """Short Korean names should be mapped correctly."""
        assert parser.COLUMN_MAPPING['부서'] == 'department'
        assert parser.COLUMN_MAPPING['매출'] == 'revenue'
        assert parser.COLUMN_MAPPING['논문'] == 'paper_count'


class TestValidateDataframe:
    """Test cases for DataFrame validation."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_valid_dataframe(self, parser):
        """DataFrame with required columns should pass validation."""
        df = pd.DataFrame({
            'reference_date': ['2024-05'],
            'department': ['테스트팀'],
        })
        # Should not raise
        parser.validate_dataframe(df)

    def test_missing_reference_date_column(self, parser):
        """DataFrame without reference_date should raise ValueError."""
        df = pd.DataFrame({
            'department': ['테스트팀'],
            'revenue': [1000],
        })

        with pytest.raises(ValueError) as exc_info:
            parser.validate_dataframe(df)

        assert 'reference_date' in str(exc_info.value)


class TestExtractReferenceDates:
    """Test cases for extracting reference dates."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_single_reference_date(self, parser):
        """Single reference date should be extracted."""
        df = pd.DataFrame({
            'reference_date': ['2024-05', '2024-05', '2024-05'],
        })

        dates = parser.extract_reference_dates(df)

        assert len(dates) == 1
        assert '2024-05' in dates

    def test_multiple_reference_dates(self, parser):
        """Multiple reference dates should be extracted."""
        df = pd.DataFrame({
            'reference_date': ['2024-05', '2024-06', '2024-05'],
        })

        dates = parser.extract_reference_dates(df)

        assert len(dates) == 2
        assert '2024-05' in dates
        assert '2024-06' in dates

    def test_empty_reference_dates(self, parser):
        """Empty reference dates should raise ValueError."""
        df = pd.DataFrame({
            'reference_date': [None, pd.NA],
        })

        with pytest.raises(ValueError) as exc_info:
            parser.extract_reference_dates(df)

        assert '기준 년월' in str(exc_info.value)
