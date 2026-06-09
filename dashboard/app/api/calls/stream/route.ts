import { NextRequest } from 'next/server';

// In-memory store of connected SSE clients
const clients = new Set<ReadableStreamController<any>>();

export function notifyCallUpdate(event: any) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const controller of clients) {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch {
      clients.delete(controller);
    }
  }
}

async function fetchCalls() {
  try {
    const Database = await import('better-sqlite3');
    const dbPath = process.env.DATABASE_PATH || '../data/manas_group.db';
    const db = new (Database.default as any)(dbPath, { readonly: true });
    const calls = db.prepare(
      'SELECT * FROM calls ORDER BY created_at DESC LIMIT 30'
    ).all();
    db.close();
    return calls;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  let abort = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      clients.add(controller);

      // Send initial data
      const calls = await fetchCalls();
      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify({ type: 'initial', calls })}\n\n`)
      );

      // Poll DB every 3 seconds for changes
      timer = setInterval(async () => {
        if (abort) return;
        try {
          const calls = await fetchCalls();
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'update', calls })}\n\n`)
          );
        } catch {
          // client may have disconnected
        }
      }, 3000);

      request.signal.addEventListener('abort', () => {
        abort = true;
        if (timer) clearInterval(timer);
        clients.delete(controller);
      });
    },
    cancel() {
      abort = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
