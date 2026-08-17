import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const QUICK_LINKS = [
  { to: "/", label: "الرئيسية" },
  { to: "/projects", label: "المشاريع" },
  { to: "/services", label: "الخدمات" },
  { to: "/volunteers", label: "المتطوعون" },
  { to: "/map", label: "الخرائط" },
  { to: "/about", label: "من نحن" },
  { to: "/suggest", label: "شارك اقتراحك" },
];

/** تذييل مضغوط — روابط سريعة أفقية متجاوبة. */
export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface">
      <div className="mx-auto max-w-page px-4 py-5 sm:py-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-primary sm:text-base">من نحن</h3>
            <p className="text-xs leading-relaxed text-brand-gray sm:text-sm">
              منصة تكافل وأثر تربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر إيجابي في المجتمع.
            </p>
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-primary sm:text-base">تواصل معنا</h3>
            <div className="space-y-1.5 text-xs text-brand-gray sm:text-sm">
              <div className="flex items-center gap-2"><Mail size={14} aria-hidden /> info@takafol-athar.com</div>
              <div className="flex items-center gap-2"><Phone size={14} aria-hidden /> +966 50 123 4567</div>
              <div className="flex items-center gap-2"><MapPin size={14} aria-hidden /> القصيم، المملكة العربية السعودية</div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-surface-border pt-3">
          <h3 className="mb-2 text-sm font-bold text-primary">روابط سريعة</h3>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-brand-gray sm:gap-x-4 sm:text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="inline-block min-h-[44px] py-2 hover:text-primary sm:min-h-0 sm:py-0">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 border-t border-surface-border pt-3 text-center text-[11px] text-brand-gray sm:text-xs">
          © 2026 منصة تكافل وأثر. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
