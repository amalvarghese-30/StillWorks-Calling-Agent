import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    try {
        let leads: any[] = [];

        const leadsCol = await getCollection('leads');
        if (leadsCol) {
            // MongoDB backend
            const filter: any = {};
            if (status) filter.status = status;
            if (search) {
                filter.$or = [
                    { phone: { $regex: search, $options: 'i' } },
                    { customer_name: { $regex: search, $options: 'i' } },
                ];
            }
            const docs = await leadsCol
                .find(filter)
                .sort({ created_at: -1 })
                .limit(100)
                .toArray();
            leads = docs.map(normalizeDoc);
        } else {
            // SQLite backend
            const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
            try {
                const Database = await import('better-sqlite3');
                const db = new (Database.default as any)(dbPath, { readonly: true });

                let query = 'SELECT * FROM leads WHERE 1=1';
                const params: any[] = [];

                if (status) {
                    query += ' AND status = ?';
                    params.push(status);
                }
                if (search) {
                    query += ' AND (phone LIKE ? OR customer_name LIKE ?)';
                    const term = `%${search}%`;
                    params.push(term, term);
                }

                query += ' ORDER BY created_at DESC LIMIT 100';
                leads = db.prepare(query).all(...params) as any[];
                db.close();
            } catch {
                leads = [];
            }
        }

        return NextResponse.json({ leads });
    } catch (error: any) {
        return NextResponse.json({ leads: [], error: error.message });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "id and status required" }, { status: 400 });
        }

        const leadsCol = await getCollection('leads');
        if (leadsCol) {
            const { ObjectId } = await import('mongodb');
            await leadsCol.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status } }
            );
        } else {
            const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
            const Database = await import('better-sqlite3');
            const db = new (Database.default as any)(dbPath);
            db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
            db.close();
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
