import { HandHeart, Target, Users, type LucideIcon } from "lucide-react";
import Card from "../ui/Card";
import HeroBand from "../ui/HeroBand";
import { usePlatformSettings } from "../../contexts/PlatformSettingsContext";
import { displayPlatformName } from "../../admin/publicNav";

const CARD_DEFS: { slug: string; icon: LucideIcon; title: string; text: string }[] = [
  {
    slug: "about-mission",
    icon: Target,
    title: "رسالتنا",
    text: "ربط المحتاجين بالمتبرعين والمتطوعين لصنع أثر مستدام في المجتمع.",
  },
  {
    slug: "about-values",
    icon: HandHeart,
    title: "قيمنا",
    text: "العطاء، الشفافية، والتكافل المجتمعي في كل مبادرة نقوم بها.",
  },
  {
    slug: "about-community",
    icon: Users,
    title: "مجتمعنا",
    text: "شبكة من المتطوعين والمتبرعين والمستفيدين تعمل يدًا بيد.",
  },
];

export default function About() {
  const { settings, pageBySlug } = usePlatformSettings();
  const about = pageBySlug("about");
  const name = displayPlatformName(settings.platform_name);

  const cards = CARD_DEFS.map((def) => {
    const page = pageBySlug(def.slug);
    return {
      icon: def.icon,
      title: page?.title || def.title,
      text: page?.body || def.text,
    };
  });

  return (
    <div>
      <HeroBand title={about?.title || "من نحن"} subtitle={about?.body || `${name} — جمعية الزاد، قسم التكافل المجتمعي.`} />
      <main className="mx-auto max-w-page px-4 py-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((it, i) => (
            <Card key={CARD_DEFS[i].slug}>
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
