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
        alias: {
            "@puth/core": path.resolve(import.meta.dirname, "../core/src/index.ts"),
            "@/app/store/ContextStore": path.resolve(import.meta.dirname, "./src/app/store/ContextStore"),
            "@/app/store/AppStore": path.resolve(import.meta.dirname, "./src/app/store/AppStore"),
            "@/app/store/PreviewStore": path.resolve(import.meta.dirname, "./src/app/store/PreviewStore"),
        },
    },
});
