import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";
import { useAuth } from "../../../contexts/AuthContext";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import { LoadingState, ErrorState } from "../../feedback/PageStates";

const DRAFT_KEY = "volunteer_opportunity_draft";

type Opportunity = {
  project_id: number;
  slug: string;
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  location: string;
  requirements: string;
  estimated_hours: number;
  duration: string;
};

type GuestForm = {
  full_name: string;
  email: string;
  phone: string;
  national_id: string;
  city: string;
  gender: string;
  age: string;
  qualification: string;
};

const emptyGuest: GuestForm = {
  full_name: "",
  email: "",
  phone: "",
  national_id: "",
  city: "",
  gender: "",
  age: "",
  qualification: "",
};

function loadDraft(slug: string): GuestForm | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { slug?: string; form?: GuestForm };
    if (parsed.slug !== slug || !parsed.form) return null;
    return parsed.form;
  } catch {
    return null;
  }
}

function saveDraft(slug: string, form: GuestForm) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ slug, form }));
}

function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}

/** صفحة انضمام عامة لفرصة التطوع — مستخدم حالي / زائر + OTP + تأكيد. */
export default function ProjectVolunteerJoin() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, access } = useAuth();
  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"choose" | "guest" | "confirm">("choose");
  const [guest, setGuest] = useState<GuestForm>(() => loadDraft(slug) || emptyGuest);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const autoConfirm = searchParams.get("confirm") === "1";

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(slug)}/volunteer/`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.detail || "الفرصة غير متاحة");
        }
        return r.json();
      })
      .then((d: Opportunity) => setOpp(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!opp || !autoConfirm || !access) return;
    setMode("confirm");
  }, [opp, autoConfirm, access]);

  const details = useMemo(() => {
    if (!opp) return [];
    return [
      { label: "الموقع", value: opp.location || "—" },
      { label: "الساعات المقدّرة", value: String(opp.estimated_hours ?? "—") },
      { label: "المدة", value: opp.duration || "—" },
      { label: "البداية", value: opp.start_date || "—" },
      { label: "النهاية", value: opp.end_date || "—" },
      { label: "المتطلبات", value: opp.requirements || "—" },
    ];
  }, [opp]);

  const requestGuestOtp = async () => {
    setBusy(true);
    setMessage("");
    saveDraft(slug, guest);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(slug)}/volunteer/otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: guest.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.detail || "تعذّر إرسال رمز التحقق");
        return;
      }
      setOtpSent(true);
      setMessage("تم إرسال رمز التحقق إلى بريدك");
    } catch {
      setMessage("حدث خطأ أثناء إرسال الرمز");
    } finally {
      setBusy(false);
    }
  };

  const submitGuest = async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(slug)}/volunteer/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...guest,
          age: guest.age ? Number(guest.age) : null,
          otp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.detail || "تعذّر إكمال التسجيل");
        return;
      }
      clearDraft();
      setDone(true);
      setMessage("تم تأكيد تسجيلك في الفرصة. راجع بريدك للتفاصيل.");
    } catch {
      setMessage("حدث خطأ أثناء التسجيل");
    } finally {
      setBusy(false);
    }
  };

  const confirmUser = async () => {
    if (!access) {
      navigate(`/signin?next=${encodeURIComponent(`/projects/${slug}/volunteer?confirm=1`)}`);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(slug)}/volunteer/confirm/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.detail || "تعذّر تأكيد الانضمام");
        return;
      }
      setDone(true);
      setMessage("تم تأكيد انضمامك للفرصة. راجع بريدك للتفاصيل.");
    } catch {
      setMessage("حدث خطأ أثناء التأكيد");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState title="جاري تحميل الفرصة…" />;
  if (error || !opp) {
    return <ErrorState title="الفرصة غير متاحة" message={error || "تأكد من الرابط أو عُد لصفحة المشروع."} />;
  }

  return (
    <div dir="rtl" className="bg-surface-muted">
      <header className="border-b border-surface-border bg-surface px-4 py-10 text-center">
        <div className="mx-auto max-w-page">
          <p className="text-sm text-brand-gray">فرصة تطوع</p>
          <h1 className="mt-2 text-3xl font-extrabold text-primary">{opp.name}</h1>
          {opp.description && <p className="mt-3 text-brand-gray">{opp.description}</p>}
          <div className="mt-4">
            <Link to={`/projects/${slug}`} className="text-sm font-semibold text-primary hover:underline">
              العودة لصفحة المشروع
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-page px-4 py-10">
        <Card>
          <h2 className="mb-4 text-xl font-bold text-primary">تفاصيل الفرصة</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-xs text-brand-gray">{d.label}</dt>
                <dd className="font-semibold text-primary">{d.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {done ? (
          <Card className="mt-6">
            <p className="text-center font-bold text-primary">{message}</p>
          </Card>
        ) : (
          <Card className="mt-6 space-y-4">
            {mode === "choose" && (
              <>
                <h2 className="text-xl font-bold text-primary">الانضمام للفرصة</h2>
                <p className="text-sm text-brand-gray">اختر كيف تريد المتابعة:</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => {
                      if (user && access) setMode("confirm");
                      else navigate(`/signin?next=${encodeURIComponent(`/projects/${slug}/volunteer?confirm=1`)}`);
                    }}
                  >
                    لدي حساب — تسجيل الدخول
                  </Button>
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setMode("guest")}>
                    زائر جديد — تسجيل بدون حساب فوري
                  </Button>
                </div>
              </>
            )}

            {mode === "guest" && (
              <>
                <h2 className="text-xl font-bold text-primary">تسجيل زائر</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input label="الاسم الكامل" value={guest.full_name} onChange={(e) => setGuest({ ...guest, full_name: e.target.value })} required />
                  <Input type="email" dir="ltr" label="البريد الإلكتروني" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} required />
                  <Input dir="ltr" label="الجوال" placeholder="5xxxxxxxx" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} required />
                  <Input dir="ltr" label="رقم الهوية" value={guest.national_id} onChange={(e) => setGuest({ ...guest, national_id: e.target.value })} required />
                  <Input label="المدينة" value={guest.city} onChange={(e) => setGuest({ ...guest, city: e.target.value })} />
                  <Select label="الجنس" value={guest.gender} onChange={(e) => setGuest({ ...guest, gender: e.target.value })}>
                    <option value="">—</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </Select>
                  <Input type="number" label="العمر" value={guest.age} onChange={(e) => setGuest({ ...guest, age: e.target.value })} />
                  <Input label="المؤهل" value={guest.qualification} onChange={(e) => setGuest({ ...guest, qualification: e.target.value })} />
                </div>
                {!otpSent ? (
                  <Button type="button" disabled={busy} onClick={() => void requestGuestOtp()}>
                    {busy ? "جاري الإرسال…" : "إرسال رمز التحقق للبريد"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Input dir="ltr" label="رمز التحقق" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" disabled={busy || otp.length < 4} onClick={() => void submitGuest()}>
                        {busy ? "جاري التأكيد…" : "تأكيد التسجيل"}
                      </Button>
                      <Button type="button" variant="secondary" disabled={busy} onClick={() => void requestGuestOtp()}>
                        إعادة إرسال الرمز
                      </Button>
                    </div>
                  </div>
                )}
                <button type="button" className="text-sm text-brand-gray hover:underline" onClick={() => setMode("choose")}>
                  رجوع
                </button>
              </>
            )}

            {mode === "confirm" && (
              <>
                <h2 className="text-xl font-bold text-primary">تأكيد الانضمام</h2>
                <p className="text-sm text-brand-gray">
                  {user ? `مرحباً ${user.name || user.email}` : "يلزم تسجيل الدخول أولاً"}
                </p>
                <ul className="space-y-1 text-sm">
                  {details.map((d) => (
                    <li key={d.label}>
                      <span className="text-brand-gray">{d.label}: </span>
                      <span className="font-semibold">{d.value}</span>
                    </li>
                  ))}
                </ul>
                <Button type="button" disabled={busy} onClick={() => void confirmUser()}>
                  {busy ? "جاري التأكيد…" : "تأكيد الانضمام للفرصة"}
                </Button>
                <button type="button" className="block text-sm text-brand-gray hover:underline" onClick={() => setMode("choose")}>
                  رجوع
                </button>
              </>
            )}

            {message && !done && (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "var(--tmkeen-danger-bg)", color: "var(--tmkeen-danger)" }}>
                {message}
              </div>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
