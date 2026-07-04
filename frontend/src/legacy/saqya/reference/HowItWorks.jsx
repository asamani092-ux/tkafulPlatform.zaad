import { Card, CardContent } from '@/components/ui/card'
import { Heart, CheckCircle, Truck, Camera, Award } from 'lucide-react'

const HowItWorks = () => {
  const steps = [
    {
      icon: Heart,
      title: "اختر نوع الكفالة",
      description: "تصفح الفرص المتاحة واختر نوع الكفالة التي تريد دعمها (طعام، ملابس، أدوية، إلخ)",
      color: "text-red-500"
    },
    {
      icon: CheckCircle,
      title: "مراجعة واعتماد",
      description: "يقوم فريق المشرفين بمراجعة طلبك واعتماده خلال 24 ساعة",
      color: "text-green-500"
    },
    {
      icon: Truck,
      title: "التحضير والتوصيل",
      description: "يتم تكليف أفضل الموردين والمندوبين لتحضير وتوصيل الكفالة للمستفيدين",
      color: "text-blue-500"
    },
    {
      icon: Camera,
      title: "التوثيق الميداني",
      description: "يقوم المندوب بتوثيق عملية التسليم بالصور والفيديوهات",
      color: "text-purple-500"
    },
    {
      icon: Award,
      title: "تقرير التنفيذ",
      description: "تستلم تقريراً مفصلاً عن تنفيذ كفالتك مع الصور والتوثيق الكامل",
      color: "text-alzad-gold"
    }
  ]

  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-alzad-burgundy mb-4">
            كيف تعمل منصة كفالات السقيا؟
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            عملية بسيطة وشفافة تضمن وصول مساعدتك لمستحقيها بأعلى معايير الجودة والشفافية
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {steps.map((step, index) => {
              const IconComponent = step.icon
              return (
                <Card key={index} className="relative hover:shadow-lg transition-shadow duration-300 hover-scale">
                  <CardContent className="p-6 text-center">
                    {/* رقم الخطوة */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-alzad-burgundy text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    
                    {/* الأيقونة */}
                    <div className={`${step.color} mb-4 mt-4`}>
                      <IconComponent className="w-12 h-12 mx-auto" />
                    </div>
                    
                    {/* العنوان */}
                    <h3 className="text-lg font-semibold text-alzad-burgundy mb-3">
                      {step.title}
                    </h3>
                    
                    {/* الوصف */}
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* خط الربط بين الخطوات */}
          <div className="hidden lg:block relative mt-8">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-alzad-burgundy to-alzad-gold transform -translate-y-1/2"></div>
            <div className="flex justify-between items-center">
              {steps.map((_, index) => (
                <div key={index} className="w-4 h-4 bg-alzad-burgundy rounded-full border-4 border-white shadow-lg"></div>
              ))}
            </div>
          </div>
        </div>

        {/* إحصائيات إضافية */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-alzad-burgundy mb-2">24 ساعة</div>
              <div className="text-gray-600">متوسط وقت المراجعة</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-alzad-burgundy mb-2">48 ساعة</div>
              <div className="text-gray-600">متوسط وقت التنفيذ</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-alzad-burgundy mb-2">100%</div>
              <div className="text-gray-600">شفافية في التوثيق</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks

