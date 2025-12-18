import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // replace with YOUR repo name
  base: '/latex-gui/',  // if repo is named latex-gui
});
