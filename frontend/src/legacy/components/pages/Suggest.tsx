import { useState } from 'react';
import Button from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { sanitizeInput } from '../../utils/sanitize';
import { API_BASE_URL } from '../../config';

// import { suggests, type Suggest } from '../../data/Suggest';


export default function Suggest() {
    const [suggestion, setSuggestion] = useState("");
    const [email, setEmail] = useState("");
    const { success, error } = useToast();
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
    
      // Sanitize inputs
      const sanitizedSuggestion = sanitizeInput(suggestion);
      const sanitizedEmail = sanitizeInput(email);
    
      if (!sanitizedSuggestion.trim()) {
        error({
          title: "الرجاء إدخال الاقتراح",
          description: "فضلاً اكتب اقتراحك قبل الإرسال.",
          duration: 4000
        });
        return;
      }
    
      if (!sanitizedEmail.trim()) {
        error({
          title: "الرجاء إدخال البريد الإلكتروني",
          description: "فضلاً أدخل بريدك الإلكتروني للتواصل.",
          duration: 4000
        });
        return;
      }
    
      try {
        // Build payload for public Suggestion API
        const payload = {
          title: sanitizedSuggestion.slice(0, 80),   // short title from suggestion
          description: sanitizedSuggestion,
          submitted_by: sanitizedEmail
        };

        const res = await fetch(`${API_BASE_URL}/api/public-suggestions/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error("Failed to submit suggestion");
        }
    
        success({
          title: "تم استلام اقتراحك",
          description: "شاكرين لك مشاركتنا في التطور.",
          duration: 4000
        });
    
        setSuggestion("");
        setEmail("");
      } catch (err) {
        console.error(err);
        error({
          title: "حدث خطأ",
          description: "لم يتم إرسال الاقتراح، حاول مرة أخرى.",
          duration: 4000
        });
      }
    };
      
    return (
        <div className="min-h-screen bg-gray-50">
         {/* Hero Section */}
         <section className="bg-gradient-to-b from-brand-600 to-brand-500 text-white py-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center animate-fadeIn">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                شارك اقتراحك
              </h1>
              <p className="text-lg md:text-xl text-brand-100 max-w-2xl mx-auto">
              شاركنا أفكارك لمبادرات تكافلية جديدة يمكن أن تُحدث أثرًا إيجابيًا في المجتمع💡             </p>
            </div>
          </div>
        </section>
        <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto mt-5 p-6 bg-white shadow-md rounded-2xl space-y-4"
    >

      {/* Suggestion Text Area */}
      <div className="flex flex-col space-y-2">
        <label htmlFor="suggestion" className="text-gray-700 font-medium">
          اقتراحك:
        </label>
        <textarea
          id="suggestion"
          rows={5}
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="هنا..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-[#DFC775] focus:border-[#DFC775] resize-none"
          required
        />
      </div>

      {/* Email Input */}
      <div className="flex flex-col space-y-2">
        <label htmlFor="email" className="text-gray-700 font-medium">
          بريدك الالكتروني
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@email.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-[#DFC775] focus:border-[#DFC775]"
          required
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="outlineGold"
        size="lg"
        className="w-full"
      >
        ارسال
      </Button>
    </form>
        </div>
        
    );
}