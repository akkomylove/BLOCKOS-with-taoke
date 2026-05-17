/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/sql-wasm.wasm',
        destination: '/node_modules/sql.js/dist/sql-wasm.wasm',
      },
    ];
  },
};

export default nextConfig;
