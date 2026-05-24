import { defineConfig } from 'drizzle-kit';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env so DATABASE_URL is available when running drizzle-kit locally
const envPath = resolve(__dirname || '.', '.env');
if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}

// NETLIFY_DATABASE_URL  → set automatically by Netlify's managed Neon integration
// DATABASE_URL          → set manually in .env for local drizzle-kit commands
const connectionUrl = process.env.NETLIFY_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionUrl) {
    throw new Error(
        'No database URL found.\n' +
        'For local usage: add DATABASE_URL to your .env file.\n' +
        'Get it from: https://console.neon.tech → Connection Details'
    );
}

export default defineConfig({
    dialect: 'postgresql',
    dbCredentials: { url: connectionUrl },
    schema: './db/schema.ts',
    out: './migrations'
});