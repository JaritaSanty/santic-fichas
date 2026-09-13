import type { NextConfig } from 'next';
import { normalizeBasePath } from './src/core/paths';

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  assetPrefix: basePath === '' ? undefined : basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // Reinyecta el valor normalizado para que el cliente reciba siempre la forma canónica.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
