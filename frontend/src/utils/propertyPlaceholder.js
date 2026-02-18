/**
 * Property images: served from public/img/properties/ (local files).
 * Run once:  npm run download-property-images   to fetch real photos into public/.
 * Then thumbnails and detail page use them without any external requests.
 */
const LOCAL_IMAGE_COUNT = 10;

function getLocalImageIndex(property) {
  const id = Number(property?.id) || 0;
  return (Math.abs(id) % LOCAL_IMAGE_COUNT) + 1;
}

/** Returns URL for the property image (local file under public/img/properties/). */
export function getPropertyPhotoUrl(property) {
  const num = getLocalImageIndex(property);
  const base = process.env.PUBLIC_URL || "";
  return `${base}/img/properties/${num}.jpg`;
}

/** Fallback: SVG placeholder when the photo fails to load (no network / blocked). */
export function getPropertyPlaceholderSvgUrl(property) {
  const id = Number(property?.id) || 0;
  const index = Math.abs(id) % 5;
  const gradients = [
    { from: "#1e3a5f", to: "#0f766e" },
    { from: "#1e3a5f", to: "#1d4ed8" },
    { from: "#0f766e", to: "#0ea5a4" },
    { from: "#334155", to: "#64748b" },
    { from: "#1e40af", to: "#0f766e" },
  ];
  const { from, to } = gradients[index];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="400" height="280">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${from}"/>
      <stop offset="100%" style="stop-color:${to}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="280" fill="url(#g)"/>
  <path d="M200 70 L330 200 L70 200 Z" fill="rgba(255,255,255,0.12)"/>
  <rect x="165" y="200" width="70" height="80" fill="rgba(255,255,255,0.15)"/>
  <rect x="235" y="160" width="40" height="40" rx="4" fill="rgba(255,255,255,0.2)"/>
  <rect x="125" y="160" width="40" height="40" rx="4" fill="rgba(255,255,255,0.2)"/>
</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/** Preferred image URL: real photo. Use with onError fallback to getPropertyPlaceholderSvgUrl. */
export function getPropertyPlaceholderUrl(property) {
  return getPropertyPhotoUrl(property);
}
