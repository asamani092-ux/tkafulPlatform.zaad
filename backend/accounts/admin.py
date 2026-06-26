from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user_email', 'name', 'role', 'gender', 'age', 'city', 'phone', 'created_at']
    list_filter = ['role', 'gender', 'city', 'qualification']
    search_fields = ['user__email', 'name', 'phone', 'city']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('User Account', {
            'fields': ('user',)
        }),
        ('Role & Access', {
            'fields': ('role',)
        }),
        ('Personal Information', {
            'fields': ('name', 'gender', 'age', 'phone', 'city', 'qualification')
        }),
        ('Skills & Availability', {
            'fields': ('skills', 'available_days')
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'