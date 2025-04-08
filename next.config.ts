/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Replace with specific domains if known
      },
    ],
  },
};
export default nextConfig;