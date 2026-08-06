import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

/** تذييل وفق النموذج: سطح فاتح + عناوين بنص العلامة. */
export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface">
      <div className="mx-auto max-w-page px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-bold text-primary">من نحن</h3>
            <p className="text-sm text-brand-gray">
              منصة تكافل وأثر تربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر إيجابي في المجتمع.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold text-primary">روابط سريعة</h3>
            <ul className="space-y-2 text-sm text-brand-gray">
              <li><Link to="/" className="hover:text-primary">الرئيسية</Link></li>
              <li><Link to="/projects" className="hover:text-primary">المشاريع</Link></li>
              <li><Link to="/services" className="hover:text-primary">الخدمات</Link></li>
              <li><Link to="/about" className="hover:text-primary">من نحن</Link></li>
              <li><Link to="/suggest" className="hover:text-primary">شارك اقتراحك</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold text-primary">تواصل معنا</h3>
            <div className="space-y-3 text-sm text-brand-gray">
              <div className="flex items-center gap-2"><Mail size={18} aria-hidden /> info@takafol-athar.com</div>
              <div className="flex items-center gap-2"><Phone size={18} aria-hidden /> +966 50 123 4567</div>
              <div className="flex items-center gap-2"><MapPin size={18} aria-hidden /> القصيم، المملكة العربية السعودية</div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-surface-border pt-6 text-center text-sm text-brand-gray">
          © 2026 منصة تكافل وأثر. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
