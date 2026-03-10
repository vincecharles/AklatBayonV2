import type { Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import {
    roles, permissions, rolePermissions, users, students, authors,
    publishers, categories, books, transactions, fines,
    auditLogs, settings, lccClasses
} from "../../db/schema.js";
import { sql } from "drizzle-orm";

// Seed data — mirrors the localStorage seed from js/store.js
const seedData = {
    roles: [
        { id: 'r1', name: 'System Administrator', description: 'IT staff — manages system configuration, user accounts, and backups' },
        { id: 'r2', name: 'Head Librarian', description: 'Licensed professional librarian — oversees all library operations, cataloging, reports, and collection development' },
        { id: 'r3', name: 'Librarian Staff', description: 'Library assistant / circulation clerk — handles front-desk operations under Head Librarian supervision' },
        { id: 'r4', name: 'Faculty', description: 'Teaching and non-teaching university staff (subtypes: Teaching, Non-Teaching, Department Chair, Department Head)' },
        { id: 'r5', name: 'Student', description: 'Currently enrolled FEATI students with valid ID' },
        { id: 'r6', name: 'Student Assistant', description: 'Working student assigned to the library under scholarship program' },
        { id: 'r7', name: 'Guest', description: 'Walk-in researchers, alumni, inter-library visitors — catalog browsing only' }
    ],
    permissions: [
        { id: 'p1', name: 'can_manage_users', label: 'Manage Users', group: 'Users', description: 'Create, edit, deactivate user accounts' },
        { id: 'p2', name: 'can_manage_roles', label: 'Manage Roles', group: 'Users', description: 'Manage roles and permission assignments' },
        { id: 'p3', name: 'can_manage_students', label: 'Manage Students', group: 'Students', description: 'Create, edit, delete student records' },
        { id: 'p4', name: 'can_add_books', label: 'Add Books', group: 'Catalog', description: 'Add new books to the catalog' },
        { id: 'p5', name: 'can_edit_books', label: 'Edit Books', group: 'Catalog', description: 'Edit existing book records' },
        { id: 'p6', name: 'can_delete_books', label: 'Delete Books', group: 'Catalog', description: 'Remove books from the catalog' },
        { id: 'p7', name: 'can_add_categories', label: 'Manage Catalog Entities', group: 'Catalog', description: 'Manage authors, publishers, and categories' },
        { id: 'p15', name: 'can_browse_catalog', label: 'Browse Catalog', group: 'Catalog', description: 'Search and view the book catalog (OPAC)' },
        { id: 'p8', name: 'can_issue_books', label: 'Issue Books', group: 'Circulation', description: 'Check out books to borrowers' },
        { id: 'p9', name: 'can_return_books', label: 'Return Books', group: 'Circulation', description: 'Process book returns' },
        { id: 'p20', name: 'can_reserve_books', label: 'Reserve Books', group: 'Circulation', description: 'Place reservations on books' },
        { id: 'p21', name: 'can_renew_books', label: 'Renew Books', group: 'Circulation', description: 'Renew own borrowed books' },
        { id: 'p10', name: 'can_manage_fines', label: 'Manage Fines', group: 'Finance', description: 'Collect, waive, or manage fines' },
        { id: 'p11', name: 'can_view_reports', label: 'View Reports', group: 'Reports', description: 'View circulation and library reports' },
        { id: 'p16', name: 'can_view_inventory', label: 'View Inventory', group: 'Reports', description: 'View and manage inventory data' },
        { id: 'p17', name: 'can_view_attendance', label: 'View Attendance', group: 'Reports', description: 'View RFID attendance reports' },
        { id: 'p12', name: 'can_manage_settings', label: 'Manage Settings', group: 'System', description: 'Modify system settings and configuration' },
        { id: 'p13', name: 'can_manage_backups', label: 'Manage Backups', group: 'System', description: 'Create and restore data backups' },
        { id: 'p14', name: 'can_view_audit_logs', label: 'View Audit Logs', group: 'System', description: 'View the system audit trail' },
        { id: 'p18', name: 'can_view_dashboard', label: 'View Dashboard', group: 'General', description: 'Access the dashboard overview page' },
        { id: 'p19', name: 'can_view_own_profile', label: 'View Own Profile', group: 'General', description: 'View own user profile and loan history' },
        { id: 'p22', name: 'can_recommend_books', label: 'Recommend Books', group: 'Catalog', description: 'Recommend books for acquisition' },
        { id: 'p23', name: 'can_view_own_fines', label: 'View Own Fines', group: 'Finance', description: 'View fines assigned to own account' }
    ],
    rolePerms: {
        'r1': ['p1','p2','p12','p13','p14','p15','p18','p19'],
        'r2': ['p3','p4','p5','p6','p7','p8','p9','p10','p11','p14','p15','p16','p17','p18','p19','p20','p21','p22'],
        'r3': ['p5','p8','p9','p10','p15','p16','p18','p19','p20','p21'],
        'r4': ['p15','p19','p20','p21','p22','p23'],
        'r5': ['p15','p19','p23'],
        'r6': ['p3','p8','p9','p10','p15','p18','p19','p20','p21','p23'],
        'r7': ['p15']
    },
    users: [
        { id: 'u1', name: 'Admin User', username: 'admin', password: 'admin123', email: 'admin@feati.edu.ph', roleId: 'r1', facultySubtype: null, rfidId: 'RFID-ADMIN-001', studentId: null, status: 'active' }
    ],
    students: [
        { id: 's1', studentId: '2024-0001', name: 'Carlo Mendoza', email: 'carlo@aklatbayon.edu', gradeLevel: 'College', section: 'BSIT-3A', contact: '09171234567', status: 'active' },
        { id: 's2', studentId: '2024-0002', name: 'Sofia Torres', email: 'sofia@aklatbayon.edu', gradeLevel: 'College', section: 'BSCS-2B', contact: '09181234567', status: 'active' },
        { id: 's3', studentId: '2024-0003', name: 'Miguel Bautista', email: 'miguel@aklatbayon.edu', gradeLevel: 'College', section: 'BSIT-1A', contact: '09191234567', status: 'active' }
    ],
    categories: [
        { id: 'c1', name: 'Fiction', description: 'Fictional literature', parentId: null },
        { id: 'c2', name: 'Non-Fiction', description: 'Non-fictional works', parentId: null },
        { id: 'c3', name: 'Science', description: 'Science books', parentId: 'c2' },
        { id: 'c4', name: 'Technology', description: 'Information technology', parentId: 'c2' },
        { id: 'c5', name: 'Literature', description: 'Classic literature', parentId: 'c1' }
    ],
    authors: [
        { id: 'a1', name: 'Jose Rizal', bio: 'Philippine national hero and author' },
        { id: 'a2', name: 'Nick Joaquin', bio: 'National Artist for Literature' },
        { id: 'a3', name: 'Robert C. Martin', bio: 'Software engineering author' }
    ],
    publishers: [
        { id: 'pub1', name: 'Anvil Publishing', address: 'Quezon City, PH', contact: '(02) 8477-4752' },
        { id: 'pub2', name: 'Pearson Education', address: 'New York, USA', contact: '+1-800-848-9500' },
        { id: 'pub3', name: 'OReilly Media', address: 'Sebastopol, CA', contact: '+1-707-827-7000' }
    ],
    books: [
        { id: 'b1', title: 'Noli Me Tangere', isbn: '978-971-27-2800-0', authorId: 'a1', publisherId: 'pub1', categoryId: 'c5', callNumber: 'PQ8896.R5', copies: 5, available: 4, year: 1887, status: 'active' },
        { id: 'b2', title: 'El Filibusterismo', isbn: '978-971-27-2801-7', authorId: 'a1', publisherId: 'pub1', categoryId: 'c5', callNumber: 'PQ8896.R5', copies: 3, available: 3, year: 1891, status: 'active' },
        { id: 'b3', title: 'Clean Code', isbn: '978-0-13-235088-4', authorId: 'a3', publisherId: 'pub2', categoryId: 'c4', callNumber: 'QA76.76.D47', copies: 2, available: 1, year: 2008, status: 'active' },
        { id: 'b4', title: 'The Woman Who Had Two Navels', isbn: '978-0-14-303035-0', authorId: 'a2', publisherId: 'pub1', categoryId: 'c5', callNumber: 'PR9550.9.J6', copies: 2, available: 2, year: 1961, status: 'active' },
        { id: 'b5', title: 'Clean Architecture', isbn: '978-0-13-449416-6', authorId: 'a3', publisherId: 'pub3', categoryId: 'c4', callNumber: 'QA76.754', copies: 4, available: 3, year: 2017, status: 'active' }
    ],
    transactions: [
        { id: 't1', studentId: 's1', bookId: 'b1', type: 'borrow', dateIssued: '2026-02-20', dateDue: '2026-03-06', dateReturned: null, renewalCount: 0, status: 'borrowed' },
        { id: 't2', studentId: 's2', bookId: 'b3', type: 'borrow', dateIssued: '2026-02-15', dateDue: '2026-03-01', dateReturned: '2026-02-25', renewalCount: 0, status: 'returned' }
    ],
    fines: [
        { id: 'f1', studentId: 's1', transactionId: 't1', amount: '50.00', reason: 'Overdue return', status: 'pending' }
    ],
    settings: [
        { id: 'set1', key: 'library_name', value: 'FEATI University Library', label: 'Library Name' },
        { id: 'set2', key: 'fine_per_day', value: '5', label: 'Default Fine Per Day (₱)' },
        { id: 'set10', key: 'borrow_head_librarian_max_books', value: '15', label: 'Head Librarian — Max Books' },
        { id: 'set11', key: 'borrow_head_librarian_loan_days', value: '60', label: 'Head Librarian — Loan Days' },
        { id: 'set12', key: 'borrow_head_librarian_max_renewals', value: '3', label: 'Head Librarian — Max Renewals' },
        { id: 'set13', key: 'borrow_head_librarian_fine_per_day', value: '2', label: 'Head Librarian — Fine/Day (₱)' },
        { id: 'set20', key: 'borrow_librarian_staff_max_books', value: '10', label: 'Librarian Staff — Max Books' },
        { id: 'set21', key: 'borrow_librarian_staff_loan_days', value: '30', label: 'Librarian Staff — Loan Days' },
        { id: 'set22', key: 'borrow_librarian_staff_max_renewals', value: '2', label: 'Librarian Staff — Max Renewals' },
        { id: 'set23', key: 'borrow_librarian_staff_fine_per_day', value: '3', label: 'Librarian Staff — Fine/Day (₱)' },
        { id: 'set30', key: 'borrow_faculty_teaching_max_books', value: '10', label: 'Faculty (Teaching) — Max Books' },
        { id: 'set31', key: 'borrow_faculty_teaching_loan_days', value: '30', label: 'Faculty (Teaching) — Loan Days' },
        { id: 'set32', key: 'borrow_faculty_teaching_max_renewals', value: '2', label: 'Faculty (Teaching) — Max Renewals' },
        { id: 'set33', key: 'borrow_faculty_teaching_fine_per_day', value: '5', label: 'Faculty (Teaching) — Fine/Day (₱)' },
        { id: 'set40', key: 'borrow_faculty_nonteaching_max_books', value: '5', label: 'Faculty (Non-Teaching) — Max Books' },
        { id: 'set41', key: 'borrow_faculty_nonteaching_loan_days', value: '14', label: 'Faculty (Non-Teaching) — Loan Days' },
        { id: 'set42', key: 'borrow_faculty_nonteaching_max_renewals', value: '1', label: 'Faculty (Non-Teaching) — Max Renewals' },
        { id: 'set43', key: 'borrow_faculty_nonteaching_fine_per_day', value: '5', label: 'Faculty (Non-Teaching) — Fine/Day (₱)' },
        { id: 'set50', key: 'borrow_faculty_deptchair_max_books', value: '10', label: 'Dept Chair/Head — Max Books' },
        { id: 'set51', key: 'borrow_faculty_deptchair_loan_days', value: '30', label: 'Dept Chair/Head — Loan Days' },
        { id: 'set52', key: 'borrow_faculty_deptchair_max_renewals', value: '2', label: 'Dept Chair/Head — Max Renewals' },
        { id: 'set53', key: 'borrow_faculty_deptchair_fine_per_day', value: '5', label: 'Dept Chair/Head — Fine/Day (₱)' },
        { id: 'set60', key: 'borrow_student_max_books', value: '3', label: 'Student — Max Books' },
        { id: 'set61', key: 'borrow_student_loan_days', value: '7', label: 'Student — Loan Days' },
        { id: 'set62', key: 'borrow_student_max_renewals', value: '1', label: 'Student — Max Renewals' },
        { id: 'set63', key: 'borrow_student_fine_per_day', value: '5', label: 'Student — Fine/Day (₱)' },
        { id: 'set70', key: 'borrow_student_assistant_max_books', value: '3', label: 'Student Assistant — Max Books' },
        { id: 'set71', key: 'borrow_student_assistant_loan_days', value: '7', label: 'Student Assistant — Loan Days' },
        { id: 'set72', key: 'borrow_student_assistant_max_renewals', value: '1', label: 'Student Assistant — Max Renewals' },
        { id: 'set73', key: 'borrow_student_assistant_fine_per_day', value: '5', label: 'Student Assistant — Fine/Day (₱)' },
        { id: 'set80', key: 'reservation_max_student', value: '2', label: 'Student — Max Active Reservations' },
        { id: 'set81', key: 'reservation_max_faculty', value: '5', label: 'Faculty — Max Active Reservations' },
        { id: 'set82', key: 'reservation_expiry_hours', value: '48', label: 'Reservation Claim Window (hours)' },
        { id: 'set83', key: 'fine_block_threshold', value: '100', label: 'Fine Block Threshold (₱) — Blocks borrowing/renewal' }
    ],
    lccClasses: [
        { id: 'lcc-a', letter: 'A', name: 'General Works', icon: 'fa-globe', subclasses: ['AC - Collections', 'AE - Encyclopedias', 'AG - Dictionaries', 'AI - Indexes'] },
        { id: 'lcc-b', letter: 'B', name: 'Philosophy & Religion', icon: 'fa-brain', subclasses: ['BC - Logic', 'BD - Speculative Philosophy', 'BF - Psychology', 'BL - Religions', 'BV - Practical Theology'] },
        { id: 'lcc-c', letter: 'C', name: 'Auxiliary Sciences of History', icon: 'fa-landmark', subclasses: ['CB - History of Civilization', 'CC - Archaeology', 'CD - Diplomatics', 'CS - Genealogy'] },
        { id: 'lcc-d', letter: 'D', name: 'World History', icon: 'fa-earth-americas', subclasses: ['DA - Great Britain', 'DB - Austria', 'DC - France', 'DD - Germany', 'DS - Asia'] },
        { id: 'lcc-e', letter: 'E', name: 'American History', icon: 'fa-flag-usa', subclasses: ['E11 - America (General)', 'E151 - United States (General)'] },
        { id: 'lcc-f', letter: 'F', name: 'Local American History', icon: 'fa-map-location-dot', subclasses: ['F1 - New England', 'F106 - Middle Atlantic', 'F206 - South Atlantic'] },
        { id: 'lcc-g', letter: 'G', name: 'Geography & Maps', icon: 'fa-map', subclasses: ['GA - Mathematical Geography', 'GB - Physical Geography', 'GC - Oceanography', 'GN - Anthropology'] },
        { id: 'lcc-h', letter: 'H', name: 'Social Sciences', icon: 'fa-users', subclasses: ['HA - Statistics', 'HB - Economic Theory', 'HC - Economic History', 'HD - Industries', 'HM - Sociology'] },
        { id: 'lcc-j', letter: 'J', name: 'Political Science', icon: 'fa-balance-scale', subclasses: ['JA - Political Science (General)', 'JC - Political Theory', 'JF - Constitutional History', 'JK - US Politics'] },
        { id: 'lcc-k', letter: 'K', name: 'Law', icon: 'fa-gavel', subclasses: ['KD - UK Law', 'KF - US Law', 'KJ-KKZ - European Law'] },
        { id: 'lcc-l', letter: 'L', name: 'Education', icon: 'fa-graduation-cap', subclasses: ['LA - History of Education', 'LB - Theory of Education', 'LC - Special Education', 'LD - US Schools'] },
        { id: 'lcc-m', letter: 'M', name: 'Music', icon: 'fa-music', subclasses: ['ML - Literature on Music', 'MT - Instruction & Study'] },
        { id: 'lcc-n', letter: 'N', name: 'Fine Arts', icon: 'fa-palette', subclasses: ['NA - Architecture', 'NB - Sculpture', 'NC - Drawing', 'ND - Painting', 'NK - Decorative Arts'] },
        { id: 'lcc-p', letter: 'P', name: 'Language & Literature', icon: 'fa-book-open', subclasses: ['PA - Classical Languages', 'PB - Modern European', 'PC - Romance Languages', 'PE - English', 'PQ - French/Italian/Spanish Lit', 'PR - English Literature', 'PS - American Literature'] },
        { id: 'lcc-q', letter: 'Q', name: 'Science', icon: 'fa-flask', subclasses: ['QA - Mathematics', 'QB - Astronomy', 'QC - Physics', 'QD - Chemistry', 'QE - Geology', 'QH - Natural History', 'QK - Botany', 'QL - Zoology', 'QR - Microbiology'] },
        { id: 'lcc-r', letter: 'R', name: 'Medicine', icon: 'fa-stethoscope', subclasses: ['RA - Public Health', 'RB - Pathology', 'RC - Internal Medicine', 'RD - Surgery', 'RE - Ophthalmology'] },
        { id: 'lcc-s', letter: 'S', name: 'Agriculture', icon: 'fa-seedling', subclasses: ['SB - Plant Culture', 'SD - Forestry', 'SF - Animal Culture', 'SH - Aquaculture'] },
        { id: 'lcc-t', letter: 'T', name: 'Technology', icon: 'fa-microchip', subclasses: ['TA - Engineering (General)', 'TC - Hydraulic Engineering', 'TD - Environmental Technology', 'TK - Electrical Engineering', 'TL - Motor Vehicles', 'TN - Mining'] },
        { id: 'lcc-u', letter: 'U', name: 'Military Science', icon: 'fa-shield-halved', subclasses: ['UA - Armies', 'UB - Military Administration', 'UC - Maintenance & Transportation', 'UD - Infantry'] },
        { id: 'lcc-v', letter: 'V', name: 'Naval Science', icon: 'fa-anchor', subclasses: ['VA - Navies', 'VB - Naval Administration', 'VC - Naval Maintenance', 'VK - Navigation'] },
        { id: 'lcc-z', letter: 'Z', name: 'Bibliography & Library Science', icon: 'fa-bookmark', subclasses: ['ZA - Information Resources', 'Z4 - Books (General)', 'Z657 - Library Science', 'Z695 - Cataloging'] }
    ]
};

function json(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}

export default async (req: Request, context: Context) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    if (req.method !== "POST") {
        return json({ error: "Use POST to trigger seed" }, 405);
    }

    try {
        // Check if already seeded by looking for existing roles
        const existingRoles = await db.select().from(roles);
        if (existingRoles.length > 0) {
            return json({ message: "Database already seeded", counts: { roles: existingRoles.length } });
        }

        // 1. Roles
        await db.insert(roles).values(seedData.roles);

        // 2. Permissions
        await db.insert(permissions).values(seedData.permissions);

        // 3. Role-Permission mappings (flatten the map)
        const rpValues: { roleId: string; permissionId: string }[] = [];
        for (const [roleId, permIds] of Object.entries(seedData.rolePerms)) {
            for (const permissionId of permIds) {
                rpValues.push({ roleId, permissionId });
            }
        }
        await db.insert(rolePermissions).values(rpValues);

        // 4. Users
        await db.insert(users).values(seedData.users);

        // 5. Students
        await db.insert(students).values(seedData.students);

        // 6. Authors
        await db.insert(authors).values(seedData.authors);

        // 7. Publishers
        await db.insert(publishers).values(seedData.publishers);

        // 8. Categories
        await db.insert(categories).values(seedData.categories);

        // 9. Books
        await db.insert(books).values(seedData.books);

        // 10. Transactions
        await db.insert(transactions).values(seedData.transactions);

        // 11. Fines
        await db.insert(fines).values(seedData.fines);

        // 12. Settings
        await db.insert(settings).values(seedData.settings);

        // 13. LCC Classes
        await db.insert(lccClasses).values(seedData.lccClasses);

        // 14. Initial audit log
        await db.insert(auditLogs).values({
            id: 'log1',
            user: 'System',
            action: 'SEED',
            entity: 'system',
            details: 'Initial data seeded via serverless function'
        });

        return json({
            message: "Database seeded successfully",
            counts: {
                roles: seedData.roles.length,
                permissions: seedData.permissions.length,
                rolePermissions: rpValues.length,
                users: seedData.users.length,
                students: seedData.students.length,
                authors: seedData.authors.length,
                publishers: seedData.publishers.length,
                categories: seedData.categories.length,
                books: seedData.books.length,
                transactions: seedData.transactions.length,
                fines: seedData.fines.length,
                settings: seedData.settings.length,
                lccClasses: seedData.lccClasses.length
            }
        }, 201);
    } catch (err: any) {
        console.error("Seed Error:", err);
        return json({ error: err.message || "Seed failed" }, 500);
    }
};

export const config = {
    path: "/api/seed"
};
