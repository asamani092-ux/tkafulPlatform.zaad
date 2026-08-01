"""
shim توافق: نماذج takaful_app انتقلت إلى تطبيق volunteering (D-02).
تبقى الاستيرادات لثبات الواجهات القديمة (analytics.import_gas_data وغيرها).
لا تضف نماذج جديدة هنا.
"""
from volunteering.models import (  # noqa: F401
    AdminReport,
    DepartmentHours,
    Project,
    ProjectAssignment,
    QuarterlyTarget,
    Service,
    ServiceRequest,
    ServiceVolunteerApplication,
    Subtask,
    Suggestion,
    Task,
    TopVolunteer,
    Volunteer,
    VolunteerApplication,
    VolunteerStatistics,
    WaterSupplyRequest,
)
