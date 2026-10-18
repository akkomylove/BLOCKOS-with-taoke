/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow isolated builds/tests without disturbing another running workspace server.
  distDir: process.env.BLOCKOS_BUILD_DIR || '.next',
  typescript: { tsconfigPath: process.env.BLOCKOS_TSCONFIG_PATH || 'tsconfig.json' },
  serverExternalPackages: ['sql.js'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/sql-wasm.wasm',
        destination: '/sql-wasm.wasm',
      },
    ];
  },
};

export default nextConfig;
