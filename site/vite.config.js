import { defineConfig } from 'vite';

// GitHub project pages: https://takewtnb.github.io/thesis-ppe/
export default defineConfig({
  base: '/thesis-ppe/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
