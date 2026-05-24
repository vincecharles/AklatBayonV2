/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AklatBayon — Neon DB Connectivity Check
 *  Usage:  node scripts/check-db.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

// Load .env
const envPath = new URL('../.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}

const DATABASE_URL = process.env.DATABASE_URL;
const CHECKS = [];

function pass(label, detail = '') { console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); CHECKS.push(true); }
function fail(label, detail = '') { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); CHECKS.push(false); }
function info(label, detail = '') { console.log(`  ℹ️  ${label}${detail ? ': ' + detail : ''}`); }

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  AklatBayon — Neon Connectivity Check');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check 1: DATABASE_URL present
if (DATABASE_URL) {
    pass('DATABASE_URL is set');
    // Mask credentials for safe display
    try {
        const url = new URL(DATABASE_URL);
        info('Host', url.hostname);
        info('Database', url.pathname.replace('/', ''));
        info('User', url.username);
    } catch { /* invalid URL format, skip display */ }
} else {
    fail('DATABASE_URL is NOT set', 'Create a .env file with DATABASE_URL=postgresql://...');
    console.log('\n  Checklist:');
    console.log('  [ ] Go to https://console.neon.tech');
    console.log('  [ ] Select your project → Connection Details');
    console.log('  [ ] Copy the connection string (with ?sslmode=require)');
    console.log('  [ ] Paste into .env as DATABASE_URL=<paste here>');
    process.exit(1);
}

// Check 2: URL format
try {
    const url = new URL(DATABASE_URL);
    if (url.protocol === 'postgresql:' || url.protocol === 'postgres:') {
        pass('DATABASE_URL has correct protocol (postgresql://)');
    } else {
        fail('DATABASE_URL protocol should be postgresql://', `got ${url.protocol}`);
    }
    if (url.hostname.includes('neon.tech')) {
        pass('Host looks like a Neon endpoint (.neon.tech)');
    } else {
        info('Host does not contain .neon.tech — verify this is your Neon endpoint');
    }
} catch {
    fail('DATABASE_URL is not a valid URL format');
    process.exit(1);
}

// Check 3: Can instantiate neon()
let sql;
try {
    sql = neon(DATABASE_URL);
    pass('@neondatabase/serverless client created');
} catch (err) {
    fail('@neondatabase/serverless failed to initialize', err.message);
    process.exit(1);
}

// Check 4: Live query
console.log('\n  Running live query against Neon…');
try {
    const start = Date.now();
    const result = await sql`SELECT NOW() AS server_time, current_database() AS db_name, version() AS pg_version`;
    const ms = Date.now() - start;
    pass(`Connection successful (${ms}ms)`);
    info('Server time', result[0].server_time);
    info('Database', result[0].db_name);
    info('Postgres', result[0].pg_version.split(' ').slice(0, 2).join(' '));
} catch (err) {
    fail('Could not connect to Neon database', err.message);
    console.log('\n  Common causes:');
    console.log('  • Wrong DATABASE_URL — check for typos or copy-paste truncation');
    console.log('  • Neon project is suspended (free tier auto-suspends after inactivity)');
    console.log('  • Missing ?sslmode=require on the connection string');
    console.log('  • Network / firewall blocking outbound port 5432');
    process.exit(1);
}

// Check 5: Table existence
console.log('\n  Checking required tables…');
const requiredTables = ['roles', 'permissions', 'role_permissions', 'users', 'students',
    'authors', 'publishers', 'categories', 'books', 'transactions', 'fines',
    'settings', 'audit_logs', 'lcc_classes', 'inventory_incoming', 'inventory_outgoing',
    'library_sources', 'book_copies', 'harvest_errors', 'reservations', 'attendance'];

try {
    const rows = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name`;
    const existing = new Set(rows.map(r => r.table_name));

    let missingTables = 0;
    for (const t of requiredTables) {
        if (existing.has(t)) {
            pass(`Table exists: ${t}`);
        } else {
            fail(`Table MISSING: ${t}`, 'Run: npm run db:push');
            missingTables++;
        }
    }

    if (missingTables > 0) {
        console.log(`\n  ⚠️  ${missingTables} table(s) missing. Run: npm run db:push`);
    }
} catch (err) {
    fail('Could not query information_schema', err.message);
}

// Check 6: Row counts
console.log('\n  Row counts per table…');
try {
    const counts = await sql`
        SELECT 
            (SELECT COUNT(*) FROM books)        AS books,
            (SELECT COUNT(*) FROM users)        AS users,
            (SELECT COUNT(*) FROM students)     AS students,
            (SELECT COUNT(*) FROM roles)        AS roles,
            (SELECT COUNT(*) FROM transactions) AS transactions,
            (SELECT COUNT(*) FROM fines)        AS fines,
            (SELECT COUNT(*) FROM settings)     AS settings`;

    const c = counts[0];
    const seeded = Number(c.books) > 0;
    info('Books',        `${c.books} titles`);
    info('Users',        c.users);
    info('Students',     c.students);
    info('Roles',        c.roles);
    info('Transactions', c.transactions);
    info('Fines',        c.fines);
    info('Settings',     c.settings);

    if (seeded) {
        pass('Database has data — seed already applied');
    } else {
        console.log('\n  ⚠️  Database is EMPTY. Run the seed script:');
        console.log('      node scripts/seed-db.mjs');
    }
} catch (err) {
    fail('Could not read row counts', err.message);
}

// Final
const passed = CHECKS.filter(Boolean).length;
const total  = CHECKS.length;
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Result: ${passed}/${total} checks passed`);
if (passed === total) {
    console.log('  🎉 All good! Your Neon connection is healthy.');
} else {
    console.log('  ⚠️  Some checks failed. Review the errors above.');
}
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
