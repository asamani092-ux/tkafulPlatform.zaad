"""
استيراد بيانات «كفالات السقيا» (المشروع الثالث Flask) من ملف تصدير JSON إلى وحدة saqya.

idempotent عبر (external_source='saqya', external_id). يتضمّن **استراتيجية دمج صارمة**
للمستخدمين: إذا تطابق email أو phone مع مستخدم موحّد قائم، يُدمج الملف وتُربط كفالاته
بالمستخدم الحالي بدل التكرار أو الفشل.

صيغة JSON المتوقّعة (مفاتيح اختيارية):
{
  "users":[{id,name,email,phone,role,password?}],
  "suppliers":[{id,user_id,business_name,specialization,address}],
  "representatives":[{id,user_id,area}],
  "sponsorships":[{id,donor_id,amount,type,description,location,beneficiaries_count,status,priority}],
  "orders":[{id,sponsorship_id,supplier_id,representative_id,items,estimated_cost,status}],
  "invoices":[{id,order_id,invoice_number,amount,tax_amount,total_amount,status}],
  "payments":[{id,sponsorship_id,amount,method,status}],
  "documentation":[{id,order_id,type,title,file_name,latitude,longitude,uploaded_by}]
}

التعقيد: O(R) مع بحث مفهرس O(1) لكل صف (email/external_id)، ومكان O(U+S+O) لخرائط الربط.
"""
import json
import os

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db import transaction

from accounts.models import Profile
from saqya.models import (
    SupplierProfile, RepresentativeProfile, Sponsorship, Order, Invoice, Payment, Documentation,
)
from integrations.base import BaseImporter

SOURCE = "saqya"
ROLE_MAP = {"admin": "admin", "supplier": "supplier", "representative": "representative", "donor": "donor"}


def norm(v):
    return (v or "").strip().lower()


class SaqyaImporter(BaseImporter):
    source = SOURCE

    def __init__(self):
        super().__init__(self.source)
        self.user_map = {}
        self.sponsorship_map = {}
        self.order_map = {}
        self.created_users = 0
        self.merged_users = 0

    # ---- استراتيجية الدمج للمستخدمين ----
    def get_or_merge_user(self, row):
        email = norm(row.get("email"))
        phone = (row.get("phone") or "").strip()
        user = User.objects.filter(email__iexact=email).first() if email else None
        if not user and phone:
            prof = Profile.objects.filter(phone=phone).first()
            user = prof.user if prof else None

        if user:
            # دمج: تعبئة الحقول الناقصة فقط دون استبدال القائم
            p = user.profile
            if not p.name:
                p.name = row.get("name", "")
            if not p.phone and phone:
                p.phone = phone
            # لا نخفّض دور مستخدم قائم (مثل admin)؛ نضبط الدور فقط إن كان غير محدّد
            if p.role in ("", "user") and row.get("role") in ROLE_MAP:
                p.role = ROLE_MAP[row["role"]]
            p.save()
            self.merged_users += 1
            return user

        # إنشاء جديد (كلمة مرور غير صالحة + إجبار إعادة تعيين — صيغ hash مختلفة)
        username = email or f"saqya_user_{row.get('id')}"
        user = User.objects.create(username=username, email=email, first_name=row.get("name", ""))
        user.set_unusable_password()
        user.save()
        p = user.profile
        p.name = row.get("name", "")
        p.phone = phone
        p.role = ROLE_MAP.get(row.get("role"), "donor")
        p.must_reset_password = True
        p.external_source = SOURCE
        p.external_id = str(row.get("id"))
        p.save()
        self.created_users += 1
        return user

    @transaction.atomic
    def run(self, data):
        for row in data.get("users", []):
            self.user_map[str(row.get("id"))] = self.get_or_merge_user(row)

        for row in data.get("suppliers", []):
            u = self.user_map.get(str(row.get("user_id")))
            if u:
                self.upsert(SupplierProfile, external_id=row.get("id"), defaults={
                    "user": u, "business_name": row.get("business_name", ""),
                    "specialization": row.get("specialization", ""), "address": row.get("address", ""),
                })

        for row in data.get("representatives", []):
            u = self.user_map.get(str(row.get("user_id")))
            if u:
                self.upsert(RepresentativeProfile, external_id=row.get("id"), defaults={
                    "user": u, "area": row.get("area", ""),
                })

        for row in data.get("sponsorships", []):
            donor = self.user_map.get(str(row.get("donor_id")))
            if not donor:
                continue
            obj, _ = self.upsert(Sponsorship, external_id=row.get("id"), defaults={
                "donor": donor, "amount": row.get("amount") or 0, "type": row.get("type", ""),
                "description": row.get("description", ""), "location": row.get("location", ""),
                "beneficiaries_count": row.get("beneficiaries_count", 1),
                "status": row.get("status", "pending"), "priority": row.get("priority", "normal"),
            })
            self.sponsorship_map[str(row.get("id"))] = obj

        for row in data.get("orders", []):
            sp = self.sponsorship_map.get(str(row.get("sponsorship_id")))
            if not sp:
                continue
            obj, _ = self.upsert(Order, external_id=row.get("id"), defaults={
                "sponsorship": sp,
                "supplier": self.user_map.get(str(row.get("supplier_id"))),
                "representative": self.user_map.get(str(row.get("representative_id"))),
                "items": row.get("items") or [],
                "estimated_cost": row.get("estimated_cost"),
                "status": row.get("status", "pending"),
            })
            self.order_map[str(row.get("id"))] = obj

        for row in data.get("invoices", []):
            order = self.order_map.get(str(row.get("order_id")))
            if order:
                self.upsert(Invoice, external_id=row.get("id"), defaults={
                    "order": order, "invoice_number": row.get("invoice_number") or f"saqya-{row.get('id')}",
                    "amount": row.get("amount") or 0, "tax_amount": row.get("tax_amount") or 0,
                    "total_amount": row.get("total_amount") or row.get("amount") or 0,
                    "status": row.get("status", "pending"),
                })

        for row in data.get("payments", []):
            sp = self.sponsorship_map.get(str(row.get("sponsorship_id")))
            if sp:
                self.upsert(Payment, external_id=row.get("id"), defaults={
                    "sponsorship": sp, "amount": row.get("amount") or 0,
                    "method": row.get("method", "online"), "status": row.get("status", "completed"),
                })

        for row in data.get("documentation", []):
            order = self.order_map.get(str(row.get("order_id")))
            if order:
                self.upsert(Documentation, external_id=row.get("id"), defaults={
                    "order": order, "type": row.get("type", "document"),
                    "title": row.get("title", ""), "file_name": row.get("file_name", ""),
                    "latitude": row.get("latitude"), "longitude": row.get("longitude"),
                    "uploaded_by": self.user_map.get(str(row.get("uploaded_by"))),
                })

        return {"created_users": self.created_users, "merged_users": self.merged_users, **self.stats}


class Command(BaseCommand):
    help = "استيراد بيانات كفالات السقيا من JSON (idempotent + دمج المستخدمين بالبريد/الجوال)"

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True)

    def handle(self, *args, **options):
        path = options["file"]
        if not os.path.exists(path):
            self.stderr.write(self.style.ERROR(f"File not found: {path}"))
            return
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        stats = SaqyaImporter().run(data)
        self.stdout.write(self.style.SUCCESS(f"Saqya import done: {stats}"))
