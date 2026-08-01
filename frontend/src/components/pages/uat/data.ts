/** بيانات نموذج تقييم القبول (UAT) — مطابقة لـ UAT.md بجذر المستودع. */

export interface UatScenario {
  id: string;
  title: string;
  role?: string;
  expected: string;
}

export interface UatSection {
  key: string;
  title: string;
  scenarios: UatScenario[];
}

export const UAT_SECTIONS: UatSection[] = [
  {
    key: "public",
    title: "1) الزائر العام (بدون دخول)",
    scenarios: [
      { id: "1.1", title: "فتح /", expected: "قسم «مشاريع المنصّة» يعرض 3 مشاريع بألوان هويتها + الخدمات والإحصاءات" },
      { id: "1.2", title: "فتح /projects/saqya و /projects/tafaqqadhum و /projects/takaful-athar", expected: "صفحة هبوط لكل مشروع: الهوية + الأدوات المفعّلة فقط" },
      { id: "1.3", title: "فتح /map", expected: "المجمّع الموحّد: KPI مجمّعة + فلترة بالمشروع + فلاتر ديناميكية + وسيلة إيضاح + «ساهم هنا» من العنصر المحدد" },
      { id: "1.4", title: "فتح /projects/tafaqqadhum/map", expected: "20 عنصراً (12 منطقة + 8 منافذ)، فلاتر ديناميكية (النوع/الأولوية/نوع المنفذ/المنتج)" },
      { id: "1.5", title: "النقر على عنصر في الخريطة", expected: "بطاقة تفاصيل بدون «ساعات العمل (داخلي)» و«الأسر المستهدفة (داخلي)»" },
      { id: "1.6", title: "إرسال تعهد من الخريطة (اسم + 05XXXXXXXX + كمية)", expected: "«تم استلام تعهدكم بنجاح» وحالته pending" },
      { id: "1.7", title: "فتح /saqya القديم", expected: "تحويل تلقائي إلى /projects/saqya/sponsorships" },
      { id: "1.8", title: "نموذج سقيا المسجد /services/water-supply والاقتراحات /suggest", expected: "تعمل كما قبل إعادة الهيكلة" },
    ],
  },
  {
    key: "sponsorships",
    title: "2) أداة الكفالات (sponsorships)",
    scenarios: [
      { id: "2.1", title: "إنشاء كفالة", role: "uat_donor", expected: "تُنشأ بحالة pending" },
      { id: "2.2", title: "اعتماد الكفالة → إسناد الطلب لمورّد ومندوب", role: "admin", expected: "Order ينتقل pending→assigned" },
      { id: "2.3", title: "تحضير → جاهز", role: "uat_supplier", expected: "إشعار للمندوب" },
      { id: "2.4", title: "تسليم + رفع توثيق بملف وGPS", role: "uat_rep", expected: "يُرفع في مسار خاص ولا يُفتح إلا لمصرّح" },
      { id: "2.5", title: "دفع جزئي ثم محاولة دفع يتجاوز المتبقي", role: "uat_donor", expected: "الثاني يُرفض «المبلغ يتجاوز المتبقّي»" },
      { id: "2.6", title: "اكتمال التمويل", expected: "الحالة تنتقل تلقائياً إلى in_progress" },
    ],
  },
  {
    key: "maps",
    title: "3) أداة الخرائط (maps) — الأدمن",
    scenarios: [
      { id: "3.1", title: "/Admin/maps: إنشاء خريطة جديدة لمشروع", role: "admin", expected: "تُنشأ (المشرف العام فقط)" },
      { id: "3.2", title: "نفس المحاولة", role: "uat_pm", expected: "مرفوضة 403 (provisioning للمشرف العام)" },
      { id: "3.3", title: "إضافة طبقة خاصة + حقل select بخيارات + حقل غير عام", role: "admin/uat_pm", expected: "تظهر في الأدمن ولا تظهر للعامة" },
      { id: "3.4", title: "إضافة عنصر من النموذج الديناميكي بقيمة select خارج الخيارات", expected: "رفض 400 برسالة عربية" },
      { id: "3.5", title: "اعتماد → تنفيذ تعهد (من 1.6)", role: "uat_pm", expected: "الحالة تتغير والملخص العام يعكسها (مع إخفاء <5)" },
      { id: "3.6", title: "نشر/إلغاء نشر الخريطة", role: "admin", expected: "تختفي/تظهر في /map العام" },
    ],
  },
  {
    key: "admin",
    title: "4) لوحة الأدمن الموحّدة (role-scoped)",
    scenarios: [
      { id: "4.1", title: "/Admin/projects", role: "admin", expected: "كل المشاريع + إنشاء مشروع + تفعيل أدوات + إدارة أعضاء" },
      { id: "4.2", title: "/Admin/projects", role: "uat_pm (دخول عبر /signin)", expected: "مشروع «تفقدهم» فقط، بلا تبويبات المنصّة القديمة" },
      { id: "4.3", title: "/Admin/maps", role: "uat_pm", expected: "خرائط «تفقدهم» فقط" },
      { id: "4.4", title: "/Admin و /Admin/management …", role: "uat_pm", expected: "غير مرئية/403 (للمشرف العام فقط)" },
      { id: "4.5", title: "/Admin/map القديم", role: "admin", expected: "تحويل تلقائي إلى /Admin/maps" },
    ],
  },
  {
    key: "legacy",
    title: "5) أدوات التطوع والخدمات والتقارير (بلا تغيير سلوكي)",
    scenarios: [
      { id: "5.1", title: "طلبات الانضمام/التطوع والقبول والمهام (/Admin/*, /user/*)", expected: "كما قبل إعادة الهيكلة" },
      { id: "5.2", title: "طلب خدمة عام + إدارتها", expected: "كما قبل" },
      { id: "5.3", title: "توليد تقرير شامل من /Admin/reports", expected: "يعمل" },
      { id: "5.4", title: "اللوحة التنفيذية /Admin/executive (والقديم /executive يحوّل إليها)", expected: "تعمل لطاقم المؤسسة فقط (admin/manager/employee)؛ الزائر → دخول/403" },
      { id: "5.5", title: "الدخول الموحّد /signin لكل الأدوار (و/admin/signin يحوّل إليه)", expected: "admin → /Admin · مدير مشروع → /Admin/projects · متطوع → /user/main" },
      { id: "5.6", title: "تسجيل مستخدم جديد + دخول/خروج JWT", expected: "بلا أي تغيير" },
    ],
  },
  {
    key: "integrity",
    title: "6) سلامة البيانات (نهاية الجلسة)",
    scenarios: [
      {
        id: "6.1",
        title: "manage.py check_migration_integrity --expect migrated",
        expected: "«سلامة البيانات مؤكدة — لا اختلالات» — أي اختلال = ❌ فوري وإيقاف التجربة",
      },
    ],
  },
];

export const UAT_ACCOUNTS = [
  { email: "admin@takaful.com", password: "admin123", label: "المشرف العام" },
  { email: "uat_pm@takaful.com", password: "Uat12345!", label: "مدير مشروع «تفقدهم» (عبر /signin)" },
  { email: "uat_donor@takaful.com", password: "Uat12345!", label: "متبرّع" },
  { email: "uat_supplier@takaful.com", password: "Uat12345!", label: "مورّد" },
  { email: "uat_rep@takaful.com", password: "Uat12345!", label: "مندوب" },
];
