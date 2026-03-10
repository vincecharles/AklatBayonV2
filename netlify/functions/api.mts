import type { Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import {
    roles, permissions, rolePermissions, users, students, authors,
    publishers, categories, books, transactions, fines, reservations,
    attendance, auditLogs, settings, lccClasses
} from "../../db/schema.js";
import { eq, and, like, sql, desc, asc, ilike, or } from "drizzle-orm";

// Map collection names to Drizzle tables
const tables: Record<string, any> = {
    roles, permissions, role_permissions: rolePermissions, users, students,
    authors, publishers, categories, books, transactions, fines,
    reservations, attendance, audit_logs: auditLogs, settings, lcc_classes: lccClasses
};

// Column name mappings: frontend snake_case → Drizzle schema camelCase
const columnMaps: Record<string, Record<string, string>> = {
    users: { role_id: 'roleId', faculty_subtype: 'facultySubtype', rfid_id: 'rfidId', student_id: 'studentId', created_at: 'createdAt', updated_at: 'updatedAt' },
    students: { student_id: 'studentId', grade_level: 'gradeLevel', created_at: 'createdAt', updated_at: 'updatedAt' },
    books: { author_id: 'authorId', publisher_id: 'publisherId', category_id: 'categoryId', call_number: 'callNumber', created_at: 'createdAt', updated_at: 'updatedAt' },
    transactions: { student_id: 'studentId', book_id: 'bookId', date_issued: 'dateIssued', date_due: 'dateDue', date_returned: 'dateReturned', renewal_count: 'renewalCount', created_at: 'createdAt', updated_at: 'updatedAt' },
    fines: { student_id: 'studentId', transaction_id: 'transactionId', created_at: 'createdAt', updated_at: 'updatedAt' },
    reservations: { student_id: 'studentId', book_id: 'bookId', notified_at: 'notifiedAt', expires_at: 'expiresAt', created_at: 'createdAt', updated_at: 'updatedAt' },
    attendance: { user_id: 'userId', rfid_id: 'rfidId', tap_time: 'tapTime', created_at: 'createdAt' },
    audit_logs: { created_at: 'createdAt' },
    role_permissions: { role_id: 'roleId', permission_id: 'permissionId' },
    categories: { parent_id: 'parentId', created_at: 'createdAt', updated_at: 'updatedAt' },
    authors: { created_at: 'createdAt', updated_at: 'updatedAt' },
    publishers: { created_at: 'createdAt', updated_at: 'updatedAt' },
    roles: { created_at: 'createdAt', updated_at: 'updatedAt' },
    permissions: { created_at: 'createdAt' }
};

// Convert frontend snake_case data to Drizzle camelCase
function toDrizzle(collection: string, data: Record<string, any>): Record<string, any> {
    const map = columnMaps[collection] || {};
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        const mapped = map[key] || key;
        result[mapped] = value;
    }
    return result;
}

// Convert Drizzle camelCase result to frontend snake_case
function toFrontend(collection: string, data: Record<string, any>): Record<string, any> {
    const map = columnMaps[collection] || {};
    const reverseMap: Record<string, string> = {};
    for (const [snake, camel] of Object.entries(map)) {
        reverseMap[camel] = snake;
    }
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        const mapped = reverseMap[key] || key;
        result[mapped] = value;
    }
    return result;
}

function json(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

export default async (req: Request, context: Context) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });
    }

    try {
        const url = new URL(req.url);
        // Path: /api/{collection} or /api/{collection}/{id}
        const pathParts = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
        const collection = pathParts[0];
        const id = pathParts[1];

        if (!collection || !tables[collection]) {
            return json({ error: "Unknown collection: " + collection }, 404);
        }

        const table = tables[collection];

        // ── GET: List all or get by ID ──────────────────────
        if (req.method === "GET") {
            if (id) {
                const rows = await db.select().from(table).where(eq(table.id, id));
                if (!rows.length) return json({ error: "Not found" }, 404);
                return json({ data: toFrontend(collection, rows[0]) });
            }

            // Query params for filtering
            const search = url.searchParams.get('search');
            const field = url.searchParams.get('field');
            const value = url.searchParams.get('value');
            const status_filter = url.searchParams.get('status');

            let query = db.select().from(table);

            // Simple field=value filter (map snake_case → camelCase)
            if (field && value) {
                const map = columnMaps[collection] || {};
                const mappedField = map[field] || field;
                if (table[mappedField]) {
                    query = query.where(eq(table[mappedField], value));
                }
            }

            // Status filter
            if (status_filter && table.status) {
                query = query.where(eq(table.status, status_filter));
            }

            const rows = await query;
            return json({ data: rows.map((r: any) => toFrontend(collection, r)) });
        }

        // ── POST: Create ────────────────────────────────────
        if (req.method === "POST") {
            const body = await req.json();
            const mapped = toDrizzle(collection, body);

            // Set timestamps
            if ('createdAt' in table) mapped.createdAt = new Date();
            if ('updatedAt' in table) mapped.updatedAt = new Date();

            // Generate ID if not provided
            if (!mapped.id) {
                mapped.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            }

            const result = await db.insert(table).values(mapped).returning();
            return json({ data: toFrontend(collection, result[0]) }, 201);
        }

        // ── PUT: Update ─────────────────────────────────────
        if (req.method === "PUT") {
            if (!id) return json({ error: "ID required for update" }, 400);

            const body = await req.json();
            const mapped = toDrizzle(collection, body);

            // Remove id from updates
            delete mapped.id;
            delete mapped.createdAt;
            if ('updatedAt' in table) mapped.updatedAt = new Date();

            const result = await db.update(table).set(mapped).where(eq(table.id, id)).returning();
            if (!result.length) return json({ error: "Not found" }, 404);
            return json({ data: toFrontend(collection, result[0]) });
        }

        // ── DELETE: Remove ──────────────────────────────────
        if (req.method === "DELETE") {
            if (!id) return json({ error: "ID required for delete" }, 400);

            const result = await db.delete(table).where(eq(table.id, id)).returning();
            if (!result.length) return json({ error: "Not found" }, 404);
            return json({ data: { success: true } });
        }

        return json({ error: "Method not allowed" }, 405);
    } catch (err: any) {
        console.error("API Error:", err);
        return json({ error: err.message || "Internal server error" }, 500);
    }
};

export const config = {
    path: "/api/*"
};
