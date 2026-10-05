/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  async rewrites() {
    const backend = process.env.API_BACKEND_URL;
    if (!backend) return [];
    const url = new URL(backend);
    if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
      throw new Error("API_BACKEND_URL must be an HTTPS origin without a path or credentials.");
    }
    // beforeFiles is required: these paths also have local Next.js handlers.
    // Set only on the web deployment, NEVER on the Cloud Run backend itself.
    return { beforeFiles: [{ source: "/api/:path*", destination: `${url.origin}/api/:path*` }] };
  },
};

export default config;
