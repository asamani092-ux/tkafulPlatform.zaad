import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

/** تذييل الموقع الموحّد على design-system. */
export default function Footer() {
  return (
    <footer style={{ background: "var(--tmkeen-primary-dark)", color: "#fff" }}>
      <div className="mx-auto max-w-page px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-bold">من نحن</h3>
            <p className="text-sm" style={{ opacity: 0.85 }}>
              منصة تكافل وأثر تربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر إيجابي في المجتمع.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold">روابط سريعة</h3>
            <ul className="space-y-2 text-sm" style={{ opacity: 0.9 }}>
              <li><Link to="/">الرئيسية</Link></li>
              <li><Link to="/projects">المشاريع</Link></li>
              <li><Link to="/services">الخدمات</Link></li>
              <li><Link to="/about">من نحن</Link></li>
              <li><Link to="/suggest">شارك اقتراحك</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-lg font-bold">تواصل معنا</h3>
            <div className="space-y-3 text-sm" style={{ opacity: 0.9 }}>
              <div className="flex items-center gap-2"><Mail size={18} /> info@takafol-athar.com</div>
              <div className="flex items-center gap-2"><Phone size={18} /> +966 50 123 4567</div>
              <div className="flex items-center gap-2"><MapPin size={18} /> القصيم، المملكة العربية السعودية</div>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm" style={{ borderColor: "rgba(255,255,255,.2)", opacity: 0.8 }}>
          © 2026 منصة تكافل وأثر. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
