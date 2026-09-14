/**
 * رابط «الذهاب للموقع» — يفتح الإحداثيات في تطبيقات الخرائط الخارجية.
 * صيغة عالمية تعمل على Google Maps ومعظم التطبيقات. O(1).
 */
export function externalMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
