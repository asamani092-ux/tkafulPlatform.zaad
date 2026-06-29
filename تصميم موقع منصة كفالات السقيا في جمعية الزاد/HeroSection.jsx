import { Button } from '@/components/ui/button'
import { Heart, Users, MapPin, TrendingUp } from 'lucide-react'

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-alzad-burgundy via-alzad-burgundy/90 to-alzad-gold/80 text-white py-20">
      {/* خلفية مزخرفة */}
      <div className="absolute inset-0 bg-black/10"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* العنوان الرئيسي */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            منصة كفالات السقيا
            <span className="block text-alzad-gold text-3xl md:text-4xl mt-2">
              نحو مستقبل أفضل للجميع
            </span>
          </h1>

          {/* الوصف */}
          <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed">
            منصة إلكترونية متكاملة تربط بين المتبرعين والمحتاجين بشفافية وكفاءة عالية
            <br />
            لضمان وصول المساعدات لمستحقيها في الوقت المناسب
          </p>

          {/* أزرار العمل */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="bg-alzad-gold hover:bg-alzad-gold/90 text-alzad-burgundy font-semibold px-8 py-4 text-lg hover-scale"
            >
              <Heart className="w-5 h-5 ml-2" />
              ابدأ التبرع الآن
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-alzad-burgundy font-semibold px-8 py-4 text-lg hover-scale"
            >
              <Users className="w-5 h-5 ml-2" />
              انضم كمتطوع
            </Button>
          </div>

          {/* الإحصائيات السريعة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-4 mb-2">
                <Heart className="w-8 h-8 mx-auto text-alzad-gold" />
              </div>
              <div className="text-2xl md:text-3xl font-bold">1,250+</div>
              <div className="text-sm text-white/80">كفالة مكتملة</div>
            </div>
            
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-4 mb-2">
                <Users className="w-8 h-8 mx-auto text-alzad-gold" />
              </div>
              <div className="text-2xl md:text-3xl font-bold">3,500+</div>
              <div className="text-sm text-white/80">مستفيد</div>
            </div>
            
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-4 mb-2">
                <MapPin className="w-8 h-8 mx-auto text-alzad-gold" />
              </div>
              <div className="text-2xl md:text-3xl font-bold">45+</div>
              <div className="text-sm text-white/80">منطقة مغطاة</div>
            </div>
            
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-4 mb-2">
                <TrendingUp className="w-8 h-8 mx-auto text-alzad-gold" />
              </div>
              <div className="text-2xl md:text-3xl font-bold">98%</div>
              <div className="text-sm text-white/80">معدل النجاح</div>
            </div>
          </div>
        </div>
      </div>

      {/* موجة في الأسفل */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-12 fill-white">
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"></path>
        </svg>
      </div>
    </section>
  )
}

export default HeroSection

