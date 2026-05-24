import type { Context } from "@netlify/functions";
import { db } from "../../db/index.js";
import {
    books, authors, publishers, categories,
    bookCopies, librarySources, harvestErrors, auditLogs
} from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

// ── ID generator (same pattern as api.mts) ────────────────────────
function genId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function json(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

// ── Diacritic normalization (preserve diacritics, sanitize control chars) ──
function sanitizeText(s: string | undefined | null): string {
    if (!s) return "";
    // Remove XML control characters, normalize whitespace
    return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\s+/g, " ").trim();
}

// ── ISBN extractor / validator ─────────────────────────────────────
function extractISBN(raw: string): string | null {
    if (!raw) return null;
    // Strip ISBN prefix and dashes/spaces, accept ISBN-10 or ISBN-13
    const cleaned = raw.replace(/^isbn[:\s]*/i, "").replace(/[-\s]/g, "");
    if (/^\d{9}[\dX]$/.test(cleaned) || /^\d{13}$/.test(cleaned)) {
        return cleaned;
    }
    return null;
}

// ── Normalize raw ISBN from dc:identifier which may have multiple formats ─
function findISBNInIdentifiers(ids: string[]): string | null {
    for (const raw of ids) {
        const isbn = extractISBN(raw);
        if (isbn) return isbn;
    }
    return null;
}

// ── Dublin Core record → normalized object ─────────────────────────
interface NormalizedRecord {
    title: string;
    author: string;
    publisher: string;
    year: number | null;
    isbn: string | null;
    subject: string;
    accessionIds: string[];   // 852$p / local IDs
    location: string;
    copies: number;
    callNumber: string;
    rawSnippet: string;
}

// ── OAI-PMH XML parser using native DOMParser (available in Netlify Edge/Node) ─
function parseDublinCoreXML(xmlText: string): NormalizedRecord[] {
    const records: NormalizedRecord[] = [];

    // Simple regex-based XML extraction for Node.js compatibility
    // (no DOM available in standard Node Netlify runtime)
    const recordBlocks = [...xmlText.matchAll(/<record>([\s\S]*?)<\/record>/gi)];

    for (const block of recordBlocks) {
        const inner = block[1];

        // Skip deleted records
        if (/<header\s+status="deleted"/i.test(inner)) continue;

        const get = (tag: string) => {
            const match = inner.match(new RegExp(`<(?:dc|oai_dc):${tag}[^>]*>([\\s\\S]*?)<\\/(?:dc|oai_dc):${tag}>`, "i"))
                || inner.match(new RegExp(`<dc:${tag}[^>]*>([\\s\\S]*?)<\/dc:${tag}>`, "i"))
                || inner.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"));
            return match ? sanitizeText(match[1].replace(/<[^>]+>/g, "")) : "";
        };

        const getAll = (tag: string): string[] => {
            const matches = [...inner.matchAll(new RegExp(`<(?:dc:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:dc:)?${tag}>`, "gi"))];
            return matches.map(m => sanitizeText(m[1].replace(/<[^>]+>/g, ""))).filter(Boolean);
        };

        const identifiers = getAll("identifier");
        const isbn = findISBNInIdentifiers(identifiers);
        const yearStr = get("date") || get("year");
        const year = yearStr ? parseInt(yearStr.replace(/\D.*/, "")) : null;

        records.push({
            title: get("title"),
            author: get("creator") || get("contributor"),
            publisher: get("publisher"),
            year: (year && year > 1400 && year <= new Date().getFullYear() + 1) ? year : null,
            isbn,
            subject: get("subject"),
            accessionIds: [],   // OAI-PMH DC rarely has accession IDs; MARC21 does
            location: get("source"),
            copies: 1,
            callNumber: get("type"),   // sometimes repurposed in PH libraries
            rawSnippet: inner.substring(0, 500)
        });
    }

    return records;
}

