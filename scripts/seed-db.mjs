/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AklatBayon — Direct Neon DB Seed Script
 *  Usage:  node scripts/seed-db.mjs
 *  Needs:  DATABASE_URL set in a .env file or your shell environment
 *  Driver: @neondatabase/serverless (no build step required)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

// ── 1. Load .env if present ────────────────────────────────────────────────
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
    console.log('✅ Loaded .env file');
} else {
    console.log('ℹ️  No .env file found — relying on shell environment for DATABASE_URL');
}

// ── 2. Connect to Neon ────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set. Add it to .env or export it in your shell.');
    process.exit(1);
}

console.log(`🔗 Connecting to Neon… (${DATABASE_URL.split('@')[1]?.split('/')[0] ?? 'host hidden'})`);
const sql = neon(DATABASE_URL);

// ── 3. Seed data ────────────────────────────────────────────────────────────
const ROLES = [
    { id: 'r1', name: 'System Administrator',  description: 'IT staff — manages system configuration, user accounts, and backups' },
    { id: 'r2', name: 'Head Librarian',         description: 'Licensed professional librarian — oversees all library operations' },
    { id: 'r3', name: 'Librarian Staff',        description: 'Library assistant / circulation clerk' },
    { id: 'r4', name: 'Faculty',                description: 'Teaching and non-teaching university staff' },
    { id: 'r5', name: 'Student',                description: 'Currently enrolled FEATI students with valid ID' },
    { id: 'r6', name: 'Student Assistant',      description: 'Working student assigned to the library' },
    { id: 'r7', name: 'Guest',                  description: 'Walk-in researchers, alumni — catalog browsing only' },
];

const PERMISSIONS = [
    { id: 'p1',  name: 'can_manage_users',      label: 'Manage Users',                group: 'Users',       description: 'Create, edit, deactivate user accounts' },
    { id: 'p2',  name: 'can_manage_roles',      label: 'Manage Roles',                group: 'Users',       description: 'Manage roles and permission assignments' },
    { id: 'p3',  name: 'can_manage_students',   label: 'Manage Students',             group: 'Students',    description: 'Create, edit, delete student records' },
    { id: 'p4',  name: 'can_add_books',         label: 'Add Books',                   group: 'Catalog',     description: 'Add new books to the catalog' },
    { id: 'p5',  name: 'can_edit_books',        label: 'Edit Books',                  group: 'Catalog',     description: 'Edit existing book records' },
    { id: 'p6',  name: 'can_delete_books',      label: 'Delete Books',                group: 'Catalog',     description: 'Remove books from the catalog' },
    { id: 'p7',  name: 'can_add_categories',    label: 'Manage Catalog Entities',     group: 'Catalog',     description: 'Manage authors, publishers, and categories' },
    { id: 'p8',  name: 'can_issue_books',       label: 'Issue Books',                 group: 'Circulation', description: 'Check out books to borrowers' },
    { id: 'p9',  name: 'can_return_books',      label: 'Return Books',                group: 'Circulation', description: 'Process book returns' },
    { id: 'p10', name: 'can_manage_fines',      label: 'Manage Fines',                group: 'Finance',     description: 'Collect, waive, or manage fines' },
    { id: 'p11', name: 'can_view_reports',      label: 'View Reports',                group: 'Reports',     description: 'View circulation and library reports' },
    { id: 'p12', name: 'can_manage_settings',   label: 'Manage Settings',             group: 'System',      description: 'Modify system settings and configuration' },
    { id: 'p13', name: 'can_manage_backups',    label: 'Manage Backups',              group: 'System',      description: 'Create and restore data backups' },
    { id: 'p14', name: 'can_view_audit_logs',   label: 'View Audit Logs',             group: 'System',      description: 'View the system audit trail' },
    { id: 'p15', name: 'can_browse_catalog',    label: 'Browse Catalog',              group: 'Catalog',     description: 'Search and view the book catalog (OPAC)' },
    { id: 'p16', name: 'can_view_inventory',    label: 'View Inventory',              group: 'Reports',     description: 'View and manage inventory data' },
    { id: 'p17', name: 'can_view_attendance',   label: 'View Attendance',             group: 'Reports',     description: 'View RFID attendance reports' },
    { id: 'p18', name: 'can_view_dashboard',    label: 'View Dashboard',              group: 'General',     description: 'Access the dashboard overview page' },
    { id: 'p19', name: 'can_view_own_profile',  label: 'View Own Profile',            group: 'General',     description: 'View own user profile and loan history' },
    { id: 'p20', name: 'can_reserve_books',     label: 'Reserve Books',               group: 'Circulation', description: 'Place reservations on books' },
    { id: 'p21', name: 'can_renew_books',       label: 'Renew Books',                 group: 'Circulation', description: 'Renew own borrowed books' },
    { id: 'p22', name: 'can_recommend_books',   label: 'Recommend Books',             group: 'Catalog',     description: 'Recommend books for acquisition' },
    { id: 'p23', name: 'can_view_own_fines',    label: 'View Own Fines',              group: 'Finance',     description: 'View fines assigned to own account' },
    { id: 'p24', name: 'can_manage_incoming',   label: 'Manage Incoming Inventory',   group: 'Inventory',   description: 'Create and manage incoming stock deliveries' },
    { id: 'p25', name: 'can_manage_outgoing',   label: 'Manage Outgoing Inventory',   group: 'Inventory',   description: 'Create and manage outgoing stock removals' },
];

