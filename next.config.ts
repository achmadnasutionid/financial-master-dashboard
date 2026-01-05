import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable gzip compression for responses
  compress: true,
  
  // Optimize production builds
  poweredByHeader: false, // Remove X-Powered-By header for security
  
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Experimental features for performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      'lucide-react',
      '@react-pdf/renderer',
      'recharts',
    ],
  },
};

export default nextConfig;
