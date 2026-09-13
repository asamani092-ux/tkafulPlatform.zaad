import { useEffect, useState } from "react";
import { ChevronLeft, KeyRound, UserRound } from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";
import { authFetch } from "../../../lib/api";
import { passwordErrorsToAr } from "../../../utils/passwordErrors";
import UserShell from "../../layout/UserShell";
import Card from "../../ui/Card";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import Modal from "../../ui/Modal";

interface Profile {
  name: string;
  gender: string;
  age: string;
  city: string;
  phone: string;
  email: string;
  qualification: string;
  joinDate: string;
}

const EMPTY: Profile = {
  name: "",
  gender: "",
  age: "",
  city: "",
  phone: "",
  email: "",
  qualification: "",
  joinDate: "",
};

type ModalKind = "profile" | "password" | null;

export default function UserSettings() {
  const { success, error } = useToast();
  const [openModal, setOpenModal] = useState<ModalKind>(null);

  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const mapMe = (d: Record<string, unknown>): Profile => {
    const p = (d.profile || {}) as Record<string, unknown>;
    return {
      name: String(p.name || ""),
      gender: String(p.gender || ""),
      age: p.age != null ? String(p.age) : "",
      city: String(p.city || ""),
      phone: String(p.phone || ""),
      email: String(d.email || ""),
      qualification: String(p.qualification || ""),
      joinDate: p.created_at
        ? new Date(String(p.created_at)).toLocaleDateString("ar-SA")
        : "",
    };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open
  useEffect(() => {
    if (openModal !== "profile") return;
    let cancelled = false;
    setProfileLoading(true);
    authFetch(`/api/accounts/me/`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setProfile(mapMe(d));
      })
      .catch(() => {
        if (!cancelled) error({ title: "تعذّر تحميل البيانات" });
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openModal]);

  const closeModal = () => {
    setOpenModal(null);
    setNewPassword("");
    setConfirm("");
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await authFetch(`/api/accounts/profile/`, {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name,
          gender: profile.gender,
          age: parseInt(profile.age, 10) || null,
          city: profile.city,
          phone: profile.phone,
          qualification: profile.qualification,
        }),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم حفظ التغييرات بنجاح" });
      closeModal();
    } catch {
      error({ title: "حدث خطأ", description: "تعذّر حفظ التغييرات" });
    } finally {
      setProfileSaving(false);
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      error({ title: "كلمة المرور قصيرة", description: "8 أحرف على الأقل" });
      return;
    }
    if (newPassword !== confirm) {
      error({ title: "غير متطابقة", description: "تأكيد كلمة المرور لا يطابق" });
      return;
    }
    setPasswordSubmitting(true);
    try {
      const res = await authFetch(`/api/accounts/change-password/`, {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        error({
          title: "تعذّر التحديث",
          description: passwordErrorsToAr(
            (data as { detail?: unknown; new_password?: unknown }).detail
              ?? (data as { new_password?: unknown }).new_password
              ?? data,
          ),
        });
      } else {
        success({ title: "تم تحديث كلمة المرور بنجاح" });
        closeModal();
      }
    } catch {
      error({ title: "خطأ في الاتصال" });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <UserShell>
      <h1 className="mb-4 text-2xl font-bold text-primary">الإعدادات</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer transition hover:border-primary/40"
          role="button"
          tabIndex={0}
          onClick={() => setOpenModal("profile")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenModal("profile");
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                <UserRound size={22} aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-primary">تحديث البيانات</h2>
                <p className="mt-1 text-sm text-brand-gray">تعديل الاسم والجوال والمدينة وباقي بيانات الملف الشخصي</p>
              </div>
            </div>
            <ChevronLeft className="shrink-0 text-brand-gray" size={20} aria-hidden />
          </div>
        </Card>

        <Card
          className="cursor-pointer transition hover:border-primary/40"
          role="button"
          tabIndex={0}
          onClick={() => setOpenModal("password")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenModal("password");
            }
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                <KeyRound size={22} aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-primary">تغيير كلمة المرور</h2>
                <p className="mt-1 text-sm text-brand-gray">تعيين كلمة مرور جديدة لحسابك</p>
              </div>
            </div>
            <ChevronLeft className="shrink-0 text-brand-gray" size={20} aria-hidden />
          </div>
        </Card>
      </div>

      <Modal open={openModal === "profile"} onClose={closeModal} title="تحديث البيانات" wide>
        {profileLoading ? (
          <p className="text-center text-brand-gray">جاري تحميل البيانات…</p>
        ) : (
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="الاسم"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
              <Select
                label="الجنس"
                value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              >
                <option value="">غير محدد</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </Select>
              <Input
                type="number"
                label="العمر"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
              />
              <Input
                label="المدينة"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              />
              <Input
                dir="ltr"
                label="رقم الجوال"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <Input
                label="المؤهل"
                value={profile.qualification}
                onChange={(e) => setProfile({ ...profile, qualification: e.target.value })}
              />
              <Input dir="ltr" label="البريد الإلكتروني" value={profile.email} disabled />
              <Input label="تاريخ الإنضمام" value={profile.joinDate} disabled />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeModal}>
                إلغاء
              </Button>
              <Button type="submit" disabled={profileSaving}>
                {profileSaving ? "جاري الحفظ…" : "حفظ"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={openModal === "password"} onClose={closeModal} title="تغيير كلمة المرور">
        <form onSubmit={submitPassword} className="space-y-4">
          <Input
            type="password"
            label="كلمة المرور الجديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            label="تأكيد كلمة المرور"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              إلغاء
            </Button>
            <Button type="submit" disabled={passwordSubmitting}>
              {passwordSubmitting ? "جاري الحفظ…" : "تحديث كلمة المرور"}
            </Button>
          </div>
        </form>
      </Modal>
    </UserShell>
  );
}