const ROLE_PERMISSIONS = {
    r1: ['p1','p2','p12','p13','p14','p15','p18','p19'],
    r2: ['p3','p4','p5','p6','p7','p8','p9','p10','p11','p14','p15','p16','p17','p18','p19','p20','p21','p22'],
    r3: ['p5','p8','p9','p10','p15','p16','p18','p19','p20','p21'],
    r4: ['p15','p19','p20','p21','p22','p23'],
    r5: ['p15','p19','p23'],
    r6: ['p3','p8','p9','p10','p15','p18','p19','p20','p21','p23'],
    r7: ['p15'],
};

const AUTHORS = [
    { id: 'a1', name: 'Jose Rizal',      bio: 'Philippine national hero and author' },
    { id: 'a2', name: 'Nick Joaquin',    bio: 'National Artist for Literature' },
    { id: 'a3', name: 'Robert C. Martin', bio: 'Software engineering author' },
    { id: 'a4', name: 'Gary Provost',    bio: 'Author and writing instructor' },
    { id: 'a5', name: 'Eric Evans',      bio: 'Domain-driven design pioneer' },
];

const PUBLISHERS = [
    { id: 'pub1', name: 'Anvil Publishing',  address: 'Quezon City, PH',       contact: '(02) 8477-4752' },
    { id: 'pub2', name: 'Pearson Education', address: 'New York, USA',          contact: '+1-800-848-9500' },
    { id: 'pub3', name: 'OReilly Media',     address: 'Sebastopol, CA, USA',   contact: '+1-707-827-7000' },
    { id: 'pub4', name: 'Addison-Wesley',    address: 'Boston, MA, USA',       contact: '+1-617-848-7000' },
    { id: 'pub5', name: 'Rex Book Store',    address: 'Manila, PH',             contact: '(02) 8324-4877' },
];

const CATEGORIES = [
    { id: 'c1', name: 'Fiction',       description: 'Fictional literature',    parent_id: null },
    { id: 'c2', name: 'Non-Fiction',   description: 'Non-fictional works',     parent_id: null },
    { id: 'c3', name: 'Science',       description: 'Science books',           parent_id: 'c2' },
    { id: 'c4', name: 'Technology',    description: 'Information technology',  parent_id: 'c2' },
    { id: 'c5', name: 'Literature',    description: 'Classic literature',      parent_id: 'c1' },
    { id: 'c6', name: 'Engineering',   description: 'Engineering references',  parent_id: 'c4' },
    { id: 'c7', name: 'Philippine Studies', description: 'Philippine history, culture, and society', parent_id: 'c2' },
];