// ── MARC21 XML parser (for oai_marc / marcxml metadata prefix) ─────
function parseMARC21XML(xmlText: string): NormalizedRecord[] {
    const records: NormalizedRecord[] = [];
    const recordBlocks = [...xmlText.matchAll(/<(?:marc:)?record>([\s\S]*?)<\/(?:marc:)?record>/gi)];

    for (const block of recordBlocks) {
        const inner = block[1];

        const getDataField = (tag: string, subfield: string): string => {
            const fieldMatch = inner.match(new RegExp(`<(?:marc:)?datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)<\\/(?:marc:)?datafield>`, "i"));
            if (!fieldMatch) return "";
            const sfMatch = fieldMatch[1].match(new RegExp(`<(?:marc:)?subfield[^>]*code="${subfield}"[^>]*>([\\s\\S]*?)<\\/(?:marc:)?subfield>`, "i"));
            return sfMatch ? sanitizeText(sfMatch[1]) : "";
        };

        const getAllDataField = (tag: string, subfield: string): string[] => {
            const fieldMatches = [...inner.matchAll(new RegExp(`<(?:marc:)?datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)<\\/(?:marc:)?datafield>`, "gi"))];
            return fieldMatches.map(fm => {
                const sfMatch = fm[1].match(new RegExp(`<(?:marc:)?subfield[^>]*code="${subfield}"[^>]*>([\\s\\S]*?)<\\/(?:marc:)?subfield>`, "i"));
                return sfMatch ? sanitizeText(sfMatch[1]) : "";
            }).filter(Boolean);
        };

        // MARC fields: 020$a=ISBN, 100$a=Author, 245$a=Title, 260$b=Publisher, 260$c=Year, 082$a=CallNo, 852$p=Barcode, 852$b=Location
        const isbnRaw = getDataField("020", "a");
        const isbn = extractISBN(isbnRaw);
        const accessionIds = getAllDataField("852", "p").filter(Boolean);
        const yearStr = getDataField("260", "c") || getDataField("264", "c");
        const year = yearStr ? parseInt(yearStr.replace(/\D.*/, "")) : null;

        records.push({
            title: sanitizeText((getDataField("245", "a") + " " + getDataField("245", "b")).trim()),
            author: getDataField("100", "a") || getDataField("110", "a") || getDataField("700", "a"),
            publisher: getDataField("260", "b") || getDataField("264", "b"),
            year: (year && year > 1400 && year <= new Date().getFullYear() + 1) ? year : null,
            isbn,
            subject: getDataField("650", "a"),
            accessionIds,
            location: getDataField("852", "b") || getDataField("852", "c"),
            copies: Math.max(1, accessionIds.length),
            callNumber: getDataField("082", "a") || getDataField("050", "a") || getDataField("092", "a"),
            rawSnippet: inner.substring(0, 500)
        });
    }

    return records;
}

// ── Koha/FOLIO REST JSON normalizer ───────────────────────────────
function parseKohaJSON(data: any[]): NormalizedRecord[] {
    return data.map((item: any) => {
        const isbn = extractISBN(item.isbn || item.biblionumber || "");
        return {
            title: sanitizeText(item.title || item.title_statement || ""),
            author: sanitizeText(item.author || item.authors?.[0]?.name || ""),
            publisher: sanitizeText(item.publisher || item.place_of_publication || ""),
            year: item.copyrightdate ? parseInt(item.copyrightdate) : null,
            isbn,
            subject: sanitizeText(item.subject || item.subjects?.[0] || ""),
            accessionIds: item.items?.map((i: any) => i.barcode || i.itemnumber?.toString()).filter(Boolean) || [],
            location: sanitizeText(item.location || item.homebranch || ""),
            copies: item.items?.length || 1,
            callNumber: sanitizeText(item.classification || item.cn_sort || ""),
            rawSnippet: JSON.stringify(item).substring(0, 500)
        };
    });
}

// ── Find-or-create helpers ─────────────────────────────────────────
async function resolveAuthor(name: string): Promise<string | null> {
    if (!name) return null;
    const existing = await db.select().from(authors).where(eq(authors.name, name));
    if (existing.length) return existing[0].id;
    const id = genId();
    await db.insert(authors).values({ id, name, bio: null });
    return id;
}

