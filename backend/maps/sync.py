"""
sync_impact_map_to_maps — REMOVED in Phase A1 (DECISIONS.md D-23).

maps is now the single source of truth. Use `seed_impact_map` to populate
the tafaqqadhum map directly, or manage data via /api/map/* and /api/maps/*.
"""
MAP_TITLE = "خارطة تفقدهم"
PROJECT_SLUG = "tafaqqadhum"
SOURCE_PREFIX = "impact_map:"


def sync_impact_map_to_maps(apps=None) -> dict:
    raise RuntimeError(
        "sync_impact_map_to_maps was removed in Phase A1 — "
        "maps is the single source of truth. Use seed_impact_map instead."
    )
