import type { NextConfig } from 'next'

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  {
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: '*.cloudinary.com',
    pathname: '/**',
  },
]

const s3Base = process.env.S3_PUBLIC_BASE_URL
if (s3Base) {
  try {
    const parsed = new URL(s3Base)
    remotePatterns.push({
      protocol: parsed.protocol === 'http:' ? 'http' : 'https',
      hostname: parsed.hostname,
      port: parsed.port || '',
      pathname: '/**',
    })
  } catch {
    // Ignore malformed optional S3_PUBLIC_BASE_URL during build
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns,
  },
}

export default nextConfig
