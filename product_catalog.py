"""
Product catalog for Manas Group India.
Contains all products across 7 brands with voice-friendly formatting.
"""

# ---------------------------------------------------------------------------
# Complete product data — seeded into the database on first run
# ---------------------------------------------------------------------------
PRODUCT_DATA = [
    # === John Deere Tractors ===
    {"brand": "John Deere", "model": "3036 EN", "category": "tractor", "subcategory": "compact",
     "horsepower": 36, "description": "Compact utility tractor, ideal for small farms and orchards",
     "price_min": 550000, "price_max": 650000},
    {"brand": "John Deere", "model": "3028 EN", "category": "tractor", "subcategory": "compact",
     "horsepower": 28, "description": "Entry-level compact tractor for small landholdings",
     "price_min": 480000, "price_max": 560000},
    {"brand": "John Deere", "model": "5045D GearPro", "category": "tractor", "subcategory": "mid_range",
     "horsepower": 45, "description": "Popular mid-range workhorse, excellent fuel efficiency",
     "price_min": 650000, "price_max": 720000},
    {"brand": "John Deere", "model": "5050D GearPro", "category": "tractor", "subcategory": "mid_range",
     "horsepower": 50, "description": "Versatile all-rounder for all farming operations",
     "price_min": 700000, "price_max": 820000},
    {"brand": "John Deere", "model": "5045 PowerPro", "category": "tractor", "subcategory": "mid_range",
     "horsepower": 45, "description": "Power steering variant with advanced ergonomics",
     "price_min": 720000, "price_max": 800000},
    {"brand": "John Deere", "model": "5042 PowerPro", "category": "tractor", "subcategory": "mid_range",
     "horsepower": 42, "description": "Fuel-efficient workhorse with power steering",
     "price_min": 680000, "price_max": 750000},
    {"brand": "John Deere", "model": "5039 PowerPro", "category": "tractor", "subcategory": "compact",
     "horsepower": 39, "description": "Compact tractor with power steering, good for inter-cultivation",
     "price_min": 620000, "price_max": 700000},
    {"brand": "John Deere", "model": "5105", "category": "tractor", "subcategory": "heavy_duty",
     "horsepower": 50, "description": "Heavy-duty tractor for intensive farming operations",
     "price_min": 750000, "price_max": 850000},
    {"brand": "John Deere", "model": "5205", "category": "tractor", "subcategory": "heavy_duty",
     "horsepower": 50, "description": "Advanced features, suitable for commercial farming",
     "price_min": 800000, "price_max": 900000},
    {"brand": "John Deere", "model": "5210 GearPro", "category": "tractor", "subcategory": "premium",
     "horsepower": 52, "description": "Premium mid-range with advanced transmission",
     "price_min": 850000, "price_max": 1000000},
    {"brand": "John Deere", "model": "5310 PowerTech", "category": "tractor", "subcategory": "premium",
     "horsepower": 55, "description": "High power for large farms, excellent hydraulic capacity",
     "price_min": 950000, "price_max": 1150000},
    {"brand": "John Deere", "model": "5405 PowerTech", "category": "tractor", "subcategory": "premium",
     "horsepower": 55, "description": "Advanced hydraulics, ideal for heavy implements",
     "price_min": 1000000, "price_max": 1200000},
    {"brand": "John Deere", "model": "5075E PowerTech", "category": "tractor", "subcategory": "commercial",
     "horsepower": 75, "description": "Commercial-grade tractor for large-scale farming and contracting",
     "price_min": 2500000, "price_max": 3500000},
    {"brand": "John Deere", "model": "5050", "category": "tractor", "subcategory": "mid_range",
     "horsepower": 50, "description": "Standard 50HP model, reliable and proven",
     "price_min": 720000, "price_max": 800000},
    {"brand": "John Deere", "model": "5036", "category": "tractor", "subcategory": "compact",
     "horsepower": 36, "description": "Budget-friendly compact tractor for small farms",
     "price_min": 520000, "price_max": 600000},

    # === John Deere Harvesters ===
    {"brand": "John Deere", "model": "W70 Combine Harvester", "category": "harvester", "subcategory": "combine",
     "horsepower": 120, "description": "Combine harvester for paddy and wheat, high grain separation efficiency",
     "price_min": 2500000, "price_max": 3200000},
    {"brand": "John Deere", "model": "W50 Combine Harvester", "category": "harvester", "subcategory": "combine",
     "horsepower": 100, "description": "Mid-range combine for paddy and wheat, fuel-efficient",
     "price_min": 2000000, "price_max": 2600000},
    {"brand": "John Deere", "model": "T-Series Harvester", "category": "harvester", "subcategory": "combine",
     "horsepower": 110, "description": "Track-type combine for wet paddy fields in Kerala conditions",
     "price_min": 2800000, "price_max": 3500000},

    # === John Deere Implements ===
    {"brand": "John Deere", "model": "Mulcher", "category": "implement", "subcategory": "crop_management",
     "horsepower": None, "description": "Crop residue mulcher, shreds paddy stubble and returns organic matter to soil",
     "price_min": 45000, "price_max": 85000},
    {"brand": "John Deere", "model": "Flail Mower", "category": "implement", "subcategory": "crop_management",
     "horsepower": None, "description": "Heavy-duty mower for grass, shrubs, and light vegetation management",
     "price_min": 60000, "price_max": 120000},
    {"brand": "John Deere", "model": "Compact Round Baler", "category": "implement", "subcategory": "harvesting",
     "horsepower": None, "description": "Bales paddy straw into compact round bales for easy transport and storage",
     "price_min": 250000, "price_max": 400000},
    {"brand": "John Deere", "model": "Multi-crop Vacuum Planter", "category": "implement", "subcategory": "sowing",
     "horsepower": None, "description": "Precision vacuum planter for multiple crops — maize, groundnut, soybean, pulses",
     "price_min": 150000, "price_max": 280000},
    {"brand": "John Deere", "model": "Ratoon Manager", "category": "implement", "subcategory": "crop_management",
     "horsepower": None, "description": "Sugarcane ratoon management implement for stubble shaving and off-barring",
     "price_min": 35000, "price_max": 65000},
    {"brand": "John Deere", "model": "Fertilizer Broadcaster", "category": "implement", "subcategory": "application",
     "horsepower": None, "description": "Broadcasts granular fertilizer evenly across fields, adjustable spread width",
     "price_min": 18000, "price_max": 35000},
    {"brand": "John Deere", "model": "Roto Seeder", "category": "implement", "subcategory": "sowing",
     "horsepower": None, "description": "Combined rotavator and seed drill for single-pass land preparation and sowing",
     "price_min": 80000, "price_max": 150000},
    {"brand": "John Deere", "model": "Seed Cum Fertilizer Drill", "category": "implement", "subcategory": "sowing",
     "horsepower": None, "description": "Places seed and fertilizer simultaneously in separate rows for optimal germination",
     "price_min": 55000, "price_max": 95000},
    {"brand": "John Deere", "model": "Super Seeder", "category": "implement", "subcategory": "sowing",
     "horsepower": None, "description": "Direct paddy seeder — eliminates the need for nursery raising and transplanting",
     "price_min": 70000, "price_max": 130000},
    {"brand": "John Deere", "model": "Cultivator", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Spring-loaded cultivator for secondary tillage and weed removal",
     "price_min": 30000, "price_max": 60000},
    {"brand": "John Deere", "model": "Ridger", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Forms ridges and furrows for vegetable and sugarcane cultivation",
     "price_min": 25000, "price_max": 45000},
    {"brand": "John Deere", "model": "MB Plough (Single Bottom)", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Mouldboard plough for primary tillage, inverts soil and buries crop residue",
     "price_min": 35000, "price_max": 65000},
    {"brand": "John Deere", "model": "MB Plough (Deluxe)", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Heavy-duty MB plough with automatic reset for rocky/semi-rocky soils",
     "price_min": 55000, "price_max": 95000},
    {"brand": "John Deere", "model": "Laser Leveler", "category": "implement", "subcategory": "land_development",
     "horsepower": None, "description": "Laser-guided land leveler for precise field leveling, saves irrigation water by 25-30%",
     "price_min": 200000, "price_max": 400000},
    {"brand": "John Deere", "model": "Puddler Cum Leveler", "category": "implement", "subcategory": "land_development",
     "horsepower": None, "description": "Puddles and levels paddy fields in a single pass, essential for wet rice cultivation",
     "price_min": 35000, "price_max": 70000},
    {"brand": "John Deere", "model": "Subsoiler", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Breaks hardpan layer below the plough depth, improves water infiltration and root growth",
     "price_min": 40000, "price_max": 75000},
    {"brand": "John Deere", "model": "Chisel Plough", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Deep tillage without soil inversion, conserves soil moisture and structure",
     "price_min": 45000, "price_max": 80000},
    {"brand": "John Deere", "model": "Check Basin Former", "category": "implement", "subcategory": "irrigation",
     "horsepower": None, "description": "Forms check basins for efficient flood irrigation in row crops",
     "price_min": 30000, "price_max": 55000},

    # === Shaktiman ===
    {"brand": "Shaktiman", "model": "Rotavator (Standard)", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Standard duty rotavator for seedbed preparation, suitable for 35-55HP tractors",
     "price_min": 55000, "price_max": 95000},
    {"brand": "Shaktiman", "model": "Rotavator (Heavy Duty)", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Heavy-duty rotavator for tough soil conditions, for 55HP+ tractors",
     "price_min": 80000, "price_max": 140000},
    {"brand": "Shaktiman", "model": "Seed Drill", "category": "implement", "subcategory": "sowing",
     "horsepower": None, "description": "Multi-crop seed drill with fluted roller metering, 9-13 tine options",
     "price_min": 50000, "price_max": 90000},
    {"brand": "Shaktiman", "model": "Thresher (Multi-Crop)", "category": "implement", "subcategory": "harvesting",
     "horsepower": None, "description": "Electric/PTO multi-crop thresher for paddy, wheat, pulses",
     "price_min": 80000, "price_max": 180000},
    {"brand": "Shaktiman", "model": "Disc Plough", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Mounted disc plough for primary tillage in dry and hard soils",
     "price_min": 40000, "price_max": 70000},
    {"brand": "Shaktiman", "model": "Cultivator (Spring Loaded)", "category": "implement", "subcategory": "tillage",
     "horsepower": None, "description": "Spring-loaded cultivator with automatic trip mechanism for rocky soils",
     "price_min": 35000, "price_max": 65000},

    # === Kirloskar ===
    {"brand": "Kirloskar", "model": "Mini Harvester", "category": "harvester", "subcategory": "mini",
     "horsepower": 15, "description": "Walk-behind mini harvester for small paddy fields, ideal for Kerala terrain",
     "price_min": 150000, "price_max": 220000},
    {"brand": "Kirloskar", "model": "Kisan Drone", "category": "implement", "subcategory": "spraying",
     "horsepower": None, "description": "Agricultural spraying drone, 10L tank capacity, covers 1 acre in 15 minutes",
     "price_min": 350000, "price_max": 550000},
    {"brand": "Kirloskar", "model": "Power Weeder", "category": "implement", "subcategory": "crop_management",
     "horsepower": 5, "description": "Engine-operated power weeder for paddy and vegetable fields, removes weeds between rows",
     "price_min": 35000, "price_max": 55000},
    {"brand": "Kirloskar", "model": "Power Tiller (8HP)", "category": "tractor", "subcategory": "power_tiller",
     "horsepower": 8, "description": "Light power tiller for wetland paddy operations, rotavator attachment included",
     "price_min": 120000, "price_max": 170000},
    {"brand": "Kirloskar", "model": "Power Tiller (14HP)", "category": "tractor", "subcategory": "power_tiller",
     "horsepower": 14, "description": "Heavy-duty power tiller with trailer option, suitable for dry and wet land",
     "price_min": 180000, "price_max": 250000},

    # === Bull ===
    {"brand": "Bull", "model": "Ultra Loader", "category": "implement", "subcategory": "loader",
     "horsepower": None, "description": "Front-end loader for tractors, 500kg lifting capacity, quick-attach system",
     "price_min": 200000, "price_max": 350000},
    {"brand": "Bull", "model": "Sugarcane Loader v2", "category": "implement", "subcategory": "loader",
     "horsepower": None, "description": "Specialized sugarcane loader with grabber attachment, hydraulic controls",
     "price_min": 250000, "price_max": 400000},
    {"brand": "Bull", "model": "Backhoe Loader", "category": "implement", "subcategory": "loader",
     "horsepower": None, "description": "Tractor-mounted backhoe loader with dozer blade, digging depth 8-10 feet",
     "price_min": 350000, "price_max": 550000},
    {"brand": "Bull", "model": "Front End Loader (Agri)", "category": "implement", "subcategory": "loader",
     "horsepower": None, "description": "Agricultural front-end loader for material handling, manure, and soil movement",
     "price_min": 180000, "price_max": 300000},

    # === Redlands ===
    {"brand": "Redlands", "model": "Works Truck", "category": "vehicle", "subcategory": "transport",
     "horsepower": 60, "description": "Heavy-duty farm transport vehicle, 2-3 ton payload, suitable for rough terrain",
     "price_min": 500000, "price_max": 800000},
    {"brand": "Redlands", "model": "Round Straw Baler", "category": "implement", "subcategory": "harvesting",
     "horsepower": None, "description": "PTO-driven round baler for paddy straw and hay, bale weight up to 25-30 kg",
     "price_min": 200000, "price_max": 350000},
    {"brand": "Redlands", "model": "Rotary Hay Rake", "category": "implement", "subcategory": "harvesting",
     "horsepower": None, "description": "Rotary rake for gathering cut hay/straw into windrows for baling",
     "price_min": 70000, "price_max": 130000},
    {"brand": "Redlands", "model": "Bund Former", "category": "implement", "subcategory": "land_development",
     "horsepower": None, "description": "Forms raised bunds/borders around paddy fields for water retention",
     "price_min": 30000, "price_max": 55000},

    # === BCS Ferrari ===
    {"brand": "BCS Ferrari", "model": "Engine Driven Welder", "category": "equipment", "subcategory": "workshop",
     "horsepower": 10, "description": "Portable engine-driven welding machine, ideal for on-farm repair work",
     "price_min": 80000, "price_max": 140000},
    {"brand": "BCS Ferrari", "model": "Forage Harvester", "category": "harvester", "subcategory": "forage",
     "horsepower": None, "description": "Tractor-mounted forage harvester for chopping green fodder, maize, and grass",
     "price_min": 120000, "price_max": 200000},
    {"brand": "BCS Ferrari", "model": "Power Weeder BCS", "category": "implement", "subcategory": "crop_management",
     "horsepower": 6, "description": "Self-propelled power weeder with multiple blade options for different crops",
     "price_min": 40000, "price_max": 65000},
    {"brand": "BCS Ferrari", "model": "Reaper Binder", "category": "implement", "subcategory": "harvesting",
     "horsepower": None, "description": "Tractor-mounted reaper binder for paddy and wheat, cuts and ties into bundles",
     "price_min": 90000, "price_max": 160000},
]


