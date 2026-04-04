// For GitHub Pages + Cloudflare Worker deployments, set this to your API origin.
// Example: window.EXI_API_BASE = "https://exi-api.your-subdomain.workers.dev";
(() => {
  const WORKER_API_BASE = "https://rpi-backend.com";
  const host = String(window.location.hostname || "").toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1";
  // Local browser sessions should hit local Express so PDF routes work.
  // Deployed static sites still use the worker API by default.
  window.EXI_API_BASE = window.EXI_API_BASE || (isLocal ? "http://localhost:3000" : WORKER_API_BASE);
})();
