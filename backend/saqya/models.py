"""
Minimal shim for saqya migration history only (D-24).
saqya/migrations/0001_initial.py references invoice_upload_path and documentation_upload_path.
"""
from sponsorships.models import documentation_upload_path, invoice_upload_path  # noqa: F401