def search_products(query: str) -> list:
    """Search products by text matching across brand, model, category, and description."""
    if not query:
        return []
    q = query.lower().strip()
    results = []
    for p in PRODUCT_DATA:
        if (q in p["brand"].lower()
            or q in p["model"].lower()
            or q in p["category"].lower()
            or (p["subcategory"] and q in p["subcategory"].lower())
            or q in p["description"].lower()):
            results.append(p)
    return results


def get_product_by_model(model: str) -> dict | None:
    """Exact or partial match on model name."""
    model_lower = model.lower().strip()
    for p in PRODUCT_DATA:
        if model_lower in p["model"].lower():
            return p
    return None


def format_product_for_voice(product: dict) -> str:
    """Convert a product dict to a concise voice-friendly description."""
    hp = f"{product['horsepower']} HP, " if product["horsepower"] else ""
    price = ""
    if product["price_min"] and product["price_max"]:
        min_l = f"{product['price_min']/100000:.1f} lakhs"
        max_l = f"{product['price_max']/100000:.1f} lakhs"
        if product["price_min"] == product["price_max"]:
            price = f"Approximately Rs. {min_l}. "
        else:
            price = f"Price range Rs. {min_l} to {max_l}. "
    return f"{product['brand']} {product['model']} — {hp}{product['description']}. {price}"


def format_product_list_for_voice(products: list, max_items: int = 5) -> str:
    """Format a list of products for voice output, limited to max_items."""
    if not products:
        return "No matching products found."

    if len(products) <= max_items:
        items = [format_product_for_voice(p) for p in products]
        return "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))

    items = [format_product_for_voice(p) for p in products[:max_items]]
    summary = "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))
    remaining = len(products) - max_items
    summary += f"\n\n...and {remaining} more models. Would you like details on a specific one?"
    return summary
