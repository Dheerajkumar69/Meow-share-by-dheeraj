/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use App Router only for specific routes, not the home page
  experimental: {
    appDir: true
  },
  // Avoid building the app directory until we've fixed all conflicts
  transpilePackages: []
};

export default nextConfig; 