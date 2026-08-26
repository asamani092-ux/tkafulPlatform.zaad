import { HandHeart, Target, Users } from "lucide-react";
import Card from "../ui/Card";
import HeroBand from "../ui/HeroBand";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import { displayPlatformName } from "../../admin/publicNav";

const items = [
  { icon: Target, title: "رسالتنا", text: "ربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر مستدام في المجتمع." },
  { icon: HandHeart, title: "قيمنا", text: "العطاء، الشفافية، والتكافل المجتمعي في كل مبادرة نقوم بها." },
  { icon: Users, title: "مجتمعنا", text: "شبكة من المتطوعين والمتبرعين والمستفيدين تعمل يدًا بيد." },
];

export default function About() {
  const { settings } = usePlatformSettings();
  const about = settings.pages.find((p) => p.slug === "about");
  const name = displayPlatformName(settings.platform_name);

  return (
    <div>
      <HeroBand title={about?.title || "من نحن"} subtitle={about?.body || `${name} — جمعية الزاد، قسم التكافل المجتمعي.`} />
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
