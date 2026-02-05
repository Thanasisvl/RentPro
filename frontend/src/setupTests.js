import "@testing-library/jest-dom";

// Keep test output clean by filtering known, non-actionable warnings.
// IMPORTANT: We only suppress very specific, noisy messages.
const _origWarn = console.warn.bind(console);
const _origError = console.error.bind(console);

console.warn = (...args) => {
  const msg = args.map((a) => String(a ?? "")).join(" ");
  if (msg.includes("React Router Future Flag Warning")) return;
  if (msg.includes("MUI Grid:")) return;
  _origWarn(...args);
};

console.error = (...args) => {
  const msg = args.map((a) => String(a ?? "")).join(" ");
  // MUI TouchRipple triggers asynchronous updates that are harmless here.
  if (msg.includes("TouchRipple") && msg.includes("act")) return;
  // React act warnings are noise here; tests await visible results instead.
  if (msg.includes("not wrapped in act")) return;
  // Expected error logs in tests (avoid noisy output).
  if (msg.startsWith("Failed to delete property")) return;
  _origError(...args);
};

