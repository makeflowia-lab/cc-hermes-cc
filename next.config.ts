import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // MCP server de Next.js DevTools en /_next/mcp (Next 16+) para quality control.
  experimental: {
    mcpServer: true,
  },
  // Parsers de documentos (Módulo 6): librerías solo-Node, no las bundlea Turbopack.
  serverExternalPackages: ['pdfjs-dist', 'mammoth', 'xlsx'],
}

export default nextConfig
