// For GitHub Pages + Cloudflare Worker deployments, set this to your API origin.
// Example: window.EXI_API_BASE = "https://exi-api.your-subdomain.workers.dev";
(() => {
  const WORKER_API_BASE = "https://exi-api.deanbarry100.workers.dev";
  const port = window.location.port;
  const isNodeBackendDev = port === "3000";
  // Use Worker by default (GitHub Pages + static dev servers like :5500).
  // Only use same-origin when running the full local Node backend on :3000.
  window.EXI_API_BASE = window.EXI_API_BASE || (isNodeBackendDev ? "" : WORKER_API_BASE);
})();
