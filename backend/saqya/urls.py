from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"sponsorships", views.SponsorshipViewSet, basename="saqya-sponsorship")
router.register(r"orders", views.OrderViewSet, basename="saqya-order")
router.register(r"invoices", views.InvoiceViewSet, basename="saqya-invoice")
router.register(r"documentation", views.DocumentationViewSet, basename="saqya-documentation")
router.register(r"payments", views.PaymentViewSet, basename="saqya-payment")
router.register(r"suppliers", views.SupplierProfileViewSet, basename="saqya-supplier")
router.register(r"representatives", views.RepresentativeProfileViewSet, basename="saqya-representative")

urlpatterns = [
    path("dashboard/", views.saqya_dashboard, name="saqya-dashboard"),
    path("map/", views.saqya_map, name="saqya-map"),
    path("invoices/<int:pk>/file/", views.serve_invoice_file, name="saqya-invoice-file"),
    path("documentation/<int:pk>/file/", views.serve_documentation_file, name="saqya-documentation-file"),
    path("", include(router.urls)),
]
