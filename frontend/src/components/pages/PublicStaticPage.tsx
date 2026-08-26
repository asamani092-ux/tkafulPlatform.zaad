import { useParams, Link } from "react-router-dom";
import Card from "../ui/Card";
import HeroBand from "../ui/HeroBand";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import { EmptyState, LoadingState } from "../feedback/PageStates";

/** صفحة ثابتة منشورة من إعدادات المنصّة. */
export default function PublicStaticPage() {
  const { slug = "" } = useParams();
  const { settings, loading } = usePlatformSettings();
  const page = settings.pages.find((p) => p.slug === slug);

  if (loading) return <LoadingState title="جاري التحميل…" />;
  if (!page) {
    return (
      <div>
        <HeroBand title="الصفحة غير متاحة" />
        <main className="mx-auto max-w-page px-4 py-10">
          <EmptyState title="هذه الصفحة غير منشورة أو غير موجودة" />
          <Link to="/" className="mt-4 inline-block text-sm font-bold text-primary">العودة للرئيسية</Link>
        </main>
      </div>
    );
  }

  return (
    <div>
      <HeroBand title={page.title} />
      <main className="mx-auto max-w-page px-4 py-10">
        <Card>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-gray">{page.body}</p>
        </Card>
      </main>
    </div>
  );
}
