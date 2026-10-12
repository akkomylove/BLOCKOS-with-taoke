/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sql.js'],
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
