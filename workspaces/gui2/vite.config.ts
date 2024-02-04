import path from "path";
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@/app/store/ContextStore": path.resolve(__dirname, "./src/app/store/ContextStore"),
            "@/app/store/AppStore": path.resolve(__dirname, "./src/app/store/AppStore"),
        },
    },
});
