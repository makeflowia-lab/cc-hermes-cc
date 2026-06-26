import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // MCP server de Next.js DevTools en /_next/mcp (Next 16+) para quality control.
  experimental: {
    mcpServer: true,
  },
}

export default nextConfig
