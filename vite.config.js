import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: [
                'robots.txt',
                'ios-icon-180.png',
                'maskable-512.png',
                'offline.html'
            ],
            manifest: {
                name: 'DoorDash Order Decider',
                short_name: 'Decider',
                start_url: '/',
                display: 'standalone',
                background_color: '#ffffff',
                theme_color: '#111827',
                icons: [
                    { src: '/ios-icon-180.png', sizes: '180x180', type: 'image/png' },
                    { src: '/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                navigateFallback: '/offline.html',
            },
            devOptions: {
                enabled: true // lets you test SW in dev (optional)
            }
        })
    ]
});
