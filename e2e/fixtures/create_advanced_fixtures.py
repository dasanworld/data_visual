"""
Create Advanced Test Fixtures for E2E Tests

Generates multiple Excel files for testing:
1. department_kpi.xlsx - Department KPI data with multiple years
2. publication_list.xlsx - Publication list with dates and departments
3. research_project_data.xlsx - Research project data with execution dates
4. large_dataset.xlsx - Large dataset (1000+ rows) for performance testing
"""

import pandas as pd
from datetime import datetime, timedelta
import random
from pathlib import Path

# Output directory
OUTPUT_DIR = Path(__file__).parent
OUTPUT_DIR.mkdir(exist_ok=True)


def create_department_kpi():
    """Create department KPI data with multiple years and departments."""
    data = []
    departments = [
        "공과대학",
        "인문대학",
        "자연과학대학",
        "사회과학대학",
        "경영대학",
        "의과대학",
    ]
    years = [2023, 2024, 2025]

    for year in years:
        for dept in departments:
            data.append({
                "평가년도": year,
                "단과대학": dept,
                "교육지표": round(random.uniform(70, 95), 2),
                "연구지표": round(random.uniform(65, 90), 2),
                "산학협력지표": round(random.uniform(60, 85), 2),
                "국제화지표": round(random.uniform(55, 80), 2),
                "총점": round(random.uniform(250, 350), 2),
            })

    df = pd.DataFrame(data)
    output_path = OUTPUT_DIR / "department_kpi.xlsx"
    df.to_excel(output_path, index=False, engine="openpyxl")
    print(f"Created: {output_path} ({len(df)} rows)")
    return df


def create_publication_list():
    """Create publication list with dates, departments, and journal grades."""
    data = []
    departments = [
        "공과대학",
        "인문대학",
        "자연과학대학",
        "사회과학대학",
    ]
    journal_grades = ["SCIE", "SSCI", "A&HCI", "KCI", "기타"]

    # Generate publications over 2 years
    start_date = datetime(2023, 1, 1)
    end_date = datetime(2024, 12, 31)

    for i in range(150):
        random_days = random.randint(0, (end_date - start_date).days)
        pub_date = start_date + timedelta(days=random_days)

        data.append({
            "논문번호": f"PUB-{2023 + i // 75}-{i % 75 + 1:03d}",
            "논문제목": f"연구 논문 제목 {i + 1}",
            "게재일": pub_date.strftime("%Y-%m-%d"),
            "단과대학": random.choice(departments),
            "저널명": f"Journal of Studies Vol.{random.randint(1, 100)}",
            "저널등급": random.choice(journal_grades),
            "IF점수": round(random.uniform(0.5, 10.0), 3),
            "저자수": random.randint(1, 8),
        })

    df = pd.DataFrame(data)
    output_path = OUTPUT_DIR / "publication_list.xlsx"
    df.to_excel(output_path, index=False, engine="openpyxl")
    print(f"Created: {output_path} ({len(df)} rows)")
    return df


def create_research_project_data():
    """Create research project data with execution dates and agencies."""
    data = []
    agencies = [
        "NRF",  # 한국연구재단
        "IITP",  # 정보통신기획평가원
        "KIAT",  # 한국산업기술평가관리원
        "MOTIE",  # 산업통상자원부
        "MSIT",  # 과학기술정보통신부
        "SME",  # 중소벤처기업부
    ]
    statuses = ["집행완료", "처리중", "심사중"]
    departments = [
        "공과대학",
        "자연과학대학",
        "의과대학",
        "경영대학",
    ]

    start_date = datetime(2023, 1, 1)
    end_date = datetime(2025, 12, 31)

    for i in range(200):
        random_days = random.randint(0, (end_date - start_date).days)
        exec_date = start_date + timedelta(days=random_days)

        data.append({
            "과제번호": f"PRJ-{exec_date.year}-{i + 1:04d}",
            "과제명": f"연구개발과제 {i + 1}",
            "지원기관": random.choice(agencies),
            "집행일자": exec_date.strftime("%Y-%m-%d"),
            "집행금액": random.randint(5000000, 500000000),
            "단과대학": random.choice(departments),
            "연구책임자": f"연구자{i + 1}",
            "상태": random.choice(statuses),
            "연구기간(월)": random.randint(6, 60),
        })

    df = pd.DataFrame(data)
    output_path = OUTPUT_DIR / "research_project_data.xlsx"
    df.to_excel(output_path, index=False, engine="openpyxl")
    print(f"Created: {output_path} ({len(df)} rows)")
    return df


def create_large_dataset():
    """Create large dataset with 1000+ rows for performance testing."""
    data = []
    departments = [
        "공과대학",
        "인문대학",
        "자연과학대학",
        "사회과학대학",
        "경영대학",
        "의과대학",
        "법과대학",
        "사범대학",
    ]

    start_date = datetime(2020, 1, 1)
    end_date = datetime(2025, 12, 31)

    # Generate 1200 rows
    for i in range(1200):
        random_days = random.randint(0, (end_date - start_date).days)
        data_date = start_date + timedelta(days=random_days)

        data.append({
            "ID": f"DATA-{i + 1:05d}",
            "날짜": data_date.strftime("%Y-%m-%d"),
            "단과대학": random.choice(departments),
            "지표1": round(random.uniform(50, 100), 2),
            "지표2": round(random.uniform(50, 100), 2),
            "지표3": round(random.uniform(50, 100), 2),
            "지표4": round(random.uniform(50, 100), 2),
            "총점": round(random.uniform(200, 400), 2),
            "비고": f"테스트 데이터 {i + 1}",
        })

    df = pd.DataFrame(data)
    output_path = OUTPUT_DIR / "large_dataset.xlsx"
    df.to_excel(output_path, index=False, engine="openpyxl")
    print(f"Created: {output_path} ({len(df)} rows)")
    return df


def main():
    """Generate all test fixtures."""
    print("Generating advanced test fixtures...\n")

    create_department_kpi()
    create_publication_list()
    create_research_project_data()
    create_large_dataset()

    print("\nAll fixtures generated successfully!")
    print(f"Location: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
