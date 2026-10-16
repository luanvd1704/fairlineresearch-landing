// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://fairlineresearch.com',
  // Giữ đúng URL cũ: terms.astro → terms.html, phan-tich/mcm/index.astro → phan-tich/mcm/index.html
  build: { format: 'preserve' },
  // Mặc định của Astro 7 bỏ khoảng trắng giữa các thẻ theo luật JSX, làm dính chữ và nút đứng cạnh nhau
  compressHTML: false,
  devToolbar: { enabled: false },
});
