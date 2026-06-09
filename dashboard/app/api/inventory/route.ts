import { NextResponse } from 'next/server';

export async function GET() {
  const dbPath = process.env.DATABASE_PATH || 'data/manas_group.db';

  try {
    const Database = await import('better-sqlite3');
    const db = new (Database.default as any)(dbPath, { readonly: true });

    // LEFT JOIN products with inventory_cache to get real stock quantities
    let products: any[] = [];
    try {
      products = db.prepare(`
        SELECT
          p.id,
          p.brand,
          p.model,
          p.category,
          p.subcategory,
          p.horsepower,
          p.approximate_price_min,
          p.approximate_price_max,
          p.in_stock,
          COALESCE(ic.quantity_in_stock, CASE WHEN p.in_stock = 1 THEN 1 ELSE 0 END) as quantity,
          ic.restock_eta_days,
          CASE
            WHEN p.in_stock = 0 THEN 'out_of_stock'
            WHEN COALESCE(ic.quantity_in_stock, 1) = 0 THEN 'out_of_stock'
            WHEN COALESCE(ic.quantity_in_stock, 1) <= 2 THEN 'low_stock'
            ELSE 'in_stock'
          END as status
        FROM products p
        LEFT JOIN inventory_cache ic ON ic.product_id = p.id
        ORDER BY p.brand, p.model
      `).all() as any[];
    } catch {
      // fallback: just products table
      products = db.prepare(`
        SELECT
          id, brand, model, category, subcategory, horsepower,
          approximate_price_min, approximate_price_max, in_stock,
          CASE WHEN in_stock = 1 THEN 1 ELSE 0 END as quantity,
          NULL as restock_eta_days,
          CASE WHEN in_stock = 0 THEN 'out_of_stock' ELSE 'in_stock' END as status
        FROM products
        ORDER BY brand, model
      `).all() as any[];
    }
    db.close();

    const inStock = products.filter((p: any) => p.status === 'in_stock').length;
    const lowStock = products.filter((p: any) => p.status === 'low_stock').length;
    const outOfStock = products.filter((p: any) => p.status === 'out_of_stock').length;

    return NextResponse.json({
      products,
      kpis: {
        totalProducts: products.length,
        inStock,
        lowStock,
        outOfStock,
      },
    });
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ products: [], kpis: { totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 } });
  }
}
