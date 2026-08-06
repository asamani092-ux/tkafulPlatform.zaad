import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import UserShell from "../../layout/UserShell";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import DetailCard from "../../ui/DetailCard";
import Drawer from "../../ui/Drawer";
import Breadcrumb from "../../ui/Breadcrumb";
import Skeleton from "../../ui/Skeleton";

interface Profile {
  name: string; gender: string; age: string; city: string; phone: string;
  email: string; qualification: string; joinDate: string;
}

const EMPTY: Profile = { name: "", gender: "", age: "", city: "", phone: "", email: "", qualification: "", joinDate: "" };

export default function PersonalInfo() {
  const { access, isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const [data, setData] = useState<Profile>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const mapMe = (d: Record<string, any>): Profile => ({
    name: d.profile?.name || "", gender: d.profile?.gender || "", age: d.profile?.age?.toString() || "",
    city: d.profile?.city || "", phone: d.profile?.phone || "", email: d.email || "",
    qualification: d.profile?.qualification || "",
    joinDate: d.profile?.created_at ? new Date(d.profile.created_at).toLocaleDateString("ar-SA") : "",
  });

  const load = () => {
    authFetch(`/api/accounts/me/`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => d && setData(mapMe(d))).catch(() => {}).finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAuthenticated && access) load(); else setLoading(false); }, [isAuthenticated, access]);

  const save = async () => {
    try {
      const res = await authFetch(`/api/accounts/profile/`, {
        method: "PUT",
        body: JSON.stringify({ name: data.name, gender: data.gender, age: parseInt(data.age) || null, city: data.city, phone: data.phone, qualification: data.qualification }),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم حفظ التغييرات بنجاح" });
      setEditing(false);
      load();
    } catch { error({ title: "حدث خطأ", description: "تعذّر حفظ التغييرات" }); }
  };

  if (loading) {
    return (
      <UserShell>
        <Skeleton lines={6} height="var(--space-10)" />
      </UserShell>
    );
  }

  return (
    <UserShell>
      <Breadcrumb items={[{ label: "لوحتي", href: "/user/main" }, { label: "معلوماتي" }]} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">المعلومات الشخصية</h1>
        <Button onClick={() => setEditing(true)}>تعديل</Button>
      </div>
      <DetailCard
        title="بطاقة العرض التفصيلي"
        fields={[
          { label: "الاسم", value: data.name },
          { label: "الجنس", value: data.gender },
          { label: "العمر", value: data.age },
          { label: "المدينة", value: data.city },
          { label: "رقم الجوال", value: data.phone },
          { label: "المؤهل", value: data.qualification },
          { label: "البريد الإلكتروني", value: data.email },
          { label: "تاريخ الإنضمام", value: data.joinDate },
        ]}
      />

      <Drawer
        open={editing}
        onClose={() => { setEditing(false); load(); }}
        title="تعديل الملف الشخصي"
        footer={
          <div className="flex gap-2">
            <Button onClick={save}>حفظ</Button>
            <Button variant="secondary" onClick={() => { setEditing(false); load(); }}>إلغاء</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Input label="الاسم" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
          <Select label="الجنس" value={data.gender} onChange={(e) => setData({ ...data, gender: e.target.value })}>
            <option value="">غير محدد</option><option value="ذكر">ذكر</option><option value="أنثى">أنثى</option>
          </Select>
          <Input type="number" label="العمر" value={data.age} onChange={(e) => setData({ ...data, age: e.target.value })} />
          <Input label="المدينة" value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} />
          <Input dir="ltr" label="رقم الجوال" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
          <Input label="المؤهل" value={data.qualification} onChange={(e) => setData({ ...data, qualification: e.target.value })} />
          <Input dir="ltr" label="البريد الإلكتروني" value={data.email} disabled />
          <Input label="تاريخ الإنضمام" value={data.joinDate} disabled />
        </div>
      </Drawer>
    </UserShell>
  );
}
