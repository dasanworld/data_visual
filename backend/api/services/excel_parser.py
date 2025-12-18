"""
Excel Parser Service

Handles Excel file parsing and data transformation for PerformanceData model.
Separated from views for better testability.
"""

import io
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

import pandas as pd

from api.models import PerformanceData


class ExcelParser:
    """
    Service class for parsing Excel files and transforming data.

    Usage:
        parser = ExcelParser()
        df = parser.read_excel(file_content)
        objects = parser.parse_dataframe(df)
    """

    # Excel column name to model field mapping
    COLUMN_MAPPING = {
        '기준년월': 'reference_date',
        '기준 년월': 'reference_date',
        'reference_date': 'reference_date',
        '부서명': 'department',
        '부서': 'department',
        'department': 'department',
        '부서코드': 'department_code',
        'department_code': 'department_code',
        '매출액': 'revenue',
        '매출': 'revenue',
        'revenue': 'revenue',
        '예산': 'budget',
        'budget': 'budget',
        '지출액': 'expenditure',
        '지출': 'expenditure',
        'expenditure': 'expenditure',
        '논문수': 'paper_count',
        '논문': 'paper_count',
        'paper_count': 'paper_count',
        '특허수': 'patent_count',
        '특허': 'patent_count',
        'patent_count': 'patent_count',
        '프로젝트수': 'project_count',
        '프로젝트': 'project_count',
        'project_count': 'project_count',
        '추가지표1': 'extra_metric_1',
        '추가지표2': 'extra_metric_2',
        '비고': 'extra_text',
    }

    def read_excel(self, file_content: bytes) -> pd.DataFrame:
        """
        Read Excel file content into a pandas DataFrame.

        Args:
            file_content: Raw bytes of the Excel file

        Returns:
            DataFrame with normalized column names

        Raises:
            pd.errors.EmptyDataError: If file is empty
            ValueError: If file cannot be parsed
        """
        df = pd.read_excel(io.BytesIO(file_content))

        if df.empty:
            raise ValueError('엑셀 파일에 데이터가 없습니다.')

        # Normalize column names (strip whitespace)
        df.columns = df.columns.str.strip()

        # Apply column mapping
        mapped_columns = {}
        for col in df.columns:
            if col in self.COLUMN_MAPPING:
                mapped_columns[col] = self.COLUMN_MAPPING[col]

        df = df.rename(columns=mapped_columns)

        return df

    def validate_dataframe(self, df: pd.DataFrame) -> None:
        """
        Validate that DataFrame has required columns.

        Args:
            df: DataFrame to validate

        Raises:
            ValueError: If required columns are missing
        """
        if 'reference_date' not in df.columns:
            raise ValueError("'기준년월' 또는 'reference_date' 컬럼이 필요합니다.")

    def extract_reference_dates(self, df: pd.DataFrame) -> list:
        """
        Extract unique reference dates from DataFrame.

        Args:
            df: DataFrame with reference_date column

        Returns:
            List of unique reference dates

        Raises:
            ValueError: If no valid reference dates found
        """
        reference_dates = df['reference_date'].dropna().unique()
        if len(reference_dates) == 0:
            raise ValueError('기준 년월 데이터가 없습니다.')
        return list(reference_dates)

    def parse_dataframe(self, df: pd.DataFrame) -> tuple[list[PerformanceData], list[str]]:
        """
        Parse DataFrame rows into PerformanceData objects.

        Args:
            df: DataFrame to parse

        Returns:
            Tuple of (list of PerformanceData objects, list of error messages)
        """
        objects = []
        errors = []

        for idx, row in df.iterrows():
            try:
                obj_data = self.parse_row(row)
                if obj_data:
                    objects.append(PerformanceData(**obj_data))
            except Exception as e:
                errors.append(f"행 {idx + 2}: {str(e)}")

        return objects, errors

    def parse_row(self, row: pd.Series) -> Optional[dict[str, Any]]:
        """
        Parse a single DataFrame row into model field dictionary.

        Args:
            row: pandas Series representing a row

        Returns:
            Dictionary of model field values, or None if row is invalid
        """
        if pd.isna(row.get('reference_date')):
            return None

        data = {
            'reference_date': self.normalize_date(row.get('reference_date')),
            'department': str(row.get('department', '')).strip() if pd.notna(row.get('department')) else '',
            'department_code': str(row.get('department_code', '')).strip() if pd.notna(row.get('department_code')) else '',
            'revenue': self.to_decimal(row.get('revenue', 0)),
            'budget': self.to_decimal(row.get('budget', 0)),
            'expenditure': self.to_decimal(row.get('expenditure', 0)),
            'paper_count': self.to_int(row.get('paper_count', 0)),
            'patent_count': self.to_int(row.get('patent_count', 0)),
            'project_count': self.to_int(row.get('project_count', 0)),
            'extra_text': str(row.get('extra_text', '')).strip() if pd.notna(row.get('extra_text')) else '',
        }

        # Optional fields
        if 'extra_metric_1' in row.index and pd.notna(row.get('extra_metric_1')):
            data['extra_metric_1'] = self.to_decimal(row.get('extra_metric_1'))
        if 'extra_metric_2' in row.index and pd.notna(row.get('extra_metric_2')):
            data['extra_metric_2'] = self.to_decimal(row.get('extra_metric_2'))

        return data

    @staticmethod
    def normalize_date(value: Any) -> str:
        """
        Normalize date value to YYYY-MM format.

        Supports formats:
            - YYYY-MM (passthrough)
            - YYYYMM (numeric)
            - YYYY/MM
            - datetime objects
            - Excel serial date numbers

        Args:
            value: Date value in various formats

        Returns:
            Date string in YYYY-MM format

        Examples:
            >>> ExcelParser.normalize_date('2024-05')
            '2024-05'
            >>> ExcelParser.normalize_date('202405')
            '2024-05'
            >>> ExcelParser.normalize_date(202405)
            '2024-05'
            >>> ExcelParser.normalize_date('2024/05')
            '2024-05'
        """
        if pd.isna(value):
            return ''

        value_str = str(value).strip()

        # Already YYYY-MM format
        if len(value_str) == 7 and value_str[4] == '-':
            return value_str

        # YYYYMM format (string or int)
        if len(value_str) == 6 and value_str.isdigit():
            return f"{value_str[:4]}-{value_str[4:]}"

        # Handle float representation of YYYYMM (e.g., 202405.0)
        if '.' in value_str:
            try:
                int_value = int(float(value_str))
                int_str = str(int_value)
                if len(int_str) == 6:
                    return f"{int_str[:4]}-{int_str[4:]}"
            except (ValueError, TypeError):
                pass

        # YYYY/MM format
        if len(value_str) == 7 and value_str[4] == '/':
            return f"{value_str[:4]}-{value_str[5:]}"

        # datetime object
        try:
            if hasattr(value, 'strftime'):
                return value.strftime('%Y-%m')
        except Exception:
            pass

        # pandas Timestamp
        try:
            ts = pd.Timestamp(value)
            if not pd.isna(ts):
                return ts.strftime('%Y-%m')
        except Exception:
            pass

        # Fallback: truncate to 7 characters
        return value_str[:7] if len(value_str) >= 7 else value_str

    @staticmethod
    def to_decimal(value: Any, default: int = 0) -> Decimal:
        """
        Convert value to Decimal type.

        Args:
            value: Value to convert
            default: Default value if conversion fails

        Returns:
            Decimal representation of the value

        Examples:
            >>> ExcelParser.to_decimal('1,234.56')
            Decimal('1234.56')
            >>> ExcelParser.to_decimal(None)
            Decimal('0')
        """
        if pd.isna(value):
            return Decimal(default)
        try:
            # Remove thousand separators
            clean_value = str(value).replace(',', '').strip()
            return Decimal(clean_value)
        except (InvalidOperation, ValueError):
            return Decimal(default)

    @staticmethod
    def to_int(value: Any, default: int = 0) -> int:
        """
        Convert value to integer type.

        Args:
            value: Value to convert
            default: Default value if conversion fails

        Returns:
            Integer representation of the value

        Examples:
            >>> ExcelParser.to_int('1,234')
            1234
            >>> ExcelParser.to_int(None)
            0
        """
        if pd.isna(value):
            return default
        try:
            # Remove thousand separators and convert via float (handles '1.0' cases)
            clean_value = str(value).replace(',', '').strip()
            return int(float(clean_value))
        except (ValueError, TypeError):
            return default
