import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    try {
        let customers: any[] = [];

        const customersCol = await getCollection('customers');
        if (customersCol) {
            // MongoDB backend
            const filter: any = {};
            if (search) {
                filter.$or = [
                    { phone: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } },
                ];
            }
            const docs = await customersCol
                .find(filter)
                .sort({ created_at: -1 })
                .limit(100)
                .toArray();
            customers = docs.map(normalizeDoc);
        } else {
            // SQLite backend
            const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
            try {
                const Database = await import('better-sqlite3');
                const db = new (Database.default as any)(dbPath, { readonly: true });

                let query = 'SELECT * FROM customers WHERE 1=1';
                const params: any[] = [];

                if (search) {
                    query += ' AND (phone LIKE ? OR name LIKE ?)';
                    const term = `%${search}%`;
                    params.push(term, term);
                }

                query += ' ORDER BY created_at DESC LIMIT 100';
                customers = db.prepare(query).all(...params) as any[];
                db.close();
            } catch {
                customers = [];
            }
        }

        return NextResponse.json({ customers });
    } catch (error: any) {
        return NextResponse.json({ customers: [], error: error.message });
    }
}
