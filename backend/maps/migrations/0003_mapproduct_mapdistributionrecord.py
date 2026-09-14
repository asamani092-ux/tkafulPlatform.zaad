"""
هجرة Phase A1: MapProduct + MapDistributionRecord مع نسخ بيانات impact_map.
"""
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


SOURCE_PREFIX = "impact_map:"
MAP_TITLE = "خارطة تفقدهم"
PROJECT_SLUG = "tafaqqadhum"


def _find_region_item(MapItem, map_obj, region):
    """مطابقة منطقة impact_map بعنصر MapItem عبر slug أو الاسم."""
    slug = region.slug
    item = MapItem.objects.filter(map=map_obj, data__kind="region", data__slug=slug).first()
    if item:
        return item
    return MapItem.objects.filter(map=map_obj, data__kind="region", name=region.name).first()


def forward(apps, schema_editor):
    Project = apps.get_model("projects", "Project")
    Map = apps.get_model("maps", "Map")
    MapItem = apps.get_model("maps", "MapItem")
    MapProduct = apps.get_model("maps", "MapProduct")
    MapDistributionRecord = apps.get_model("maps", "MapDistributionRecord")
    Product = apps.get_model("impact_map", "Product")
    DistributionRecord = apps.get_model("impact_map", "DistributionRecord")
    Outlet = apps.get_model("impact_map", "Outlet")

    project = Project.objects.filter(slug=PROJECT_SLUG).first()
    if project is None:
        return
    map_obj = Map.objects.filter(project=project, title=MAP_TITLE).first()
    if map_obj is None:
        return

    product_by_old_id = {}
    for p in Product.objects.all().order_by("order", "name"):
        ref = f"{SOURCE_PREFIX}product:{p.id}"
        mp, _ = MapProduct.objects.update_or_create(
            map=map_obj,
            slug=p.slug,
            defaults={
                "name": p.name,
                "icon": p.icon or "",
                "season": p.season,
                "target_families": p.target_families,
                "is_active": p.is_active,
                "order": p.order,
                "external_id": ref,
            },
        )
        product_by_old_id[p.id] = mp

    region_by_old_id = {}
    for region in apps.get_model("impact_map", "Region").objects.all():
        item = _find_region_item(MapItem, map_obj, region)
        if item:
            region_by_old_id[region.id] = item

    for outlet in Outlet.objects.select_related("region").all():
        item = MapItem.objects.filter(
            map=map_obj, data__kind="outlet", name=outlet.name
        ).first()
        if item and outlet.region_id:
            data = dict(item.data or {})
            data["region_slug"] = outlet.region.slug
            item.data = data
            item.save(update_fields=["data"])

    for dr in DistributionRecord.objects.select_related("region", "product").all():
        region_item = region_by_old_id.get(dr.region_id)
        product = product_by_old_id.get(dr.product_id)
        if region_item is None or product is None:
            continue
        ref = f"{SOURCE_PREFIX}distribution:{dr.id}"
        MapDistributionRecord.objects.update_or_create(
            map=map_obj,
            external_id=ref,
            defaults={
                "region_item": region_item,
                "product": product,
                "families_served": dr.families_served,
                "quantity_distributed": dr.quantity_distributed,
                "recorded_by_id": dr.recorded_by_id,
                "date": dr.date,
            },
        )


def backward(apps, schema_editor):
    MapProduct = apps.get_model("maps", "MapProduct")
    MapDistributionRecord = apps.get_model("maps", "MapDistributionRecord")
    MapProduct.objects.filter(external_id__startswith=SOURCE_PREFIX).delete()
    MapDistributionRecord.objects.filter(external_id__startswith=SOURCE_PREFIX).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("maps", "0002_migrate_impact_map"),
        ("impact_map", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="MapProduct",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("slug", models.SlugField(max_length=120)),
                ("icon", models.CharField(blank=True, max_length=50)),
                ("season", models.CharField(blank=True, max_length=50, null=True)),
                ("target_families", models.IntegerField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("order", models.IntegerField(default=0)),
                ("external_id", models.CharField(blank=True, default="", max_length=100)),
                ("map", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="products", to="maps.map")),
            ],
            options={
                "ordering": ["map", "order", "name"],
            },
        ),
        migrations.CreateModel(
            name="MapDistributionRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("families_served", models.IntegerField()),
                ("quantity_distributed", models.IntegerField()),
                ("date", models.DateField()),
                ("external_id", models.CharField(blank=True, default="", max_length=100)),
                ("map", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="distribution_records", to="maps.map")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="distribution_records", to="maps.mapproduct")),
                ("recorded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="map_distributions", to=settings.AUTH_USER_MODEL)),
                ("region_item", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="distribution_records", to="maps.mapitem")),
            ],
            options={
                "ordering": ["-date"],
            },
        ),
        migrations.AddIndex(
            model_name="mapproduct",
            index=models.Index(fields=["map", "is_active"], name="maps_mappro_map_id_6f8a2a_idx"),
        ),
        migrations.AddConstraint(
            model_name="mapproduct",
            constraint=models.UniqueConstraint(fields=("map", "slug"), name="uq_map_product_slug"),
        ),
        migrations.AddIndex(
            model_name="mapdistributionrecord",
            index=models.Index(fields=["map", "date"], name="maps_mapdis_map_id_91c4e1_idx"),
        ),
        migrations.AddIndex(
            model_name="mapdistributionrecord",
            index=models.Index(fields=["map", "external_id"], name="maps_mapdis_map_id_2b7f3c_idx"),
        ),
        migrations.RunPython(forward, backward),
    ]
