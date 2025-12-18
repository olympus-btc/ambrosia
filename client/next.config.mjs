/** @type {import('next').NextConfig} */
const nextConfig = {
  // Crea bundle optimizado con deps minificadas para Electron
  output: 'standalone',

  // Configuración de imágenes para Electron
  images: {
    unoptimized: true, // Necesario para Electron
  },

  // Deshabilitar telemetría
  telemetry: false,

  // Configuración de headers (mantener CORS para desarrollo)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
