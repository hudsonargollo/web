import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import deepthought from './resources/js/lab/runtime/src/integrations/vite.ts';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/js/lab/lab.jsx',
                'resources/js/lab/preview/preview.jsx',
            ],
            refresh: [
                'app/**',
                'routes/**',
                'resources/views/**',
                'resources/lang/**',
                'lang/**',
            ],
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        tailwindcss(),
        // Serves /__krikkit_lab_sw__.js (+ legacy alias + worker) during Vite/Lab dev.
        deepthought({ path: '/__krikkit_lab_sw__.js' }),
    ],
    esbuild: {
        jsx: 'automatic',
        // Always the production JSX runtime. React 19's jsx-dev-runtime
        // exports `jsxDEV = void 0` in production, and Vite/Rolldown's CJS
        // wrap of that file can throw `Unexpected token 'var'`. Either way
        // Lab dies with `(0, P.jsxDEV) is not a function`.
        jsxDev: false,
    },
    optimizeDeps: {
        include: [
            'react',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
            'react-dom',
            'react-dom/client',
            '@uiw/react-codemirror',
            '@codemirror/lang-javascript',
            '@codemirror/lang-html',
            '@codemirror/lang-css',
            '@codemirror/lang-json',
            '@codemirror/lang-markdown',
            '@codemirror/view',
            '@codemirror/state',
            '@xterm/xterm',
            '@xterm/addon-fit',
            'html2canvas-pro',
        ],
    },
    build: {
        rolldownOptions: {
            output: {
                // Keep browser-host + engine in one graph; avoid boot before host registers.
                codeSplitting: {
                    groups: [
                        {
                            name: 'lab-runtime',
                            test: /[\\/]resources[\\/]js[\\/]lab[\\/]runtime[\\/]/,
                        },
                    ],
                },
            },
        },
    },
    server: {
        headers: {
            // SharedArrayBuffer / lean VFS when the browser grants isolation
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'credentialless',
        },
        watch: {
            ignored: [
                '**/storage/**',
                '**/vendor/phpunit/**',
                '**/vendor/laravel/**',
                '**/node_modules/**',
                '**/public/build/**',
                '**/resources/js/lab/runtime/src/**',
            ],
        },
    },
});
