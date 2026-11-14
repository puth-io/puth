import path from "path";
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        // Puth opens the dev server of the Compose environment by its service name.
        allowedHosts: ['gui'],
    },
    resolve: {
        // The docs keep React 18 at the root for vitepress, which hoisted libraries like Radix would resolve. One copy
        // of React must serve the whole GUI.
        dedupe: ['react', 'react-dom'],
        alias: [
            {find: "@puth/core", replacement: path.resolve(import.meta.dirname, "../core/src/index.ts")},
            // Only the module itself: its zstd-decoder.wasm comes from the package, like for any other dependency.
            {find: /^@puth\/zstd-decoder$/, replacement: path.resolve(import.meta.dirname, "../zstd-decoder/src/zstd.ts")},
            {find: /^@puth\/zstd-encoder$/, replacement: path.resolve(import.meta.dirname, "../zstd-encoder/src/zstd.ts")},
            {find: "@/app/store/ContextStore", replacement: path.resolve(import.meta.dirname, "./src/app/store/ContextStore")},
            {find: "@/app/store/AppStore", replacement: path.resolve(import.meta.dirname, "./src/app/store/AppStore")},
            {find: "@/app/store/PreviewStore", replacement: path.resolve(import.meta.dirname, "./src/app/store/PreviewStore")},
        ],
    },
});
