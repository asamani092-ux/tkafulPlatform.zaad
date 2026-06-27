import { HandHeart, Target, Users } from "lucide-react";
import Card from "../ui/Card";
import HeroBand from "../ui/HeroBand";

const items = [
  { icon: Target, title: "رسالتنا", text: "ربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر مستدام في المجتمع." },
  { icon: HandHeart, title: "قيمنا", text: "العطاء، الشفافية، والتكافل المجتمعي في كل مبادرة نقوم بها." },
  { icon: Users, title: "مجتمعنا", text: "شبكة من المتطوعين والمتبرعين والمستفيدين تعمل يدًا بيد." },
];

export default function About() {
  return (
    <div>
      <HeroBand title="من نحن" subtitle="منصة تكافل وأثر — جمعية الزاد، قسم التكافل المجتمعي." />
      <main className="mx-auto max-w-page px-4 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((it) => (
            <Card key={it.title}>
              <it.icon className="mb-3 text-secondary" size={32} />
              <h3 className="mb-2 text-lg font-bold text-primary">{it.title}</h3>
              <p className="text-sm text-brand-gray">{it.text}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
