import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction');
    const status = searchParams.get('status');

    try {
        let calls: any[] = [];

        const callsCol = await getCollection('calls');
        if (callsCol) {
            // MongoDB backend
            const filter: any = {};
            if (direction) filter.direction = direction;
            if (status) {
                const statuses = status.split(',');
                filter.status = { $in: statuses };
            }
            const docs = await callsCol
                .find(filter)
                .sort({ created_at: -1 })
                .limit(50)
                .toArray();
            calls = docs.map(normalizeDoc);
        } else {
            // SQLite backend
            try {
                const Database = await import('better-sqlite3');
                const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
                const db = new (Database.default as any)(dbPath, { readonly: true });

                let query = 'SELECT * FROM calls WHERE 1=1';
                const params: any[] = [];

                if (direction) {
                    query += ' AND direction = ?';
                    params.push(direction);
                }
                if (status) {
                    const statuses = status.split(',');
                    query += ` AND status IN (${statuses.map(() => '?').join(',')})`;
                    params.push(...statuses);
                }

                query += ' ORDER BY created_at DESC LIMIT 50';
                calls = db.prepare(query).all(...params) as any[];
                db.close();
            } catch {
                calls = [];
            }
        }

        return NextResponse.json({ calls });
    } catch (error: any) {
        console.error("Error fetching calls:", error);
        return NextResponse.json({ calls: [], error: error.message });
    }
}
