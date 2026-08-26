/**
 * ربط أدوات المشروع بوجهاتها العامة + قواعد الظهور (لا أزرار ميتة).
 * دوال نقية قابلة للاختبار. التعقيد: O(T) لعدد الأدوات.
 */

interface ToolLinkContext {
  slug: string;
  mapsCount: number;
  toolConfig?: Record<string, Record<string, unknown>>;
}

export function resolveToolLink(tool: string, ctx: ToolLinkContext): string | null {
  switch (tool) {
    case "map":
      return ctx.mapsCount > 0 ? `/projects/${ctx.slug}/map` : null;
    case "sponsorships":
      return `/projects/${ctx.slug}/sponsorships`;
    case "volunteering":
      return "/volunteers";
    case "services": {
      const form =
        (ctx.toolConfig?.services?.request_form as string) ||
        (ctx.slug === "saqya" ? "water_supply" : "service");
      return form === "water_supply"
        ? `/services/water-supply?project=${ctx.slug}`
        : "/request-service";
    }
    default:
      return null;
  }
}

export function visibleTools(tools: string[], ctx: ToolLinkContext): string[] {
  return tools.filter((t) => resolveToolLink(t, ctx) !== null);
}

/** زر التبرع يظهر فقط ضمن سياق الكفالات/الخدمات وعند وجود الرابط. */
export function donationInContext(donationUrl: string | undefined, tools: string[]): boolean {
  return !!donationUrl && (tools.includes("sponsorships") || tools.includes("services"));
}
