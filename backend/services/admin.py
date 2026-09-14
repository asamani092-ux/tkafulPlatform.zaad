from django.contrib import admin
from .models import Service, Suggestion, WaterSupplyRequest

admin.site.register(Service)
admin.site.register(Suggestion)
admin.site.register(WaterSupplyRequest)
