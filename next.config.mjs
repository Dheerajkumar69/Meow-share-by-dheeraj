/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use App Router only for specific routes, not the home page
  experimental: {
    appDir: true
  },
  // Avoid building the app directory until we've fixed all conflicts
  transpilePackages: [],
  // Enable strict mode
  reactStrictMode: true,
  // Add more optimization for production builds
  swcMinify: true,
  // More informative error messages
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // For development builds
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  }
};

export default nextConfig; 