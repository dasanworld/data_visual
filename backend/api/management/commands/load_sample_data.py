"""
Management command to load sample CSV data from public/ folder.

Usage:
    python manage.py load_sample_data
    python manage.py load_sample_data --clear  # Clear existing data first
"""

import os
from collections import defaultdict
from decimal import Decimal

import pandas as pd
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import PerformanceData


class Command(BaseCommand):
    help = "Load sample CSV data from public/ folder into the database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear existing data before loading",
        )

    def handle(self, *args, **options):
        # Determine public folder path
        public_path = os.path.join(settings.BASE_DIR.parent, "public")
        if not os.path.exists(public_path):
            # Try frontend public path
            public_path = os.path.join(settings.BASE_DIR.parent, "frontend", "public")

        if not os.path.exists(public_path):
            self.stderr.write(self.style.ERROR(f"Public folder not found: {public_path}"))
            return

        self.stdout.write(f"Loading data from: {public_path}")

        # Aggregated data by (reference_date, department)
        aggregated_data = defaultdict(
            lambda: {
                "department_code": "",
                "revenue": Decimal("0"),
                "budget": Decimal("0"),
                "expenditure": Decimal("0"),
                "paper_count": 0,
                "patent_count": 0,
                "project_count": 0,
                "extra_metric_1": None,
                "extra_metric_2": None,
                "extra_text": "",
            }
        )

        # Load department KPI data
        kpi_file = os.path.join(public_path, "department_kpi.csv")
        if os.path.exists(kpi_file):
            self.load_department_kpi(kpi_file, aggregated_data)
        else:
            self.stdout.write(self.style.WARNING(f"File not found: {kpi_file}"))

        # Load publication data
        pub_file = os.path.join(public_path, "publication_list.csv")
        if os.path.exists(pub_file):
            self.load_publications(pub_file, aggregated_data)
        else:
            self.stdout.write(self.style.WARNING(f"File not found: {pub_file}"))

        # Load research project data
        project_file = os.path.join(public_path, "research_project_data.csv")
        if os.path.exists(project_file):
            self.load_research_projects(project_file, aggregated_data)
        else:
            self.stdout.write(self.style.WARNING(f"File not found: {project_file}"))

        # Save to database
        with transaction.atomic():
            if options["clear"]:
                deleted_count = PerformanceData.objects.all().delete()[0]
                self.stdout.write(f"Cleared {deleted_count} existing records")

            # Create PerformanceData objects
            objects_to_create = []
            for (ref_date, department), data in aggregated_data.items():
                obj = PerformanceData(
                    reference_date=ref_date,
                    department=department,
                    department_code=data["department_code"],
                    revenue=data["revenue"],
                    budget=data["budget"],
                    expenditure=data["expenditure"],
                    paper_count=data["paper_count"],
                    patent_count=data["patent_count"],
                    project_count=data["project_count"],
                    extra_metric_1=data["extra_metric_1"],
                    extra_metric_2=data["extra_metric_2"],
                    extra_text=data["extra_text"],
                )
                objects_to_create.append(obj)

            # Bulk create
            created = PerformanceData.objects.bulk_create(objects_to_create, batch_size=500)
            self.stdout.write(
                self.style.SUCCESS(f"Successfully created {len(created)} performance records")
            )

    def normalize_date(self, value) -> str:
        """Normalize date to YYYY-MM format."""
        if pd.isna(value):
            return ""

        val_str = str(value).strip()

        # YYYY format (year only)
        if len(val_str) == 4 and val_str.isdigit():
            return f"{val_str}-01"

        # YYYY-MM-DD format
        if len(val_str) >= 10 and "-" in val_str:
            parts = val_str.split("-")
            if len(parts) >= 2:
                return f"{parts[0]}-{parts[1].zfill(2)}"

        # YYYY.MM or YYYY/MM format
        for sep in [".", "/"]:
            if sep in val_str:
                parts = val_str.split(sep)
                if len(parts) >= 2:
                    return f"{parts[0]}-{parts[1].zfill(2)}"

        return val_str

    def load_department_kpi(self, filepath: str, aggregated_data: dict):
        """
        Load department KPI data.
        Columns: 평가년도, 단과대학, 학과, 졸업생 취업률 (%), 전임교원 수 (명),
                 초빙교원 수 (명), 연간 기술이전 수입액 (억원), 국제학술대회 개최 횟수
        """
        self.stdout.write(f"Loading: {filepath}")
        df = pd.read_csv(filepath, encoding="utf-8")

        for _, row in df.iterrows():
            ref_date = self.normalize_date(row.get("평가년도"))
            # Use 학과 as primary department, or 단과대학 as fallback
            department = str(row.get("학과", "")).strip()
            if not department:
                department = str(row.get("단과대학", "")).strip()

            if not ref_date or not department:
                continue

            key = (ref_date, department)

            # 연간 기술이전 수입액 (억원) -> convert to won (multiply by 100,000,000)
            revenue_억 = row.get("연간 기술이전 수입액 (억원)", 0)
            if pd.notna(revenue_억):
                aggregated_data[key]["revenue"] += Decimal(str(float(revenue_억) * 100000000))

            # 국제학술대회 개최 횟수 -> project_count
            conf_count = row.get("국제학술대회 개최 횟수", 0)
            if pd.notna(conf_count):
                aggregated_data[key]["project_count"] += int(conf_count)

            # Extra metrics
            employment_rate = row.get("졸업생 취업률 (%)")
            if pd.notna(employment_rate):
                aggregated_data[key]["extra_metric_1"] = Decimal(str(employment_rate))

            faculty_count = row.get("전임교원 수 (명)")
            if pd.notna(faculty_count):
                aggregated_data[key]["extra_metric_2"] = Decimal(str(faculty_count))

        self.stdout.write(f"  Loaded {len(df)} KPI records")

    def load_publications(self, filepath: str, aggregated_data: dict):
        """
        Load publication data - count papers by date and department.
        Columns: 논문ID, 게재일, 단과대학, 학과, 논문제목, 주저자, 참여저자, 학술지명, 저널등급, Impact Factor, 과제연계여부
        """
        self.stdout.write(f"Loading: {filepath}")
        df = pd.read_csv(filepath, encoding="utf-8")

        for _, row in df.iterrows():
            ref_date = self.normalize_date(row.get("게재일"))
            # Use 학과 as primary department
            department = str(row.get("학과", "")).strip()
            if not department:
                department = str(row.get("단과대학", "")).strip()

            if not ref_date or not department:
                continue

            key = (ref_date, department)

            # Each row is one paper
            aggregated_data[key]["paper_count"] += 1

        self.stdout.write(f"  Loaded {len(df)} publication records")

    def load_research_projects(self, filepath: str, aggregated_data: dict):
        """
        Load research project data.
        Columns: 집행ID, 과제번호, 과제명, 연구책임자, 소속학과, 지원기관, 총연구비, 집행일자, 집행항목, 집행금액, 상태, 비고
        """
        self.stdout.write(f"Loading: {filepath}")
        df = pd.read_csv(filepath, encoding="utf-8")

        # Track unique projects per date/department
        project_tracker = defaultdict(set)

        for _, row in df.iterrows():
            ref_date = self.normalize_date(row.get("집행일자"))
            department = str(row.get("소속학과", "")).strip()

            if not ref_date or not department:
                continue

            key = (ref_date, department)

            # 총연구비 -> budget
            budget = row.get("총연구비", 0)
            if pd.notna(budget):
                # Only add budget once per unique project
                project_id = row.get("과제번호", "")
                if project_id not in project_tracker[key]:
                    aggregated_data[key]["budget"] += Decimal(str(budget))
                    project_tracker[key].add(project_id)

            # 집행금액 -> expenditure
            expenditure = row.get("집행금액", 0)
            if pd.notna(expenditure):
                aggregated_data[key]["expenditure"] += Decimal(str(expenditure))

        self.stdout.write(f"  Loaded {len(df)} project execution records")
