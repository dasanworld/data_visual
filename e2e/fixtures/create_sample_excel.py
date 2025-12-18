#!/usr/bin/env python3
"""
Generate sample Excel file for E2E testing.

Run this script from the e2e/fixtures directory:
    python create_sample_excel.py

Requires: openpyxl (pip install openpyxl)
"""

import os
from pathlib import Path

try:
    from openpyxl import Workbook
except ImportError:
    print("openpyxl is required. Install with: pip install openpyxl")
    exit(1)


def create_sample_excel():
    """Create a sample Excel file with test data."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Sample Data"

    # Header row
    headers = [
        '기준년월',
        '부서명',
        '부서코드',
        '매출액',
        '예산',
        '지출액',
        '논문수',
        '특허수',
        '프로젝트수',
        '비고'
    ]
    ws.append(headers)

    # Sample data rows
    sample_data = [
        ['2024-01', '연구개발팀', 'RND001', 1000000, 500000, 300000, 5, 1, 3, '테스트 데이터 1'],
        ['2024-01', '행정팀', 'ADM001', 500000, 400000, 350000, 2, 0, 2, '테스트 데이터 2'],
        ['2024-01', '기획팀', 'PLN001', 800000, 600000, 400000, 3, 1, 4, '테스트 데이터 3'],
        ['2024-01', '마케팅팀', 'MKT001', 1200000, 800000, 600000, 1, 0, 2, '테스트 데이터 4'],
        ['2024-01', '인사팀', 'HR001', 300000, 250000, 200000, 0, 0, 1, '테스트 데이터 5'],
    ]

    for row in sample_data:
        ws.append(row)

    # Save the file
    output_path = Path(__file__).parent / 'sample_data.xlsx'
    wb.save(output_path)
    print(f"Sample Excel file created: {output_path}")


if __name__ == '__main__':
    create_sample_excel()