async function resolvePublisher(name: string): Promise<string | null> {
    if (!name) return null;
    const existing = await db.select().from(publishers).where(eq(publishers.name, name));
    if (existing.length) return existing[0].id;
    const id = genId();
    await db.insert(publishers).values({ id, name });
    return id;
}

async function resolveCategory(subject: string): Promise<string | null> {
    if (!subject) return null;
    // Normalize subject (take first segment before "/" or "--")
    const catName = subject.split(/[\/\-]{2,}/)[0].trim().substring(0, 200);
    if (!catName) return null;
    const existing = await db.select().from(categories).where(eq(categories.name, catName));
    if (existing.length) return existing[0].id;
    const id = genId();
    await db.insert(categories).values({ id, name: catName });
    return id;
}

// ── Core ingestion logic ───────────────────────────────────────────
interface HarvestResult {
    inserted: number;
    updated: number;
    copiesAdded: number;
    errors: number;
    dryRun: boolean;
}

async function ingestRecords(
    records: NormalizedRecord[],
    sourceId: string,
    sourceName: string,
    dryRun: boolean
): Promise<HarvestResult> {
    let inserted = 0, updated = 0, copiesAdded = 0, errors = 0;

    for (const rec of records) {
        try {
            // Validate minimum required fields
            if (!rec.title) {
                await logError(sourceId, sourceName, null, "missing_title", "Record has no title", rec.rawSnippet, dryRun);
                errors++;
                continue;
            }

            if (!rec.isbn) {
                await logError(sourceId, sourceName, null, "missing_isbn", `No valid ISBN found in record: "${rec.title}"`, rec.rawSnippet, dryRun);
                errors++;
                continue;
            }

            if (dryRun) {
                // In dry-run mode just count what would happen
                inserted++;
                copiesAdded += rec.accessionIds.length || 1;
                continue;
            }

            // Resolve related entities
            const authorId = await resolveAuthor(rec.author);
            const publisherId = await resolvePublisher(rec.publisher);
            const categoryId = await resolveCategory(rec.subject);

            // Check if book with this ISBN already exists
            const existingBooks = await db.select().from(books).where(eq(books.isbn, rec.isbn));

            let bookId: string;

            if (existingBooks.length > 0) {
                // Duplicate ISBN → increment copies count
                bookId = existingBooks[0].id;
                const newCopies = existingBooks[0].copies + rec.copies;
                const newAvailable = existingBooks[0].available + rec.copies;
                await db.update(books).set({
                    copies: newCopies,
                    available: newAvailable,
                    updatedAt: new Date()
                }).where(eq(books.id, bookId));
                updated++;
            } else {
                // New book → insert ISBN-level catalog record
                bookId = genId();
                await db.insert(books).values({
                    id: bookId,
                    title: rec.title,
                    isbn: rec.isbn,
                    authorId: authorId ?? undefined,
                    publisherId: publisherId ?? undefined,
                    categoryId: categoryId ?? undefined,
                    callNumber: rec.callNumber || null,
                    year: rec.year ?? undefined,
                    copies: rec.copies,
                    available: rec.copies,
                    status: "active"
                });
                inserted++;
            }

            // Insert per-copy rows (accession IDs)
            const copyIds = rec.accessionIds.length > 0
                ? rec.accessionIds
                : [genId()];   // synthetic copy ID if no barcode available

            for (const accId of copyIds) {
                // Avoid duplicate accession IDs from repeated harvests
                const existing = await db.select().from(bookCopies)
                    .where(and(eq(bookCopies.bookId, bookId), eq(bookCopies.accessionId, accId)));
                if (existing.length > 0) continue;

                await db.insert(bookCopies).values({
                    id: genId(),
                    bookId,
                    accessionId: accId,
                    sourceLibraryId: sourceId,
                    sourceLibraryName: sourceName,
                    location: rec.location || null,
                    condition: "good",
                    status: "available"
                });
                copiesAdded++;
            }
        } catch (err: any) {
            await logError(sourceId, sourceName, rec.isbn, "parse_error", err.message, rec.rawSnippet, dryRun);
            errors++;
        }
    }

    return { inserted, updated, copiesAdded, errors, dryRun };
}

