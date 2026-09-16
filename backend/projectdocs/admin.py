from django.contrib import admin

from .models import (
    ApprovalRequest,
    DossierAttachment,
    DossierSection,
    DossierStage,
    ProjectDossier,
    StageActivity,
)


@admin.register(ProjectDossier)
class ProjectDossierAdmin(admin.ModelAdmin):
    list_display = ("code", "project", "current_stage", "status", "sponsor_email", "manager")
    search_fields = ("code", "project__name", "sponsor_email")
    list_filter = ("status", "current_stage")


admin.site.register(DossierSection)
admin.site.register(DossierStage)
admin.site.register(StageActivity)
admin.site.register(ApprovalRequest)
admin.site.register(DossierAttachment)
