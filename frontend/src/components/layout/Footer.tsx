import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import { displayPlatformName } from "../../admin/publicNav";

/** تذييل مضغوط — من نحن + تواصل من إعدادات المنصّة. */
export default function Footer() {
  const { settings } = usePlatformSettings();
  const name = displayPlatformName(settings.platform_name);
  const extraPages = settings.pages.filter((p) => p.slug !== "about");

  return (
    <footer className="border-t border-surface-border bg-surface">
      <div className="mx-auto max-w-page px-4 py-5 sm:py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-primary sm:text-base">من نحن</h3>
            <p className="text-xs leading-relaxed text-brand-gray sm:text-sm">
              {settings.pages.find((p) => p.slug === "about")?.body
                || `${name} تربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر إيجابي في المجتمع.`}
            </p>
            {extraPages.map((p) => (
              <Link key={p.slug} to={`/pages/${p.slug}`} className="mt-2 block text-xs font-bold text-primary">{p.title}</Link>
            ))}
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-primary sm:text-base">تواصل معنا</h3>
            <div className="space-y-1.5 text-xs text-brand-gray sm:text-sm">
              {settings.contact_email && <div className="flex items-center gap-2"><Mail size={14} aria-hidden /> {settings.contact_email}</div>}
              {settings.contact_phone && <div className="flex items-center gap-2"><Phone size={14} aria-hidden /> {settings.contact_phone}</div>}
              {settings.address && <div className="flex items-center gap-2"><MapPin size={14} aria-hidden /> {settings.address}</div>}
              {Object.entries(settings.social_links || {}).filter(([, u]) => u).map(([k, u]) => (
                <a key={k} href={u} className="block text-primary" target="_blank" rel="noopener noreferrer">{k}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-surface-border pt-3 text-center text-[11px] text-brand-gray sm:text-xs">
          © {new Date().getFullYear()} {name}. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