async function logError(
    sourceId: string, sourceName: string, isbn: string | null,
    errorType: string, errorMessage: string, rawPayload: string, dryRun: boolean
) {
    if (dryRun) return;
    try {
        await db.insert(harvestErrors).values({
            id: genId(),
            sourceLibraryId: sourceId,
            sourceLibraryName: sourceName,
            isbn: isbn || null,
            errorType,
            errorMessage,
            rawPayload: rawPayload.substring(0, 2000),
            status: "pending"
        });
    } catch (_) {
        // Never let error logging crash the main harvest loop
    }
}

// ── Fetch and parse external endpoint ─────────────────────────────
async function fetchAndParse(source: any, fromDate?: string): Promise<NormalizedRecord[]> {
    const headers: Record<string, string> = { "User-Agent": "AklatBayon-Harvester/1.0" };
    if (source.authToken) headers["Authorization"] = `Bearer ${source.authToken}`;

    let url = source.url;

    if (source.protocol === "oai-pmh") {
        const params = new URLSearchParams({
            verb: "ListRecords",
            metadataPrefix: source.metadataPrefix || "oai_dc"
        });
        if (source.setSpec) params.set("set", source.setSpec);
        if (fromDate) params.set("from", fromDate);
        url = `${source.url}?${params.toString()}`;

        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(`OAI-PMH request failed: ${resp.status} ${resp.statusText}`);
        const xml = await resp.text();

        if (source.metadataPrefix === "marc21" || source.metadataPrefix === "oai_marc" || source.metadataPrefix === "marcxml") {
            return parseMARC21XML(xml);
        }
        return parseDublinCoreXML(xml);
    }

    if (source.protocol === "sru") {
        const params = new URLSearchParams({
            operation: "searchRetrieve",
            version: "1.1",
            query: "dc.type=book",
            maximumRecords: "100",
            recordSchema: "dc"
        });
        url = `${source.url}?${params.toString()}`;
        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(`SRU request failed: ${resp.status} ${resp.statusText}`);
        const xml = await resp.text();
        return parseDublinCoreXML(xml);
    }

    if (source.protocol === "rest") {
        const resp = await fetch(url, { headers });
        if (!resp.ok) throw new Error(`REST request failed: ${resp.status} ${resp.statusText}`);
        const data = await resp.json();
        // Support array response or { data: [...] } wrapper
        const items = Array.isArray(data) ? data : (data.data || data.items || data.biblios || []);
        return parseKohaJSON(items);
    }

    throw new Error(`Unknown protocol: ${source.protocol}`);
}

