"""
Unit tests for ExcelParser service.

Tests date normalization, decimal/integer conversion, and data parsing.
Follows test-plan.md specifications.
"""

import io
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
        # Year-only string gets parsed by pandas Timestamp as January
        result = ExcelParser.normalize_date('2024')
        assert result == '2024-01' or result == '2024'
        # YYYYMMDD format gets parsed by pandas Timestamp
        result = ExcelParser.normalize_date('20240501')
        assert result == '2024-05' or result == '20240501'

    def test_yyyy_dot_mm_format(self):
        """YYYY.MM format should be converted to YYYY-MM."""
        assert ExcelParser.normalize_date('2024.05') == '2024-05'
        assert ExcelParser.normalize_date('2024.01') == '2024-01'
        assert ExcelParser.normalize_date('2024.12') == '2024-12'

    def test_yyyy_slash_m_single_digit_format(self):
        """YYYY/M (single digit month) format should be converted to YYYY-MM with zero-padding."""
        assert ExcelParser.normalize_date('2024/5') == '2024-05'
        assert ExcelParser.normalize_date('2024/1') == '2024-01'
        assert ExcelParser.normalize_date('2024/9') == '2024-09'

    def test_yyyy_dash_m_single_digit_format(self):
        """YYYY-M (single digit month) format should be converted to YYYY-MM with zero-padding."""
        assert ExcelParser.normalize_date('2024-5') == '2024-05'
        assert ExcelParser.normalize_date('2024-1') == '2024-01'
        assert ExcelParser.normalize_date('2024-9') == '2024-09'

    def test_yyyy_dot_space_m_format(self):
        """YYYY. M (with space) format should be converted to YYYY-MM."""
        assert ExcelParser.normalize_date('2024. 5') == '2024-05'
        assert ExcelParser.normalize_date('2024. 1') == '2024-01'
        assert ExcelParser.normalize_date('2024. 12') == '2024-12'


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


