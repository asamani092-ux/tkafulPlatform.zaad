import { Button } from '@/components/ui/button'
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react'
import logo from '../assets/logo.png'

const Footer = () => {
  return (
    <footer className="bg-alzad-burgundy text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* معلومات الجمعية */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-4 space-x-reverse mb-6">
              <img src={logo} alt="جمعية الزاد" className="h-16 w-auto" />
              <div>
                <h3 className="text-2xl font-bold">جمعية الزاد</h3>
                <p className="text-alzad-gold">منصة كفالات السقيا</p>
              </div>
            </div>
            <p className="text-white/90 leading-relaxed mb-6 max-w-md">
              منصة إلكترونية متكاملة تهدف إلى ربط المتبرعين بالمحتاجين بطريقة شفافة وفعالة، 
              لضمان وصول المساعدات لمستحقيها في الوقت المناسب وبأعلى معايير الجودة.
            </p>
            <div className="flex space-x-4 space-x-reverse">
              <Button size="sm" variant="outline" className="border-white text-white hover:bg-white hover:text-alzad-burgundy">
                <Facebook className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-white text-white hover:bg-white hover:text-alzad-burgundy">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-white text-white hover:bg-white hover:text-alzad-burgundy">
                <Instagram className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-white text-white hover:bg-white hover:text-alzad-burgundy">
                <Youtube className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* روابط سريعة */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-alzad-gold">روابط سريعة</h4>
            <ul className="space-y-3">
              <li>
                <a href="#home" className="text-white/90 hover:text-alzad-gold transition-colors">
                  الرئيسية
                </a>
              </li>
              <li>
                <a href="#about" className="text-white/90 hover:text-alzad-gold transition-colors">
                  عن المشروع
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-white/90 hover:text-alzad-gold transition-colors">
                  كيف يعمل
                </a>
              </li>
              <li>
                <a href="#contact" className="text-white/90 hover:text-alzad-gold transition-colors">
                  تواصل معنا
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-white/90 hover:text-alzad-gold transition-colors">
                  سياسة الخصوصية
                </a>
              </li>
              <li>
                <a href="#terms" className="text-white/90 hover:text-alzad-gold transition-colors">
                  الشروط والأحكام
                </a>
              </li>
            </ul>
          </div>

          {/* معلومات التواصل */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-alzad-gold">تواصل معنا</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 space-x-reverse">
                <Phone className="w-5 h-5 text-alzad-gold" />
                <span className="text-white/90">+966 11 234 5678</span>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <Mail className="w-5 h-5 text-alzad-gold" />
                <span className="text-white/90">info@alzad.org</span>
              </div>
              <div className="flex items-start space-x-3 space-x-reverse">
                <MapPin className="w-5 h-5 text-alzad-gold mt-1" />
                <span className="text-white/90">
                  الرياض، المملكة العربية السعودية
                  <br />
                  ص.ب 12345
                </span>
              </div>
            </div>

            {/* النشرة البريدية */}
            <div className="mt-6">
              <h5 className="font-semibold mb-3 text-alzad-gold">اشترك في النشرة البريدية</h5>
              <div className="flex space-x-2 space-x-reverse">
                <input
                  type="email"
                  placeholder="بريدك الإلكتروني"
                  className="flex-1 px-3 py-2 rounded-md text-alzad-burgundy text-sm"
                />
                <Button size="sm" className="bg-alzad-gold hover:bg-alzad-gold/90 text-alzad-burgundy">
                  اشتراك
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* خط الفصل */}
        <div className="border-t border-white/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/80 text-sm">
              © 2024 جمعية الزاد. جميع الحقوق محفوظة.
            </p>
            <div className="flex space-x-6 space-x-reverse mt-4 md:mt-0">
              <a href="#privacy" className="text-white/80 hover:text-alzad-gold text-sm transition-colors">
                سياسة الخصوصية
              </a>
              <a href="#terms" className="text-white/80 hover:text-alzad-gold text-sm transition-colors">
                الشروط والأحكام
              </a>
              <a href="#cookies" className="text-white/80 hover:text-alzad-gold text-sm transition-colors">
                سياسة الكوكيز
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

