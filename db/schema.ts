import {
    pgTable,
    varchar,
    text,
    integer,
    timestamp,
    boolean,
    numeric,
    uniqueIndex,
    index,
    jsonb
} from 'drizzle-orm/pg-core';

// ── Roles ────────────────────────────────────────────────
export const roles = pgTable('roles', {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ── Permissions ──────────────────────────────────────────
export const permissions = pgTable('permissions', {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    label: varchar('label', { length: 100 }).notNull(),
    group: varchar('group', { length: 50 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

// ── Role ↔ Permission (many-to-many) ────────────────────
export const rolePermissions = pgTable('role_permissions', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    roleId: varchar('role_id', { length: 50 }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: varchar('permission_id', { length: 50 }).notNull().references(() => permissions.id, { onDelete: 'cascade' })
}, (table) => [
    uniqueIndex('role_perm_unique').on(table.roleId, table.permissionId)
]);

// ── Users ────────────────────────────────────────────────
export const users = pgTable('users', {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    username: varchar('username', { length: 100 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    email: varchar('email', { length: 200 }),
    roleId: varchar('role_id', { length: 50 }).notNull().references(() => roles.id),
    facultySubtype: varchar('faculty_subtype', { length: 50 }),
    rfidId: varchar('rfid_id', { length: 100 }),
    studentId: varchar('student_id', { length: 50 }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    uniqueIndex('users_rfid_unique').on(table.rfidId),
    index('users_role_idx').on(table.roleId),
    index('users_status_idx').on(table.status)
]);

// ── Students ─────────────────────────────────────────────
export const students = pgTable('students', {
    id: varchar('id', { length: 50 }).primaryKey(),
    studentId: varchar('student_id', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 200 }),
    gradeLevel: varchar('grade_level', { length: 50 }),
    section: varchar('section', { length: 50 }),
    contact: varchar('contact', { length: 50 }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('students_status_idx').on(table.status)
]);

// ── Authors ──────────────────────────────────────────────
export const authors = pgTable('authors', {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    bio: text('bio'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ── Publishers ───────────────────────────────────────────
export const publishers = pgTable('publishers', {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    address: text('address'),
    contact: varchar('contact', { length: 100 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ── Categories ───────────────────────────────────────────
export const categories = pgTable('categories', {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    parentId: varchar('parent_id', { length: 50 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// ── Books ────────────────────────────────────────────────
export const books = pgTable('books', {
    id: varchar('id', { length: 50 }).primaryKey(),
    title: varchar('title', { length: 500 }).notNull(),
    isbn: varchar('isbn', { length: 30 }).notNull(),
    authorId: varchar('author_id', { length: 50 }).references(() => authors.id),
    publisherId: varchar('publisher_id', { length: 50 }).references(() => publishers.id),
    categoryId: varchar('category_id', { length: 50 }).references(() => categories.id),
    callNumber: varchar('call_number', { length: 100 }),
    year: integer('year'),
    copies: integer('copies').notNull().default(1),
    available: integer('available').notNull().default(1),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('books_author_idx').on(table.authorId),
    index('books_category_idx').on(table.categoryId),
    index('books_isbn_idx').on(table.isbn),
    index('books_status_idx').on(table.status)
]);

// ── Transactions (Borrow / Return) ──────────────────────
export const transactions = pgTable('transactions', {
    id: varchar('id', { length: 50 }).primaryKey(),
    studentId: varchar('student_id', { length: 50 }).notNull().references(() => students.id),
    bookId: varchar('book_id', { length: 50 }).notNull().references(() => books.id),
    type: varchar('type', { length: 20 }).notNull().default('borrow'),
    dateIssued: varchar('date_issued', { length: 20 }).notNull(),
    dateDue: varchar('date_due', { length: 20 }).notNull(),
    dateReturned: varchar('date_returned', { length: 20 }),
    renewalCount: integer('renewal_count').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('borrowed'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('txn_student_idx').on(table.studentId),
    index('txn_book_idx').on(table.bookId),
    index('txn_status_idx').on(table.status)
]);

// ── Fines ────────────────────────────────────────────────
export const fines = pgTable('fines', {
    id: varchar('id', { length: 50 }).primaryKey(),
    studentId: varchar('student_id', { length: 50 }).notNull().references(() => students.id),
    transactionId: varchar('transaction_id', { length: 50 }).references(() => transactions.id),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    reason: text('reason'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('fines_student_idx').on(table.studentId),
    index('fines_status_idx').on(table.status)
]);

// ── Reservations ─────────────────────────────────────────
export const reservations = pgTable('reservations', {
    id: varchar('id', { length: 50 }).primaryKey(),
    studentId: varchar('student_id', { length: 50 }).notNull().references(() => students.id),
    bookId: varchar('book_id', { length: 50 }).notNull().references(() => books.id),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    notifiedAt: timestamp('notified_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('res_student_idx').on(table.studentId),
    index('res_book_idx').on(table.bookId),
    index('res_status_idx').on(table.status)
]);

// ── Attendance ───────────────────────────────────────────
export const attendance = pgTable('attendance', {
    id: varchar('id', { length: 50 }).primaryKey(),
    userId: varchar('user_id', { length: 50 }).references(() => users.id),
    name: varchar('name', { length: 200 }).notNull(),
    rfidId: varchar('rfid_id', { length: 100 }),
    role: varchar('role', { length: 100 }),
    tapTime: timestamp('tap_time').defaultNow(),
    // Extended columns to match frontend seed data structure
    studentId: varchar('student_id', { length: 50 }),
    date: varchar('date', { length: 20 }),
    timeIn: varchar('time_in', { length: 10 }),
    timeOut: varchar('time_out', { length: 10 }),
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
    index('att_user_idx').on(table.userId),
    index('att_date_idx').on(table.createdAt)
]);

// ── Audit Logs ───────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
    id: varchar('id', { length: 50 }).primaryKey(),
    user: varchar('user', { length: 200 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    entity: varchar('entity', { length: 100 }).notNull(),
    details: text('details'),
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
    index('audit_entity_idx').on(table.entity),
    index('audit_date_idx').on(table.createdAt)
]);

// ── Settings (key-value) ─────────────────────────────────
export const settings = pgTable('settings', {
    id: varchar('id', { length: 50 }).primaryKey(),
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: text('value').notNull(),
    label: varchar('label', { length: 200 })
});

// ── LCC Classes ──────────────────────────────────────────
export const lccClasses = pgTable('lcc_classes', {
    id: varchar('id', { length: 50 }).primaryKey(),
    letter: varchar('letter', { length: 5 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    icon: varchar('icon', { length: 50 }),
    subclasses: jsonb('subclasses')
});

// ── Inventory — Incoming Deliveries ──────────────────────────
export const inventoryIncoming = pgTable('inventory_incoming', {
    id: varchar('id', { length: 50 }).primaryKey(),
    incomingNumber: varchar('incoming_number', { length: 50 }).notNull(),
    date: varchar('date', { length: 20 }).notNull(),
    preparedBy: varchar('prepared_by', { length: 50 }).references(() => users.id),
    referenceNumber: varchar('reference_number', { length: 100 }),
    purpose: varchar('purpose', { length: 100 }),
    supplier: varchar('supplier', { length: 200 }),
    items: jsonb('items').notNull().default([]),
    grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('inv_inc_date_idx').on(table.date),
    index('inv_inc_status_idx').on(table.status)
]);

// ── Inventory — Outgoing Records ─────────────────────────────
export const inventoryOutgoing = pgTable('inventory_outgoing', {
    id: varchar('id', { length: 50 }).primaryKey(),
    outgoingNumber: varchar('outgoing_number', { length: 50 }).notNull(),
    date: varchar('date', { length: 20 }).notNull(),
    preparedBy: varchar('prepared_by', { length: 50 }).references(() => users.id),
    referenceNumber: varchar('reference_number', { length: 100 }),
    purpose: varchar('purpose', { length: 100 }),
    supplier: varchar('supplier', { length: 200 }),
    items: jsonb('items').notNull().default([]),
    grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('inv_out_date_idx').on(table.date),
    index('inv_out_status_idx').on(table.status)
]);

// ── Library Sources (external OPAC/OAI-PMH registry) ─────────────
export const librarySources = pgTable('library_sources', {
    id: varchar('id', { length: 50 }).primaryKey(),
    name: varchar('name', { length: 300 }).notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    protocol: varchar('protocol', { length: 20 }).notNull().default('oai-pmh'), // oai-pmh | rest | sru
    authToken: varchar('auth_token', { length: 500 }),
    metadataPrefix: varchar('metadata_prefix', { length: 50 }).default('oai_dc'), // oai_dc | marc21
    setSpec: varchar('set_spec', { length: 200 }),   // OAI-PMH selective harvest set
    institution: varchar('institution', { length: 300 }),
    region: varchar('region', { length: 100 }),
    lastHarvestedAt: timestamp('last_harvested_at'),
    lastHarvestCount: integer('last_harvest_count').default(0),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('lib_src_protocol_idx').on(table.protocol),
    index('lib_src_status_idx').on(table.status)
]);

// ── Book Copies (physical accession items per ISBN) ───────────────
export const bookCopies = pgTable('book_copies', {
    id: varchar('id', { length: 50 }).primaryKey(),
    bookId: varchar('book_id', { length: 50 }).notNull().references(() => books.id, { onDelete: 'cascade' }),
    accessionId: varchar('accession_id', { length: 200 }).notNull(), // local barcode / accession number
    sourceLibraryId: varchar('source_library_id', { length: 50 }).references(() => librarySources.id),
    sourceLibraryName: varchar('source_library_name', { length: 300 }),
    location: varchar('location', { length: 200 }), // shelf / branch
    condition: varchar('condition', { length: 50 }).default('good'), // good | fair | poor | withdrawn
    status: varchar('status', { length: 30 }).notNull().default('available'), // available | borrowed | reserved | withdrawn
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
    index('bc_book_idx').on(table.bookId),
    index('bc_source_idx').on(table.sourceLibraryId),
    index('bc_status_idx').on(table.status),
    index('bc_accession_idx').on(table.accessionId)
]);

// ── Harvest Errors (dead-letter queue) ───────────────────────────
export const harvestErrors = pgTable('harvest_errors', {
    id: varchar('id', { length: 50 }).primaryKey(),
    sourceLibraryId: varchar('source_library_id', { length: 50 }).references(() => librarySources.id),
    sourceLibraryName: varchar('source_library_name', { length: 300 }),
    isbn: varchar('isbn', { length: 30 }),
    errorType: varchar('error_type', { length: 100 }).notNull(), // missing_isbn | invalid_isbn | duplicate | parse_error | network_error
    errorMessage: text('error_message').notNull(),
    rawPayload: text('raw_payload'),      // truncated raw XML / JSON for debugging
    resolvedAt: timestamp('resolved_at'),
    resolvedBy: varchar('resolved_by', { length: 200 }),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | resolved | dismissed
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => [
    index('he_source_idx').on(table.sourceLibraryId),
    index('he_status_idx').on(table.status),
    index('he_date_idx').on(table.createdAt)
]);
