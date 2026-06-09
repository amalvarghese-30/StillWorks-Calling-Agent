import { NextResponse } from 'next/server';
import { getCollection } from '../db';

export async function GET() {
    try {
        const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';
        let stats = {
            total_calls: 0, inbound_calls: 0, outbound_calls: 0,
            active_bookings: 0, open_leads: 0, pending_follow_ups: 0, total_customers: 0,
        };

        const callsCol = await getCollection('calls');
        if (callsCol) {
            // MongoDB backend
            stats.total_calls = await callsCol.countDocuments();
            stats.inbound_calls = await callsCol.countDocuments({ direction: 'inbound' });
            stats.outbound_calls = await callsCol.countDocuments({ direction: 'outbound' });
            const appointmentsCol = await getCollection('appointments');
            if (appointmentsCol) {
                stats.active_bookings = await appointmentsCol.countDocuments({
                    status: { $in: ['pending', 'confirmed', 'in_progress'] }
                });
            }
            const leadsCol = await getCollection('leads');
            if (leadsCol) {
                stats.open_leads = await leadsCol.countDocuments({
                    status: { $in: ['new', 'contacted', 'qualified'] }
                });
            }
            const customersCol = await getCollection('customers');
            if (customersCol) {
                stats.total_customers = await customersCol.countDocuments();
            }
            stats.pending_follow_ups = 0; // No follow_ups collection in MongoDB
        } else {
            // SQLite backend
            try {
                const Database = await import('better-sqlite3');
                const db = new (Database.default as any)(dbPath, { readonly: true }) as any;
                stats.total_calls = (db.prepare('SELECT COUNT(*) as c FROM calls').get() as any).c || 0;
                stats.inbound_calls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE direction = 'inbound'").get() as any).c || 0;
                stats.outbound_calls = (db.prepare("SELECT COUNT(*) as c FROM calls WHERE direction = 'outbound'").get() as any).c || 0;
                stats.active_bookings = (db.prepare("SELECT COUNT(*) as c FROM service_bookings WHERE status IN ('pending','confirmed','in_progress')").get() as any).c || 0;
                stats.open_leads = (db.prepare("SELECT COUNT(*) as c FROM leads WHERE status IN ('new','contacted','qualified')").get() as any).c || 0;
                stats.pending_follow_ups = (db.prepare("SELECT COUNT(*) as c FROM follow_ups WHERE status = 'pending'").get() as any).c || 0;
                stats.total_customers = (db.prepare('SELECT COUNT(*) as c FROM customers').get() as any).c || 0;
                db.close();
            } catch {
                // better-sqlite3 not available at build time — return zeros
            }
        }

        return NextResponse.json(stats);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
