import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Two build targets:
//  - default (`npm run build`): a normal static site in dist/ (React bundled). Deploy anywhere.
//  - single (`npm run build:single`): one self-contained HTML file in dist-single/,
//    with React loaded from a pinned cdnjs UMD build. Used for the hosted preview.
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
];

function cdnReact() {
  return {
    name: 'cdn-react',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const tags = CDN.map((src) => `<script crossorigin src="${src}"></script>`).join('\n');
        // UMD globals must exist before the inlined app script runs.
        return html.replace(/<script type="module"/, `${tags}\n<script`);
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    esbuild: { jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' },
    plugins: single ? [viteSingleFile(), cdnReact()] : [],
    build: single
      ? {
          outDir: 'dist-single',
          rollupOptions: {
            external: ['react', 'react-dom', 'react-dom/client'],
            output: {
              format: 'iife',
              globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' },
            },
          },
        }
      : { outDir: 'dist' },
  };
});
