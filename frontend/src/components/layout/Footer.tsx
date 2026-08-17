import { Mail, Phone, MapPin } from "lucide-react";

/** تذييل مضغوط — من نحن + تواصل. */
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

        <div className="mt-3 border-t border-surface-border pt-3 text-center text-[11px] text-brand-gray sm:text-xs">
          © 2026 منصة تكافل وأثر. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
