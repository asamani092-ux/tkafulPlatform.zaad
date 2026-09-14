declare module "arabic-persian-reshaper" {
  const reshaper: {
    ArabicShaper: { convertArabic: (s: string) => string; convertArabicBack: (s: string) => string };
    PersianShaper: { convertArabic: (s: string) => string; convertArabicBack: (s: string) => string };
  };
  export default reshaper;
}

declare module "bidi-js" {
  interface BidiApi {
    getEmbeddingLevels: (text: string, defaultLevel?: string | number) => unknown;
    getReorderedString: (text: string, embeddingLevels: unknown, options?: unknown) => string;
  }
  export default function bidiFactory(): BidiApi;
}
