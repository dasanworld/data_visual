"""
Excel/CSV Parser Service

Handles Excel and CSV file parsing and data transformation for PerformanceData model.
Separated from views for better testability.
"""

import io
import re
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
        # Date columns - all map to reference_date
        "기준년월": "reference_date",
        "기준 년월": "reference_date",
        "reference_date": "reference_date",
        "평가년도": "reference_date",  # Department KPI evaluation year
        "게재일": "reference_date",  # Publication date
        "집행일자": "reference_date",  # Research project execution date
        "날짜": "reference_date",  # Generic date
        # Department columns
        "부서명": "department",
        "부서": "department",
        "department": "department",
        "단과대학": "department",  # College/Faculty
        "학과": "department",  # Department
        "소속학과": "department",  # Affiliated department
        # Department code
        "부서코드": "department_code",
        "department_code": "department_code",
        # Revenue/Budget/Expenditure columns
        "매출액": "revenue",
        "매출": "revenue",
        "revenue": "revenue",
        "예산": "budget",
        "budget": "budget",
        "지출액": "expenditure",
        "지출": "expenditure",
        "expenditure": "expenditure",
        "집행금액": "expenditure",  # Research project execution amount
        "총연구비": "budget",  # Total research budget
        # Paper/Patent/Project counts
        "논문수": "paper_count",
        "논문": "paper_count",
        "paper_count": "paper_count",
        "특허수": "patent_count",
        "특허": "patent_count",
        "patent_count": "patent_count",
        "프로젝트수": "project_count",
        "프로젝트": "project_count",
        "project_count": "project_count",
        # Extra metrics
        "추가지표1": "extra_metric_1",
        "추가지표2": "extra_metric_2",
        "교육지표": "extra_metric_1",  # Department KPI education metric
        "연구지표": "extra_metric_2",  # Department KPI research metric
        "지표1": "extra_metric_1",  # Generic metric 1
        "지표2": "extra_metric_2",  # Generic metric 2
        # Text fields
        "비고": "extra_text",
    }

    def read_excel(self, file_content: bytes, filename: str = "") -> pd.DataFrame:
        """
        Read Excel or CSV file content into a pandas DataFrame.

        Args:
            file_content: Raw bytes of the file
            filename: Original filename to determine file type

        Returns:
            DataFrame with normalized column names

        Raises:
            pd.errors.EmptyDataError: If file is empty
            ValueError: If file cannot be parsed
        """
        # Determine file type from filename
        is_csv = filename.lower().endswith(".csv")

        if is_csv:
            # Try different encodings for CSV
            for encoding in ["utf-8", "cp949", "euc-kr", "latin1"]:
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise ValueError("CSV 파일 인코딩을 인식할 수 없습니다.")
        else:
            df = pd.read_excel(io.BytesIO(file_content))

        if df.empty:
            raise ValueError("파일에 데이터가 없습니다.")

        # Normalize column names (strip whitespace and remove BOM)
        df.columns = df.columns.str.strip()
        df.columns = df.columns.str.replace("\ufeff", "", regex=False)  # Remove BOM character

        # Apply column mapping with priority handling
        # When multiple columns map to the same target, prioritize and merge them
        mapped_columns = {}
        target_to_sources = {}  # Track which sources map to each target

        for col in df.columns:
            if col in self.COLUMN_MAPPING:
                target = self.COLUMN_MAPPING[col]
                if target not in target_to_sources:
                    target_to_sources[target] = []
                target_to_sources[target].append(col)

        # For each target with multiple sources, choose priority source
        for target, sources in target_to_sources.items():
            if len(sources) == 1:
                # Only one source, straightforward mapping
                mapped_columns[sources[0]] = target
            else:
                # Multiple sources, apply priority logic
                if target == "department":
                    # Priority: 단과대학 > 학과 > 소속학과 > 부서명 > 부서
                    priority = [
                        "단과대학",
                        "학과",
                        "소속학과",
                        "부서명",
                        "부서",
                        "department",
                    ]
                    for pref in priority:
                        if pref in sources:
                            mapped_columns[pref] = target
                            break
                elif target == "reference_date":
                    # Priority: 기준년월 > 평가년도 > 게재일 > 집행일자 > 날짜
                    priority = [
                        "기준년월",
                        "기준 년월",
                        "reference_date",
                        "평가년도",
                        "게재일",
                        "집행일자",
                        "날짜",
                    ]
                    for pref in priority:
                        if pref in sources:
                            mapped_columns[pref] = target
                            break
                else:
                    # Default: use first source
                    mapped_columns[sources[0]] = target

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
        if "reference_date" not in df.columns:
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
        reference_dates = df["reference_date"].dropna().unique()
        if len(reference_dates) == 0:
            raise ValueError("기준 년월 데이터가 없습니다.")
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
        if pd.isna(row.get("reference_date")):
            return None

        data = {
            "reference_date": self.normalize_date(row.get("reference_date")),
            "department": (str(row.get("department", "")).strip() if pd.notna(row.get("department")) else ""),
            "department_code": (str(row.get("department_code", "")).strip() if pd.notna(row.get("department_code")) else ""),
            "revenue": self.to_decimal(row.get("revenue", 0)),
            "budget": self.to_decimal(row.get("budget", 0)),
            "expenditure": self.to_decimal(row.get("expenditure", 0)),
            "paper_count": self.to_int(row.get("paper_count", 0)),
            "patent_count": self.to_int(row.get("patent_count", 0)),
            "project_count": self.to_int(row.get("project_count", 0)),
            "extra_text": (str(row.get("extra_text", "")).strip() if pd.notna(row.get("extra_text")) else ""),
        }

        # Optional fields
        if "extra_metric_1" in row.index and pd.notna(row.get("extra_metric_1")):
            data["extra_metric_1"] = self.to_decimal(row.get("extra_metric_1"))
        if "extra_metric_2" in row.index and pd.notna(row.get("extra_metric_2")):
            data["extra_metric_2"] = self.to_decimal(row.get("extra_metric_2"))

        return data

    @staticmethod
    def normalize_date(value: Any) -> str:
        """
        Normalize date value to YYYY-MM format.

        Supports formats:
            - YYYY-MM (passthrough)
            - YYYY.MM, YYYY.M
            - YYYY/MM, YYYY/M
            - YYYY-MM, YYYY-M
            - YYYY. MM (with space)
            - YYYYMM (numeric)
            - YYYY (year only, defaults to January)
            - YYYY-MM-DD (full date, extracts year-month)
            - datetime objects
            - Excel serial date numbers

        Args:
            value: Date value in various formats

        Returns:
            Date string in YYYY-MM format

        Examples:
            >>> ExcelParser.normalize_date("2024-05")
            "2024-05"
            >>> ExcelParser.normalize_date("2024.05")
            "2024-05"
            >>> ExcelParser.normalize_date("2024/5")
            "2024-05"
            >>> ExcelParser.normalize_date("2024. 5")
            "2024-05"
            >>> ExcelParser.normalize_date("202405")
            "2024-05"
            >>> ExcelParser.normalize_date("2024")
            "2024-01"
            >>> ExcelParser.normalize_date("2024-05-15")
            "2024-05"
        """
        if pd.isna(value):
            return ""

        val_str = str(value).strip()

        # YYYY-MM-DD format (full date) - extract year and month
        # Matches: 2024-05-15, 2024/05/15, 2024.05.15
        match_full_date = re.match(r"^(\d{4})[./\-](\d{1,2})[./\-]\d{1,2}$", val_str)
        if match_full_date:
            year, month = match_full_date.groups()
            return f"{year}-{int(month):02d}"

        # Regex pattern for YYYY[separator]MM formats (including space)
        # Matches: 2024.05, 2024/5, 2024-5, 2024. 5 (with space)
        match = re.match(r"^(\d{4})[./\-\s]+(\d{1,2})$", val_str)
        if match:
            year, month = match.groups()
            return f"{year}-{int(month):02d}"

        # YYYY only (year only) - default to January
        # Matches: 2024, 2023
        if len(val_str) == 4 and val_str.isdigit():
            return f"{val_str}-01"

        # Handle float representation of YYYY (e.g., 2024.0)
        if "." in val_str:
            try:
                int_value = int(float(val_str))
                int_str = str(int_value)
                # Year only
                if len(int_str) == 4:
                    return f"{int_str}-01"
                # YYYYMM format
                if len(int_str) == 6:
                    return f"{int_str[:4]}-{int_str[4:]}"
            except (ValueError, TypeError):
                pass

        # YYYYMM format (string or int)
        if len(val_str) == 6 and val_str.isdigit():
            return f"{val_str[:4]}-{val_str[4:]}"

        # datetime object
        try:
            if hasattr(value, "strftime"):
                return value.strftime("%Y-%m")
        except Exception:
            pass

        # pandas Timestamp
        try:
            ts = pd.Timestamp(value)
            if not pd.isna(ts):
                return ts.strftime("%Y-%m")
        except Exception:
            pass

        # Fallback: return as-is
        return val_str

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
            >>> ExcelParser.to_decimal("1,234.56")
            Decimal("1234.56")
            >>> ExcelParser.to_decimal(None)
            Decimal("0")
        """
        if pd.isna(value):
            return Decimal(default)
        try:
            # Remove thousand separators
            clean_value = str(value).replace(",", "").strip()
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
            >>> ExcelParser.to_int("1,234")
            1234
            >>> ExcelParser.to_int(None)
            0
        """
        if pd.isna(value):
            return default
        try:
            # Remove thousand separators and convert via float (handles '1.0' cases)
            clean_value = str(value).replace(",", "").strip()
            return int(float(clean_value))
        except (ValueError, TypeError):
            return default
