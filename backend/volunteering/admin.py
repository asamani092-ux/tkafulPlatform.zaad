from django.contrib import admin
from .models import Project, Service, Suggestion, Volunteer, AdminReport, VolunteerApplication

admin.site.register(Project)
admin.site.register(Service)
admin.site.register(Suggestion)
admin.site.register(Volunteer)
admin.site.register(AdminReport)
admin.site.register(VolunteerApplication)