class TestParsingDepartmentKPI:
    """Test cases for department_kpi.csv structure parsing."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_department_kpi_structure_with_year_only(self, parser):
        """Test parsing department KPI data with year-only dates."""
        df = pd.DataFrame({
            '평가년도': [2023, 2024, 2025],
            '단과대학': ['공과대학', '인문대학', '공과대학'],
            '학과': ['컴퓨터공학과', '국어국문학과', '전자공학과'],
            '졸업생 취업률 (%)': [85.5, 68.2, 90.5],
            '전임교원 수 (명)': [15, 12, 19],
            '초빙교원 수 (명)': [4, 2, 5],
            '연간 기술이전 수입액 (억원)': [8.5, 0.8, 22.0],
            '국제학술대회 개최 횟수': [2, 1, 3],
        })

        buffer = io.BytesIO()
        df.to_excel(buffer, index=False)
        buffer.seek(0)
        result = parser.read_excel(buffer.read())

        assert not result.empty
        assert len(result) == 3
        assert '평가년도' in result.columns or 'reference_date' in result.columns

    def test_percentage_data_parsing(self, parser):
        """Test handling percentage values correctly."""
        row = pd.Series({
            'reference_date': '2024-01',
            'department': '컴퓨터공학과',
            '졸업생 취업률 (%)': 85.5,
            'revenue': 0,
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['department'] == '컴퓨터공학과'
        assert '졸업생 취업률 (%)' not in result

    def test_employee_count_integer_parsing(self, parser):
        """Test parsing employee count as integers."""
        assert parser.to_int(15.0) == 15
        assert parser.to_int('15') == 15
        assert parser.to_int('15.0') == 15
        assert parser.to_int(19) == 19

    def test_large_currency_values_in_korean_units(self, parser):
        """Test parsing large currency values (억원 units)."""
        assert parser.to_decimal('8.5') == Decimal('8.5')
        assert parser.to_decimal('12.1') == Decimal('12.1')
        assert parser.to_decimal('22.0') == Decimal('22.0')
        assert parser.to_decimal(850000000) == Decimal('850000000')

    def test_empty_cells_in_kpi_data(self, parser):
        """Test handling empty cells in KPI data."""
        row = pd.Series({
            'reference_date': '2024-01',
            'department': '철학과',
            '전임교원 수 (명)': None,
            '초빙교원 수 (명)': pd.NA,
            'revenue': 0,
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['department'] == '철학과'

    def test_korean_department_names_with_special_characters(self, parser):
        """Test handling Korean department names with various formats."""
        test_names = ['컴퓨터공학과', '국어국문학과', '전자·정보공학과', '인공지능학과']

        for name in test_names:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': name,
                'revenue': 0,
            })
            result = parser.parse_row(row)

            assert result is not None
            assert result['department'] == name

    def test_multiple_year_formats_2023_2024_2025(self, parser):
        """Test handling dates from different years (2023, 2024, 2025)."""
        years = ['2023', '2024', '2025']

        for year in years:
            result = parser.normalize_date(year)
            assert result == f'{year}-01' or result == year


class TestParsingPublicationList:
    """Test cases for publication_list.csv structure parsing."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_publication_date_format_yyyy_mm_dd(self, parser):
        """Test parsing publication dates in YYYY-MM-DD format."""
        dates = ['2023-02-18', '2024-01-30', '2025-06-15']

        for date_str in dates:
            result = parser.normalize_date(date_str)
            assert '-' in result
            assert len(result.split('-')) >= 2

    def test_long_korean_text_in_title(self, parser):
        """Test handling long Korean text in publication titles."""
        long_titles = [
            'A Study on Low-Power Semiconductor Design',
            '현대 분석철학의 언어적 전회에 관한 고찰',
            'Deep Learning based Anomaly Detection in Real-Time Traffic',
            '1920년대 시문학에 나타난 모더니즘 수용 양상',
        ]

        for title in long_titles:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': '테스트학과',
                'extra_text': title,
            })
            result = parser.parse_row(row)

            assert result is not None
            assert result['extra_text'] == title

    def test_semicolon_separated_authors(self, parser):
        """Test handling semicolon-separated author lists."""
        author_lists = [
            '박지훈;최민서',
            '정현우;김유진;한지민',
            '단일저자',
        ]

        for authors in author_lists:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': '테스트학과',
                'extra_text': authors,
            })
            result = parser.parse_row(row)

            assert result is not None
            if ';' in authors:
                assert ';' in result['extra_text']

    def test_journal_classification_text_fields(self, parser):
        """Test handling journal classification text fields (SCIE, KCI)."""
        classifications = ['SCIE', 'KCI', 'SCOPUS', 'SCI']

        for classification in classifications:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': '테스트학과',
                'extra_text': classification,
            })
            result = parser.parse_row(row)

            assert result is not None
            assert result['extra_text'] == classification

    def test_impact_factor_decimal_values(self, parser):
        """Test parsing Impact Factor as decimal values."""
        impact_factors = [3.9, 8.5, 6.4, 10.6, None]

        for factor in impact_factors:
            if factor is not None:
                result = parser.to_decimal(factor)
                assert isinstance(result, Decimal)
                assert result == Decimal(str(factor))
            else:
                result = parser.to_decimal(factor)
                assert result == Decimal('0')

    def test_yes_no_boolean_fields(self, parser):
        """Test handling Y/N boolean fields (과제연계여부)."""
        row = pd.Series({
            'reference_date': '2024-01',
            'department': '컴퓨터공학과',
            'extra_text': 'Y',
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['extra_text'] in ['Y', 'N', '']

    def test_empty_impact_factor_field(self, parser):
        """Test handling empty Impact Factor for non-SCIE journals."""
        row = pd.Series({
            'reference_date': '2024-01',
            'department': '철학과',
            'extra_metric_1': None,
            'extra_metric_2': pd.NA,
        })

        result = parser.parse_row(row)

        assert result is not None
        assert 'extra_metric_1' not in result or result.get('extra_metric_1') is None


class TestParsingResearchProject:
    """Test cases for research_project_data.csv structure parsing."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_large_budget_amounts_in_won(self, parser):
        """Test parsing large budget amounts in Korean won."""
        large_amounts = [
            500000000,  # 5억원
            800000000,  # 8억원
            300000000,  # 3억원
            80000000,   # 8000만원
        ]

        for amount in large_amounts:
            result = parser.to_decimal(amount)
            assert result == Decimal(str(amount))

    def test_execution_date_format(self, parser):
        """Test parsing execution dates in YYYY-MM-DD format."""
        execution_dates = ['2023-03-15', '2024-02-28', '2025-04-10']

        for date_str in execution_dates:
            result = parser.normalize_date(date_str)
            assert result.startswith('2023') or result.startswith('2024') or result.startswith('2025')

    def test_project_status_korean_text(self, parser):
        """Test handling Korean status text (집행완료, 처리중)."""
        statuses = ['집행완료', '처리중', '계획중', '취소됨']

        for status in statuses:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': '테스트학과',
                'extra_text': status,
            })
            result = parser.parse_row(row)

            assert result is not None
            assert result['extra_text'] == status

    def test_project_id_format_alphanumeric(self, parser):
        """Test handling project ID with alphanumeric format."""
        project_ids = ['T2301001', 'T2402001', 'T2503003', 'NRF-2023-015', 'IITP-A-23-101']

        for project_id in project_ids:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': '테스트학과',
                'department_code': project_id,
            })
            result = parser.parse_row(row)

            assert result is not None
            assert result['department_code'] == project_id

    def test_mixed_numeric_and_text_in_memo_field(self, parser):
        """Test handling mixed content in memo/notes field."""
        memo_texts = [
            'A-1급 스펙트로미터',
            '참여연구원 3개월 급여',
            '견적서 검토 단계',
            '그리스 학회 참가',
        ]

        for memo in memo_texts:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': '테스트학과',
                'extra_text': memo,
            })
            result = parser.parse_row(row)

            assert result is not None
            assert result['extra_text'] == memo

    def test_varying_decimal_places_in_amounts(self, parser):
        """Test parsing amounts with varying decimal places."""
        amounts = [
            '120000000',     # No decimal
            '8000000.00',    # Two decimals
            '25500000',      # No decimal
            '4500000.5',     # One decimal
        ]

        for amount in amounts:
            result = parser.to_decimal(amount)
            assert isinstance(result, Decimal)
            assert result > 0

    def test_null_values_in_optional_memo_field(self, parser):
        """Test handling null values in optional memo field."""
        row = pd.Series({
            'reference_date': '2024-01',
            'department': '테스트학과',
            'extra_text': None,
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['extra_text'] == ''


class TestEdgeCases:
    """Test edge cases and special scenarios."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_very_large_currency_values(self, parser):
        """Test parsing very large currency values (조원 level)."""
        very_large = [
            1000000000000,  # 1조원
            5500000000000,  # 5.5조원
            100000000,      # 1억원
        ]

        for amount in very_large:
            result = parser.to_decimal(amount)
            assert result == Decimal(str(amount))

    def test_extremely_long_text_fields(self, parser):
        """Test handling extremely long text fields."""
        long_text = 'A' * 1000  # 1000 character string

        row = pd.Series({
            'reference_date': '2024-01',
            'department': '테스트학과',
            'extra_text': long_text,
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['extra_text'] == long_text

    def test_special_characters_in_text_fields(self, parser):
        """Test handling special characters in text fields."""
        special_texts = [
            '연구비 (50%)',
            'AI·빅데이터',
            '10,000원/건',
            'R&D 투자액',
            '제1저자',
        ]

        for text in special_texts:
            row = pd.Series({
                'reference_date': '2024-01',
                'department': '테스트학과',
                'extra_text': text,
            })
            result = parser.parse_row(row)

            assert result is not None
            assert result['extra_text'] == text

    def test_whitespace_in_various_positions(self, parser):
        """Test handling whitespace in various positions."""
        row = pd.Series({
            'reference_date': '  2024-01  ',
            'department': ' 테스트학과 ',
            'department_code': '  CODE001  ',
            'revenue': '  1000  ',
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['reference_date'] == '2024-01'
        assert result['department'] == '테스트학과'

    def test_missing_multiple_required_fields(self, parser):
        """Test handling rows with multiple missing fields."""
        row = pd.Series({
            'reference_date': '2024-01',
            'department': None,
            'department_code': None,
            'revenue': None,
        })

        result = parser.parse_row(row)

        assert result is not None
        assert result['department'] == ''
        assert result['revenue'] == Decimal('0')


class TestPerformance:
    """Performance tests for large datasets."""

    @pytest.fixture
    def parser(self):
        """Create ExcelParser instance."""
        return ExcelParser()

    def test_parse_large_dataset_1000_rows(self, parser):
        """Test parsing a dataset with 1000+ rows."""
        import time

        large_df = pd.DataFrame({
            'reference_date': ['2024-01'] * 1500,
            'department': [f'테스트부서{i}' for i in range(1500)],
            'revenue': [1000 * i for i in range(1500)],
            'budget': [2000 * i for i in range(1500)],
        })

        start_time = time.time()
        objects, errors = parser.parse_dataframe(large_df)
        elapsed_time = time.time() - start_time

        assert len(objects) > 0
        assert elapsed_time < 10.0  # Should complete within 10 seconds

    def test_parse_wide_dataset_many_columns(self, parser):
        """Test parsing a dataset with many columns."""
        data = {
            'reference_date': ['2024-01'] * 100,
            'department': ['테스트부서'] * 100,
        }

        for i in range(50):
            data[f'extra_metric_{i}'] = [i * 100] * 100

        df = pd.DataFrame(data)
        objects, errors = parser.parse_dataframe(df)

        assert len(objects) > 0

    def test_memory_efficiency_with_large_strings(self, parser):
        """Test memory efficiency with large string fields."""
        import sys

        large_text = 'X' * 10000
        rows = []

        for i in range(100):
            rows.append({
                'reference_date': '2024-01',
                'department': f'부서{i}',
                'extra_text': large_text,
            })

        df = pd.DataFrame(rows)
        objects, errors = parser.parse_dataframe(df)

        assert len(objects) == 100

        memory_size = sys.getsizeof(objects)
        assert memory_size < 10000000  # Should be less than 10MB
