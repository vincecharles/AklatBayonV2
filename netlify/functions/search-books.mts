import { neon } from '@netlify/neon';

/**
 * GET /api/search-books?title=Noli
 *
 * Returns available physical copies of matching books,
 * aggregated per source library — using the AklatBayon schema:
 *
 *   books        → ISBN-level catalog records
 *   book_copies  → one row per physical copy / accession ID
 *   library_sources → registered Philippine library sources
 *
 * @netlify/neon auto-injects the Netlify Postgres connection;
 * no DATABASE_URL env var needed (handled by the platform).
 */
export default async (req: Request) => {
    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // 1. Initialize the Neon connection.
    //    @netlify/neon's neon() requires no arguments — it reads the
    //    Netlify-provisioned DATABASE_URL automatically.
    const sql = neon();

    // 2. Parse query parameters
    const url = new URL(req.url);
    const titleQuery  = url.searchParams.get('title')  ?? '';
    const isbnQuery   = url.searchParams.get('isbn')   ?? '';
    const authorQuery = url.searchParams.get('author') ?? '';

    if (!titleQuery && !isbnQuery && !authorQuery) {
        return new Response(
            JSON.stringify({ error: "At least one search parameter is required: 'title', 'isbn', or 'author'" }),
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        // 3. Execute the SQL query.
        //
        //    Schema mapping vs. the reference implementation:
        //      books.id           = the book-level primary key  (not book_id)
        //      books.isbn         = ISBN-10 or ISBN-13          (not isbn_13)
        //      book_copies        = one row per physical copy   (replaces inventory_items)
        //      book_copies.source_library_name = denormalised library name
        //                                        (avoids a join for common queries)
        //      library_sources    = the full library registry   (replaces libraries table)
        //
        //    ILIKE  → case-insensitive match (works the same way)
        //    COUNT  → aggregates copies per book×library pair, not individual barcodes
        //    Parameterisation via template literals → SQL-injection-safe (same as neon docs)

        const results = await sql`
            SELECT
                b.title,
                b.isbn,
                b.year,
                b.call_number,
                a.name                          AS author,
                bc.source_library_name          AS library_name,
                ls.institution                  AS library_institution,
                ls.region                       AS library_region,
                COUNT(bc.id)                    AS available_copies,
                ARRAY_AGG(bc.accession_id)      AS accession_ids
            FROM
                books b
            LEFT JOIN
                authors a ON b.author_id = a.id
            JOIN
                book_copies bc ON b.id = bc.book_id
            LEFT JOIN
                library_sources ls ON bc.source_library_id = ls.id
            WHERE
                bc.status = 'available'
                AND (
                    ${titleQuery  !== '' ? sql`b.title  ILIKE ${'%' + titleQuery  + '%'}` : sql`TRUE`}
                    AND
                    ${isbnQuery   !== '' ? sql`b.isbn   ILIKE ${'%' + isbnQuery   + '%'}` : sql`TRUE`}
                    AND
                    ${authorQuery !== '' ? sql`a.name   ILIKE ${'%' + authorQuery + '%'}` : sql`TRUE`}
                )
            GROUP BY
                b.id, b.title, b.isbn, b.year, b.call_number,
                a.name, bc.source_library_name, ls.institution, ls.region
            ORDER BY
                b.title, library_name;
        `;

        // 4. Build a clean response: group copies by book, then list per-library counts
        type LibrarySummary = {
            library_name: string;
            library_institution: string | null;
            library_region: string | null;
            available_copies: number;
            accession_ids: string[];
        };

        type BookResult = {
            title: string;
            isbn: string;
            year: number | null;
            call_number: string | null;
            author: string | null;
            total_available: number;
            libraries: LibrarySummary[];
        };

        const bookMap = new Map<string, BookResult>();

        for (const row of results as any[]) {
            const key = row.isbn || row.title;
            if (!bookMap.has(key)) {
                bookMap.set(key, {
                    title: row.title,
                    isbn: row.isbn,
                    year: row.year,
                    call_number: row.call_number,
                    author: row.author ?? null,
                    total_available: 0,
                    libraries: []
                });
            }
            const entry = bookMap.get(key)!;
            const count = Number(row.available_copies);
            entry.total_available += count;
            entry.libraries.push({
                library_name: row.library_name ?? 'FEATI University Library',
                library_institution: row.library_institution ?? null,
                library_region: row.library_region ?? null,
                available_copies: count,
                accession_ids: row.accession_ids ?? []
            });
        }

        return new Response(
            JSON.stringify({
                query: { title: titleQuery, isbn: isbnQuery, author: authorQuery },
                count: bookMap.size,
                results: [...bookMap.values()]
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error: any) {
        console.error('search-books error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal Server Error', detail: error.message }),
            { status: 500, headers: corsHeaders }
        );
    }
};

export const config = {
    path: '/api/search-books'
};
