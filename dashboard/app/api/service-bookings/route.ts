import { NextResponse } from 'next/server';
import { getCollection, normalizeDoc } from '../db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    try {
        let bookings: any[] = [];

        const appointmentsCol = await getCollection('appointments');
        if (appointmentsCol) {
            // MongoDB backend
            const filter: any = {};
            if (status) filter.status = status;
            if (search) {
                filter.$or = [
                    { phone: { $regex: search, $options: 'i' } },
                    { booking_ref: { $regex: search, $options: 'i' } },
                    { customer_name: { $regex: search, $options: 'i' } },
                ];
            }
            const docs = await appointmentsCol
                .find(filter)
                .sort({ created_at: -1 })
                .limit(100)
                .toArray();
            bookings = docs.map(normalizeDoc);
        } else {
            // SQLite backend
            const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
            try {
                const Database = await import('better-sqlite3');
                const db = new (Database.default as any)(dbPath, { readonly: true });

                let query = 'SELECT * FROM service_bookings WHERE 1=1';
                const params: any[] = [];

                if (status) {
                    query += ' AND status = ?';
                    params.push(status);
                }
                if (search) {
                    query += ' AND (phone LIKE ? OR booking_ref LIKE ? OR customer_name LIKE ?)';
                    const term = `%${search}%`;
                    params.push(term, term, term);
                }

                query += ' ORDER BY created_at DESC LIMIT 100';
                bookings = db.prepare(query).all(...params) as any[];
                db.close();
            } catch {
                bookings = [];
            }
        }

        return NextResponse.json({ bookings });
    } catch (error: any) {
        return NextResponse.json({ bookings: [], error: error.message });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const appointmentsCol = await getCollection('appointments');

        if (appointmentsCol) {
            // MongoDB backend
            const ref = `SRV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;
            await appointmentsCol.insertOne({
                booking_ref: ref,
                customer_name: body.customer_name,
                phone: body.phone,
                product_model: body.model,
                issue_description: body.issue_description,
                date: body.preferred_date,
                time_slot: body.time_slot,
                location: body.location,
                type: body.service_type || 'repair',
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            return NextResponse.json({ success: true, booking_ref: ref });
        } else {
            // SQLite backend
            const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
            const Database = await import('better-sqlite3');
            const db = new (Database.default as any)(dbPath);

            const ref = `SRV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000 + 1000)}`;

            db.prepare(`
                INSERT INTO service_bookings (booking_ref, customer_name, phone, model, issue_description, preferred_date, time_slot, location, service_type, registration_number)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                ref, body.customer_name, body.phone, body.model,
                body.issue_description, body.preferred_date, body.time_slot,
                body.location, body.service_type || 'repair', body.registration_number || null
            );

            db.close();
            return NextResponse.json({ success: true, booking_ref: ref });
        }
    } catch (error: any) {
        console.error("Error creating booking:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