// 20 books with realistic FEATI University library content
const BOOKS = [
    // ── Philippine Literature ──────────────────────────────────────────
    { id: 'b1',  title: 'Noli Me Tangere',                        isbn: '978-971-27-2800-0', author_id: 'a1', publisher_id: 'pub1', category_id: 'c5', call_number: 'PQ8896.R5 N65',  copies: 5, available: 4, year: 1887, status: 'active' },
    { id: 'b2',  title: 'El Filibusterismo',                      isbn: '978-971-27-2801-7', author_id: 'a1', publisher_id: 'pub1', category_id: 'c5', call_number: 'PQ8896.R5 E43',  copies: 3, available: 3, year: 1891, status: 'active' },
    { id: 'b3',  title: 'The Woman Who Had Two Navels',           isbn: '978-0-14-303035-0', author_id: 'a2', publisher_id: 'pub1', category_id: 'c5', call_number: 'PR9550.9.J6 W66', copies: 2, available: 2, year: 1961, status: 'active' },
    { id: 'b4',  title: 'Cave and Shadows',                       isbn: '978-0-14-303036-7', author_id: 'a2', publisher_id: 'pub1', category_id: 'c5', call_number: 'PR9550.9.J6 C38', copies: 2, available: 2, year: 1983, status: 'active' },
    // ── Software Engineering ──────────────────────────────────────────
    { id: 'b5',  title: 'Clean Code',                             isbn: '978-0-13-235088-4', author_id: 'a3', publisher_id: 'pub2', category_id: 'c4', call_number: 'QA76.76.D47 M37', copies: 3, available: 2, year: 2008, status: 'active' },
    { id: 'b6',  title: 'Clean Architecture',                     isbn: '978-0-13-449416-6', author_id: 'a3', publisher_id: 'pub3', category_id: 'c4', call_number: 'QA76.754 M37',    copies: 4, available: 3, year: 2017, status: 'active' },
    { id: 'b7',  title: 'The Clean Coder',                        isbn: '978-0-13-708107-3', author_id: 'a3', publisher_id: 'pub2', category_id: 'c4', call_number: 'QA76.6 M37',      copies: 2, available: 2, year: 2011, status: 'active' },
    { id: 'b8',  title: 'Domain-Driven Design',                   isbn: '978-0-32-112521-7', author_id: 'a5', publisher_id: 'pub4', category_id: 'c4', call_number: 'QA76.76.D47 E93', copies: 2, available: 1, year: 2003, status: 'active' },
    // ── Computer Science / Textbooks ─────────────────────────────────
    { id: 'b9',  title: 'Introduction to Algorithms (CLRS)',      isbn: '978-0-26-204630-5', author_id: 'a4', publisher_id: 'pub2', category_id: 'c4', call_number: 'QA76.9.A43 C67',  copies: 4, available: 4, year: 2022, status: 'active' },
    { id: 'b10', title: 'Computer Networks',                       isbn: '978-0-13-292484-2', author_id: 'a4', publisher_id: 'pub2', category_id: 'c4', call_number: 'TK5105.5 T36',    copies: 3, available: 3, year: 2021, status: 'active' },
    { id: 'b11', title: 'Operating System Concepts (Dinosaur)',    isbn: '978-1-11-906333-0', author_id: 'a4', publisher_id: 'pub2', category_id: 'c4', call_number: 'QA76.76.O63 S54', copies: 3, available: 2, year: 2018, status: 'active' },
    { id: 'b12', title: 'Database System Concepts',               isbn: '978-1-26-002296-6', author_id: 'a4', publisher_id: 'pub2', category_id: 'c4', call_number: 'QA76.9.D3 S55',   copies: 2, available: 2, year: 2020, status: 'active' },
    // ── Engineering ──────────────────────────────────────────────────
    { id: 'b13', title: 'Engineering Mathematics',                isbn: '978-0-23-033830-0', author_id: 'a4', publisher_id: 'pub4', category_id: 'c6', call_number: 'QA37.3 S897',      copies: 5, available: 4, year: 2019, status: 'active' },
    { id: 'b14', title: 'Electronics and Circuit Analysis',        isbn: '978-0-13-241985-1', author_id: 'a4', publisher_id: 'pub2', category_id: 'c6', call_number: 'TK7816 S74',       copies: 3, available: 3, year: 2015, status: 'active' },
    { id: 'b15', title: 'Fundamentals of Electric Circuits',       isbn: '978-0-07-352955-4', author_id: 'a4', publisher_id: 'pub2', category_id: 'c6', call_number: 'TK454 A38',        copies: 4, available: 4, year: 2016, status: 'active' },
    // ── General Science ──────────────────────────────────────────────
    { id: 'b16', title: 'A Brief History of Time',                isbn: '978-0-55-317349-8', author_id: 'a4', publisher_id: 'pub3', category_id: 'c3', call_number: 'QB981 H377',       copies: 2, available: 2, year: 1988, status: 'active' },
    { id: 'b17', title: 'The Selfish Gene',                        isbn: '978-0-19-857519-1', author_id: 'a4', publisher_id: 'pub3', category_id: 'c3', call_number: 'QH437 D38',        copies: 2, available: 2, year: 1976, status: 'active' },
    // ── Philippine Studies ───────────────────────────────────────────
    { id: 'b18', title: 'Philippine History and Government',      isbn: '978-971-23-5004-6', author_id: 'a4', publisher_id: 'pub5', category_id: 'c7', call_number: 'DS672 Z35',         copies: 6, available: 5, year: 2016, status: 'active' },
    { id: 'b19', title: 'Values Education: A Filipino Perspective', isbn: '978-971-23-4110-5', author_id: 'a4', publisher_id: 'pub5', category_id: 'c7', call_number: 'LC311 C37',        copies: 4, available: 4, year: 2014, status: 'active' },
    { id: 'b20', title: 'Panitikang Pilipino',                    isbn: '978-971-05-1400-8', author_id: 'a4', publisher_id: 'pub5', category_id: 'c5', call_number: 'PL5940 P35',       copies: 5, available: 5, year: 2018, status: 'active' },
];

