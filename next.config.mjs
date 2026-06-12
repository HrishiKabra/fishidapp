/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Tooling (e.g. Playwright MCP) writes logs into the repo; without this
      // the dev watcher recompiles on every log line and kills in-flight requests.
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/.playwright-mcp/**"],
      }
    }
    return config
  },
}

export default nextConfig
