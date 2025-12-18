"""
CSV 파일을 Excel 파일로 변환하는 스크립트

사용법:
    python create_fixture_from_csv.py

설명:
    - public/ 폴더의 CSV 파일들을 읽어서
    - e2e/fixtures/ 폴더에 Excel 파일로 저장합니다.
    - 한글 인코딩(UTF-8)을 지원합니다.
"""

import pandas as pd
from pathlib import Path
import sys

# 프로젝트 루트 디렉토리 설정
PROJECT_ROOT = Path(__file__).parent.parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"
FIXTURES_DIR = PROJECT_ROOT / "e2e" / "fixtures"

# 변환할 CSV 파일 목록 (파일명, 출력 파일명)
CSV_FILES = [
    ("department_kpi.csv", "department_kpi.xlsx"),
    ("publication_list.csv", "publication_list.xlsx"),
    ("research_project_data.csv", "research_project_data.xlsx"),
]


def convert_csv_to_excel(csv_path: Path, excel_path: Path) -> bool:
    """
    CSV 파일을 Excel 파일로 변환합니다.

    Args:
        csv_path: 입력 CSV 파일 경로
        excel_path: 출력 Excel 파일 경로

    Returns:
        bool: 변환 성공 여부
    """
    try:
        print(f"Reading CSV: {csv_path}")

        # CSV 파일 읽기 (UTF-8 인코딩)
        df = pd.read_csv(csv_path, encoding='utf-8')

        print(f"  - Rows: {len(df)}, Columns: {len(df.columns)}")
        print(f"  - Column names: {', '.join(df.columns)}")

        # Excel 파일로 저장
        print(f"Writing Excel: {excel_path}")
        df.to_excel(excel_path, index=False, engine='openpyxl')

        print(f"  - Successfully converted!\n")
        return True

    except FileNotFoundError:
        print(f"  - ERROR: CSV file not found: {csv_path}\n")
        return False

    except Exception as e:
        print(f"  - ERROR: Failed to convert: {e}\n")
        return False


def main():
    """메인 함수"""
    print("=" * 70)
    print("CSV to Excel Converter for E2E Test Fixtures")
    print("=" * 70)
    print()

    # 디렉토리 존재 확인
    if not PUBLIC_DIR.exists():
        print(f"ERROR: Public directory not found: {PUBLIC_DIR}")
        sys.exit(1)

    if not FIXTURES_DIR.exists():
        print(f"Creating fixtures directory: {FIXTURES_DIR}")
        FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Source directory: {PUBLIC_DIR}")
    print(f"Output directory: {FIXTURES_DIR}")
    print()

    # 변환 실행
    success_count = 0
    fail_count = 0

    for csv_filename, excel_filename in CSV_FILES:
        csv_path = PUBLIC_DIR / csv_filename
        excel_path = FIXTURES_DIR / excel_filename

        if convert_csv_to_excel(csv_path, excel_path):
            success_count += 1
        else:
            fail_count += 1

    # 결과 요약
    print("=" * 70)
    print("Conversion Summary")
    print("=" * 70)
    print(f"Total files: {len(CSV_FILES)}")
    print(f"Success: {success_count}")
    print(f"Failed: {fail_count}")
    print()

    if fail_count == 0:
        print("All files converted successfully!")
        sys.exit(0)
    else:
        print("Some files failed to convert. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
