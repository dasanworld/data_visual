"""
Pytest configuration and fixtures for backend tests.

- Factory patterns for test data generation
- Django database fixtures
- Timezone-aware fixtures
"""

import pytest
from django.contrib.auth.models import User
from django.utils import timezone

import factory
from factory.django import DjangoModelFactory

from api.models import PerformanceData, UploadLog


# =============================================================================
# Factory Definitions
# =============================================================================


class UserFactory(DjangoModelFactory):
    """Factory for creating test users."""

    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"testuser{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@test.com")
    password = factory.PostGenerationMethodCall("set_password", "testpass123")
    is_active = True


class AdminUserFactory(UserFactory):
    """Factory for creating admin/staff users."""

    is_staff = True
    is_superuser = False
    username = factory.Sequence(lambda n: f"admin{n}")


class PerformanceDataFactory(DjangoModelFactory):
    """Factory for creating test performance data."""

    class Meta:
        model = PerformanceData

    reference_date = "2024-01"
    department = factory.Sequence(lambda n: f"부서{n}")
    department_code = factory.Sequence(lambda n: f"DEPT{n:03d}")
    revenue = factory.Faker("pydecimal", left_digits=10, right_digits=2, positive=True)
    budget = factory.Faker("pydecimal", left_digits=10, right_digits=2, positive=True)
    expenditure = factory.Faker(
        "pydecimal", left_digits=10, right_digits=2, positive=True
    )
    paper_count = factory.Faker("pyint", min_value=0, max_value=50)
    patent_count = factory.Faker("pyint", min_value=0, max_value=10)
    project_count = factory.Faker("pyint", min_value=0, max_value=20)


class UploadLogFactory(DjangoModelFactory):
    """Factory for creating upload log entries."""

    class Meta:
        model = UploadLog

    reference_date = "2024-01"
    filename = factory.Sequence(lambda n: f"test_upload_{n}.xlsx")
    row_count = factory.Faker("pyint", min_value=1, max_value=1000)
    status = "success"
    uploaded_by = factory.SubFactory(AdminUserFactory)


# =============================================================================
# Pytest Fixtures
# =============================================================================


@pytest.fixture
def user(db):
    """Create a regular test user."""
    return UserFactory()


@pytest.fixture
def admin_user(db):
    """Create an admin/staff test user."""
    return AdminUserFactory()


@pytest.fixture
def authenticated_client(client, user):
    """Return a Django test client logged in as a regular user."""
    client.force_login(user)
    return client


@pytest.fixture
def admin_client(client, admin_user):
    """Return a Django test client logged in as an admin user."""
    client.force_login(admin_user)
    return client


@pytest.fixture
def performance_data(db):
    """Create a single performance data record."""
    return PerformanceDataFactory()


@pytest.fixture
def performance_data_batch(db):
    """Create a batch of performance data records for testing."""
    return PerformanceDataFactory.create_batch(10, reference_date="2024-01")


@pytest.fixture
def multiple_months_data(db):
    """Create performance data across multiple months."""
    data = []
    for month in ["2024-01", "2024-02", "2024-03"]:
        data.extend(PerformanceDataFactory.create_batch(5, reference_date=month))
    return data


@pytest.fixture
def upload_log(db, admin_user):
    """Create an upload log entry."""
    return UploadLogFactory(uploaded_by=admin_user)


@pytest.fixture
def seoul_timezone():
    """Return Seoul timezone for consistent testing."""
    import zoneinfo

    return zoneinfo.ZoneInfo("Asia/Seoul")


@pytest.fixture
def now_seoul(seoul_timezone):
    """Return current time in Seoul timezone."""
    return timezone.now().astimezone(seoul_timezone)