const USERS = [
    { id: 'u1', name: 'Admin User',     username: 'admin',     password: 'admin123', email: 'admin@feati.edu.ph',     role_id: 'r1', faculty_subtype: null, rfid_id: 'RFID-ADMIN-001', student_id: null, status: 'active' },
    { id: 'u2', name: 'Head Librarian', username: 'librarian', password: 'lib123',   email: 'librarian@feati.edu.ph', role_id: 'r2', faculty_subtype: null, rfid_id: 'RFID-LIB-001',   student_id: null, status: 'active' },
    { id: 'u3', name: 'Faculty Member', username: 'faculty1',  password: 'fac123',   email: 'faculty1@feati.edu.ph',  role_id: 'r4', faculty_subtype: 'Teaching', rfid_id: 'RFID-FAC-001', student_id: null, status: 'active' },
    { id: 'u4', name: 'Student User',   username: 'student1',  password: 'stud123',  email: 'student1@feati.edu.ph',  role_id: 'r5', faculty_subtype: null, rfid_id: null, student_id: 's1', status: 'active' },
];

const STUDENTS = [
    { id: 's1', student_id: '2024-0001', name: 'Carlo Mendoza',  email: 'carlo@feati.edu.ph',  grade_level: 'College', section: 'BSIT-3A', contact: '09171234567', status: 'active' },
    { id: 's2', student_id: '2024-0002', name: 'Sofia Torres',   email: 'sofia@feati.edu.ph',  grade_level: 'College', section: 'BSCS-2B', contact: '09181234567', status: 'active' },
    { id: 's3', student_id: '2024-0003', name: 'Miguel Bautista', email: 'miguel@feati.edu.ph', grade_level: 'College', section: 'BSIT-1A', contact: '09191234567', status: 'active' },
    { id: 's4', student_id: '2024-0004', name: 'Ana Reyes',      email: 'ana@feati.edu.ph',    grade_level: 'College', section: 'BSEcE-2A', contact: '09201234567', status: 'active' },
    { id: 's5', student_id: '2024-0005', name: 'Juan dela Cruz', email: 'juan@feati.edu.ph',   grade_level: 'College', section: 'BSME-1B',  contact: '09211234567', status: 'active' },
];