// ── Route handler ──────────────────────────────────────────────────
export default async (req: Request, context: Context) => {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        });
    }

    try {
        const url = new URL(req.url);
        // Strip /api/harvest prefix to get sub-path
        const sub = url.pathname.replace(/^\/?api\/harvest\/?/, "").replace(/^\//, "");

        // ── GET /api/harvest/sources ──────────────────────────────
        if (req.method === "GET" && sub === "sources") {
            const rows = await db.select().from(librarySources).orderBy(librarySources.name);
            return json({ data: rows });
        }

        // ── POST /api/harvest/sources ─────────────────────────────
        if (req.method === "POST" && sub === "sources") {
            const body = await req.json();
            if (!body.name || !body.url || !body.protocol) {
                return json({ error: "name, url, and protocol are required" }, 400);
            }
            const id = genId();
            const row = await db.insert(librarySources).values({
                id,
                name: body.name,
                url: body.url,
                protocol: body.protocol,
                authToken: body.auth_token || null,
                metadataPrefix: body.metadata_prefix || "oai_dc",
                setSpec: body.set_spec || null,
                institution: body.institution || null,
                region: body.region || null,
                status: "active"
            }).returning();
            return json({ data: row[0] }, 201);
        }

        // ── DELETE /api/harvest/sources/:id ───────────────────────
        if (req.method === "DELETE" && sub.startsWith("sources/")) {
            const id = sub.replace("sources/", "");
            await db.delete(librarySources).where(eq(librarySources.id, id));
            return json({ data: { success: true } });
        }

        // ── POST /api/harvest/run ─────────────────────────────────
        if (req.method === "POST" && sub === "run") {
            const body = await req.json();
            const { source_id, from_date, dry_run } = body;
            const dryRun = !!dry_run;

            if (!source_id) return json({ error: "source_id is required" }, 400);

            const sources = await db.select().from(librarySources)
                .where(eq(librarySources.id, source_id));
            if (!sources.length) return json({ error: "Source not found" }, 404);
            const source = sources[0];

            let records: NormalizedRecord[] = [];
            let fetchError: string | null = null;

            try {
                records = await fetchAndParse(source, from_date);
            } catch (err: any) {
                fetchError = err.message;
                await logError(source.id, source.name, null, "network_error", err.message, "", dryRun);
            }

            let result: HarvestResult = { inserted: 0, updated: 0, copiesAdded: 0, errors: 0, dryRun };

            if (records.length > 0) {
                result = await ingestRecords(records, source.id, source.name, dryRun);
            }

            // Update last harvested timestamp (skip in dry-run)
            if (!dryRun && !fetchError) {
                await db.update(librarySources).set({
                    lastHarvestedAt: new Date(),
                    lastHarvestCount: records.length,
                    updatedAt: new Date()
                }).where(eq(librarySources.id, source.id));

                // Write audit log
                await db.insert(auditLogs).values({
                    id: genId(),
                    user: "System Harvester",
                    action: "HARVEST",
                    entity: "books",
                    details: JSON.stringify({
                        source: source.name,
                        records: records.length,
                        ...result
                    })
                });
            }

            return json({
                source: source.name,
                fetched: records.length,
                fetchError,
                result,
                // In dry-run, return first 10 normalized records as preview
                preview: dryRun ? records.slice(0, 10).map(r => ({
                    title: r.title,
                    author: r.author,
                    isbn: r.isbn,
                    publisher: r.publisher,
                    year: r.year,
                    copies: r.copies,
                    accessions: r.accessionIds
                })) : undefined
            });
        }

        // ── GET /api/harvest/errors ───────────────────────────────
        if (req.method === "GET" && sub === "errors") {
            const status = url.searchParams.get("status") || "pending";
            const rows = await db.select().from(harvestErrors)
                .where(eq(harvestErrors.status, status))
                .orderBy(harvestErrors.createdAt);
            return json({ data: rows });
        }

        // ── DELETE /api/harvest/errors/:id (dismiss) ──────────────
        if (req.method === "DELETE" && sub.startsWith("errors/")) {
            const id = sub.replace("errors/", "");
            await db.update(harvestErrors).set({
                status: "dismissed",
                resolvedAt: new Date()
            }).where(eq(harvestErrors.id, id));
            return json({ data: { success: true } });
        }

        // ── POST /api/harvest/errors/:id/resolve ──────────────────
        if (req.method === "POST" && sub.match(/^errors\/[^/]+\/resolve$/)) {
            const id = sub.split("/")[1];
            const body = await req.json().catch(() => ({}));
            await db.update(harvestErrors).set({
                status: "resolved",
                resolvedAt: new Date(),
                resolvedBy: body.resolved_by || "Admin"
            }).where(eq(harvestErrors.id, id));
            return json({ data: { success: true } });
        }

        return json({ error: "Not found" }, 404);
    } catch (err: any) {
        console.error("Harvest Error:", err);
        return json({ error: err.message || "Internal server error" }, 500);
    }
};

export const config = {
    path: "/api/harvest/*"
};
