"""
حذف نماذج impact_map بعد نسخ البيانات إلى maps (Phase A1 — D-23).
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("maps", "0003_mapproduct_mapdistributionrecord"),
        ("impact_map", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(name="DistributionRecord"),
        migrations.DeleteModel(name="Contribution"),
        migrations.DeleteModel(name="Outlet"),
        migrations.DeleteModel(name="Product"),
        migrations.DeleteModel(name="Region"),
    ]