const SETTINGS = [
    { id: 'set1',  key: 'library_name',                          value: 'FEATI University Library',  label: 'Library Name' },
    { id: 'set2',  key: 'fine_per_day',                          value: '5',   label: 'Default Fine Per Day (₱)' },
    { id: 'set10', key: 'borrow_head_librarian_max_books',       value: '15',  label: 'Head Librarian — Max Books' },
    { id: 'set11', key: 'borrow_head_librarian_loan_days',       value: '60',  label: 'Head Librarian — Loan Days' },
    { id: 'set12', key: 'borrow_head_librarian_max_renewals',    value: '3',   label: 'Head Librarian — Max Renewals' },
    { id: 'set13', key: 'borrow_head_librarian_fine_per_day',    value: '2',   label: 'Head Librarian — Fine/Day (₱)' },
    { id: 'set60', key: 'borrow_student_max_books',              value: '3',   label: 'Student — Max Books' },
    { id: 'set61', key: 'borrow_student_loan_days',              value: '7',   label: 'Student — Loan Days' },
    { id: 'set62', key: 'borrow_student_max_renewals',           value: '1',   label: 'Student — Max Renewals' },
    { id: 'set63', key: 'borrow_student_fine_per_day',           value: '5',   label: 'Student — Fine/Day (₱)' },
    { id: 'set30', key: 'borrow_faculty_teaching_max_books',     value: '10',  label: 'Faculty (Teaching) — Max Books' },
    { id: 'set31', key: 'borrow_faculty_teaching_loan_days',     value: '30',  label: 'Faculty (Teaching) — Loan Days' },
    { id: 'set32', key: 'borrow_faculty_teaching_max_renewals',  value: '2',   label: 'Faculty (Teaching) — Max Renewals' },
    { id: 'set33', key: 'borrow_faculty_teaching_fine_per_day',  value: '5',   label: 'Faculty (Teaching) — Fine/Day (₱)' },
    { id: 'set80', key: 'reservation_max_student',               value: '2',   label: 'Student — Max Active Reservations' },
    { id: 'set81', key: 'reservation_max_faculty',               value: '5',   label: 'Faculty — Max Active Reservations' },
    { id: 'set82', key: 'reservation_expiry_hours',              value: '48',  label: 'Reservation Claim Window (hours)' },
    { id: 'set83', key: 'fine_block_threshold',                  value: '100', label: 'Fine Block Threshold (₱)' },
];

const TRANSACTIONS = [
    { id: 't1', student_id: 's1', book_id: 'b1', type: 'borrow', date_issued: '2026-03-20', date_due: '2026-03-27', date_returned: null,         renewal_count: 0, status: 'borrowed' },
    { id: 't2', student_id: 's2', book_id: 'b5', type: 'borrow', date_issued: '2026-03-15', date_due: '2026-03-22', date_returned: '2026-03-21', renewal_count: 0, status: 'returned' },
    { id: 't3', student_id: 's3', book_id: 'b8', type: 'borrow', date_issued: '2026-03-10', date_due: '2026-03-17', date_returned: null,         renewal_count: 1, status: 'borrowed' },
    { id: 't4', student_id: 's4', book_id: 'b6', type: 'borrow', date_issued: '2026-04-01', date_due: '2026-04-08', date_returned: null,         renewal_count: 0, status: 'borrowed' },
];

