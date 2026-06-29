import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, User, LogIn } from 'lucide-react'
import logo from '../assets/logo.png'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* الشعار */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <img src={logo} alt="جمعية الزاد" className="h-12 w-auto" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-alzad-burgundy">منصة كفالات السقيا</h1>
              <p className="text-sm text-gray-600">جمعية الزاد</p>
            </div>
          </div>

          {/* القائمة الرئيسية - سطح المكتب */}
          <nav className="hidden md:flex items-center space-x-8 space-x-reverse">
            <a href="#home" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
              الرئيسية
            </a>
            <a href="#about" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
              عن المشروع
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
              كيف يعمل
            </a>
            <a href="#contact" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
              تواصل معنا
            </a>
          </nav>

          {/* أزرار تسجيل الدخول */}
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            <Button variant="outline" className="border-alzad-burgundy text-alzad-burgundy hover:bg-alzad-burgundy hover:text-white">
              <User className="w-4 h-4 ml-2" />
              تسجيل الدخول
            </Button>
            <Button className="bg-alzad-burgundy hover:bg-alzad-burgundy/90 text-white">
              <LogIn className="w-4 h-4 ml-2" />
              تبرع الآن
            </Button>
          </div>

          {/* زر القائمة للهواتف */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-alzad-burgundy hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* القائمة المنسدلة للهواتف */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <a href="#home" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
                الرئيسية
              </a>
              <a href="#about" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
                عن المشروع
              </a>
              <a href="#how-it-works" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
                كيف يعمل
              </a>
              <a href="#contact" className="text-gray-700 hover:text-alzad-burgundy transition-colors">
                تواصل معنا
              </a>
              <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                <Button variant="outline" className="border-alzad-burgundy text-alzad-burgundy hover:bg-alzad-burgundy hover:text-white">
                  <User className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </Button>
                <Button className="bg-alzad-burgundy hover:bg-alzad-burgundy/90 text-white">
                  <LogIn className="w-4 h-4 ml-2" />
                  تبرع الآن
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header

