import { useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { sanitizeInput } from "../../utils/sanitize";
import { API_BASE_URL } from "../../config";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Button from "../ui/Button";
import HeroBand from "../ui/HeroBand";

export default function Suggest() {
  const [suggestion, setSuggestion] = useState("");
  const [email, setEmail] = useState("");
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sSuggestion = sanitizeInput(suggestion);
    const sEmail = sanitizeInput(email);
    if (!sSuggestion.trim()) { error({ title: "الرجاء إدخال الاقتراح", description: "فضلاً اكتب اقتراحك قبل الإرسال." }); return; }
    if (!sEmail.trim()) { error({ title: "الرجاء إدخال البريد الإلكتروني", description: "فضلاً أدخل بريدك للتواصل." }); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/api/public-suggestions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: sSuggestion.slice(0, 80), description: sSuggestion, submitted_by: sEmail }),
      });
      if (!res.ok) throw new Error();
      success({ title: "تم استلام اقتراحك", description: "شاكرين لك مشاركتنا في التطور." });
      setSuggestion(""); setEmail("");
    } catch {
      error({ title: "حدث خطأ", description: "لم يتم إرسال الاقتراح، حاول مرة أخرى." });
    }
  };

  return (
    <div>
      <HeroBand title="شارك اقتراحك" subtitle="شاركنا أفكارك لمبادرات تكافلية جديدة تُحدث أثرًا إيجابيًا." />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field" htmlFor="suggestion">اقتراحك</label>
              <textarea id="suggestion" rows={5} value={suggestion} onChange={(e) => setSuggestion(e.target.value)}
                className="input-field" style={{ resize: "none" }} placeholder="اكتب اقتراحك هنا…" required />
            </div>
            <Input type="email" dir="ltr" label="بريدك الإلكتروني" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full">إرسال</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