const FINES = [
    { id: 'f1', student_id: 's1', transaction_id: 't1', amount: '50.00', reason: 'Overdue return', status: 'pending' },
    { id: 'f2', student_id: 's3', transaction_id: 't3', amount: '35.00', reason: 'Overdue return', status: 'pending' },
];

// ── 4. Helper: await a neon query Promise with error handling ──────────────
async function run(queryPromise, description) {
    try {
        await queryPromise;
        console.log(`  ✔ ${description}`);
    } catch (err) {
        if (err.code === '23505') { // unique_violation — already exists
            console.log(`  ⟳ ${description} — already exists (skipped)`);
        } else {
            console.error(`  ✘ ${description} — FAILED: ${err.message}`);
            throw err;
        }
    }
}

// ── 5. Main seeder ─────────────────────────────────────────────────────────
async function seed() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  AklatBayon DB Seed — Starting');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ── Step 1: Roles ────────────────────────────────────────────────
    console.log('📋 Seeding roles…');
    for (const r of ROLES) {
        await run(
            sql`INSERT INTO roles (id, name, description)
                VALUES (${r.id}, ${r.name}, ${r.description})
                ON CONFLICT (id) DO NOTHING`,
            `Role: ${r.name}`
        );
    }

    // ── Step 2: Permissions ──────────────────────────────────────────
    console.log('\n🔑 Seeding permissions…');
    for (const p of PERMISSIONS) {
        await run(
            sql`INSERT INTO permissions (id, name, label, "group", description)
                VALUES (${p.id}, ${p.name}, ${p.label}, ${p.group}, ${p.description})
                ON CONFLICT (id) DO NOTHING`,
            `Permission: ${p.label}`
        );
    }

    // ── Step 3: Role-Permission mappings ────────────────────────────
    console.log('\n🔗 Seeding role-permission mappings…');
    for (const [roleId, permIds] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permId of permIds) {
            await run(
                sql`INSERT INTO role_permissions (role_id, permission_id)
                    VALUES (${roleId}, ${permId})
                    ON CONFLICT (role_id, permission_id) DO NOTHING`,
                `${roleId} → ${permId}`
            );
        }
    }

    // ── Step 4: Authors ──────────────────────────────────────────────
    console.log('\n✍️  Seeding authors…');
    for (const a of AUTHORS) {
        await run(
            sql`INSERT INTO authors (id, name, bio)
                VALUES (${a.id}, ${a.name}, ${a.bio})
                ON CONFLICT (id) DO NOTHING`,
            `Author: ${a.name}`
        );
    }

    // ── Step 5: Publishers ──────────────────────────────────────────
    console.log('\n🏢 Seeding publishers…');
    for (const p of PUBLISHERS) {
        await run(
            sql`INSERT INTO publishers (id, name, address, contact)
                VALUES (${p.id}, ${p.name}, ${p.address}, ${p.contact})
                ON CONFLICT (id) DO NOTHING`,
            `Publisher: ${p.name}`
        );
    }

    // ── Step 6: Categories ──────────────────────────────────────────
    console.log('\n🏷️  Seeding categories…');
    // Insert parent categories first, then children
    const parents = CATEGORIES.filter(c => !c.parent_id);
    const children = CATEGORIES.filter(c => c.parent_id);
    for (const c of [...parents, ...children]) {
        await run(
            sql`INSERT INTO categories (id, name, description, parent_id)
                VALUES (${c.id}, ${c.name}, ${c.description}, ${c.parent_id ?? null})
                ON CONFLICT (id) DO NOTHING`,
            `Category: ${c.name}`
        );
    }

    // ── Step 7: Books ────────────────────────────────────────────────
    console.log('\n📚 Seeding books (catalog)…');
    for (const b of BOOKS) {
        await run(
            sql`INSERT INTO books (id, title, isbn, author_id, publisher_id, category_id, call_number, year, copies, available, status)
                VALUES (${b.id}, ${b.title}, ${b.isbn}, ${b.author_id}, ${b.publisher_id}, ${b.category_id}, ${b.call_number}, ${b.year}, ${b.copies}, ${b.available}, ${b.status})
                ON CONFLICT (id) DO NOTHING`,
            `Book [${b.isbn}]: ${b.title}`
        );
    }

    // ── Step 8: Students ────────────────────────────────────────────
    console.log('\n🎓 Seeding students…');
    for (const s of STUDENTS) {
        await run(
            sql`INSERT INTO students (id, student_id, name, email, grade_level, section, contact, status)
                VALUES (${s.id}, ${s.student_id}, ${s.name}, ${s.email}, ${s.grade_level}, ${s.section}, ${s.contact}, ${s.status})
                ON CONFLICT (id) DO NOTHING`,
            `Student: ${s.name} (${s.student_id})`
        );
    }

    // ── Step 9: Users ────────────────────────────────────────────────
    console.log('\n👤 Seeding users…');
    for (const u of USERS) {
        await run(
            sql`INSERT INTO users (id, name, username, password, email, role_id, faculty_subtype, rfid_id, student_id, status)
                VALUES (${u.id}, ${u.name}, ${u.username}, ${u.password}, ${u.email}, ${u.role_id}, ${u.faculty_subtype ?? null}, ${u.rfid_id ?? null}, ${u.student_id ?? null}, ${u.status})
                ON CONFLICT (id) DO NOTHING`,
            `User: ${u.name} (${u.username})`
        );
    }

    // ── Step 10: Settings ────────────────────────────────────────────
    console.log('\n⚙️  Seeding settings…');
    for (const s of SETTINGS) {
        await run(
            sql`INSERT INTO settings (id, key, value, label)
                VALUES (${s.id}, ${s.key}, ${s.value}, ${s.label})
                ON CONFLICT (id) DO NOTHING`,
            `Setting: ${s.key}`
        );
    }

    // ── Step 11: Transactions ────────────────────────────────────────
    console.log('\n🔄 Seeding transactions…');
    for (const t of TRANSACTIONS) {
        await run(
            sql`INSERT INTO transactions (id, student_id, book_id, type, date_issued, date_due, date_returned, renewal_count, status)
                VALUES (${t.id}, ${t.student_id}, ${t.book_id}, ${t.type}, ${t.date_issued}, ${t.date_due}, ${t.date_returned ?? null}, ${t.renewal_count}, ${t.status})
                ON CONFLICT (id) DO NOTHING`,
            `Transaction: ${t.id} (${t.status})`
        );
    }

    // ── Step 12: Fines ──────────────────────────────────────────────
    console.log('\n💰 Seeding fines…');
    for (const f of FINES) {
        await run(
            sql`INSERT INTO fines (id, student_id, transaction_id, amount, reason, status)
                VALUES (${f.id}, ${f.student_id}, ${f.transaction_id}, ${f.amount}, ${f.reason}, ${f.status})
                ON CONFLICT (id) DO NOTHING`,
            `Fine: ${f.id} (₱${f.amount})`
        );
    }

    // ── Step 13: Audit log ──────────────────────────────────────────
    await run(
        sql`INSERT INTO audit_logs (id, "user", action, entity, details)
            VALUES ('log-seed-1', 'System', 'SEED', 'system', 'Initial data seeded via scripts/seed-db.mjs')
            ON CONFLICT (id) DO NOTHING`,
        'Audit log entry'
    );

    // ── Final summary ────────────────────────────────────────────────
    const [{ count }] = await sql`SELECT COUNT(*) AS count FROM books`;
    const [{ copies }] = await sql`SELECT SUM(copies) AS copies FROM books`;
    const [{ users_count }] = await sql`SELECT COUNT(*) AS users_count FROM users`;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ Seed complete!');
    console.log(`  📚 Total book titles in DB: ${count}`);
    console.log(`  📦 Total physical copies:   ${copies}`);
    console.log(`  👤 Total users:             ${users_count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed().catch((err) => {
    console.error('\n❌ Seed script crashed:', err.message);
    process.exit(1);
});
