from django.contrib import admin

from .models import Project, ProjectMember, ProjectTool


class ProjectToolInline(admin.TabularInline):
    model = ProjectTool
    extra = 0


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "status", "is_active", "is_featured", "featured_order", "created_at")
    search_fields = ("name", "slug")
    list_filter = ("status", "is_active", "is_featured")
    list_editable = ("is_featured", "featured_order")
    inlines = [ProjectToolInline, ProjectMemberInline]


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ("project", "user", "role")
    list_filter = ("role",)


@admin.register(ProjectTool)
class ProjectToolAdmin(admin.ModelAdmin):
    list_display = ("project", "tool_key", "is_enabled")
    list_filter = ("tool_key", "is_enabled")
