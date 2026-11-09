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
        alias: {
            "@puth/core": path.resolve(__dirname, "../core/src/index.ts"),
            "@/app/store/ContextStore": path.resolve(__dirname, "./src/app/store/ContextStore"),
            "@/app/store/AppStore": path.resolve(__dirname, "./src/app/store/AppStore"),
            "@/app/store/PreviewStore": path.resolve(__dirname, "./src/app/store/PreviewStore"),
        },
    },
});
