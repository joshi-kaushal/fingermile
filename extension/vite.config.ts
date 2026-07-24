import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

function normalizeOrigin(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace(/\/$/, '');
  }
  return `https://${value.replace(/\/$/, '')}`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const syncHost = normalizeOrigin(env.VITE_CLERK_SYNC_HOST || 'http://localhost:5173');
  const clerkApi = normalizeOrigin(
    env.VITE_CLERK_FRONTEND_API || 'https://relaxed-fox-20.clerk.accounts.dev',
  );

  return {
    define: {
      // Clerk and dependencies expect Node's `global` in the extension popup context
      global: 'globalThis',
    },
    plugins: [
      react(),
      // Inject global polyfill into every JS chunk so Clerk's dynamically loaded
      // code-split chunks always have `global` defined in the extension context
      {
        name: 'inject-global-polyfill',
        enforce: 'post',
        generateBundle(_opts, bundle) {
          for (const [, chunk] of Object.entries(bundle)) {
            if (chunk.type === 'chunk') {
              chunk.code = `var global = globalThis;\n${chunk.code}`;
            }
          }
        },
      },
      {
        name: 'fingermile-manifest',
        closeBundle() {
          const manifestPath = resolve(__dirname, 'public/manifest.json');
          const outPath = resolve(__dirname, 'dist/manifest.json');
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

          const backendUrl = env.VITE_BACKEND_URL
            ? normalizeOrigin(env.VITE_BACKEND_URL)
            : '';

          manifest.permissions = ['storage', 'cookies'];
          manifest.host_permissions = [
            `${syncHost}/*`,
            `${clerkApi}/*`,
          ];
          if (backendUrl) {
            manifest.host_permissions.push(`${backendUrl}/*`);
          }

          fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
        },
      },
    ],
    server: {
      port: 5174,
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'index.html'),
          background: resolve(__dirname, 'src/background.ts'),
          content: resolve(__dirname, 'src/content.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
              return '[name].js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
});
