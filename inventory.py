"""
InventoryManager — Inventory-aware product recommendations.

Uses a separate inventory_cache table (not the products table).
Provides stock checking, alternative suggestions, and voice-friendly
stock status messages.
"""

import logging
from typing import Optional

logger = logging.getLogger("manas-inventory")


class InventoryManager:
    def __init__(self, db):
        self.db = db

    def check_stock(self, brand: str = None, model: str = None) -> list:
        """
        Check inventory for matching products.
        Returns list of inventory records with product details.
        """
        results = self.db.check_inventory(brand=brand, model=model)
        if not results and model:
            # Try broader brand search
            results = self.db.check_inventory(brand=brand)
        return results

    def get_alternatives(self, product, budget_max: float = None) -> list:
        """
        Find in-stock alternatives in the same category.
        Accepts a product dict or a model name string.
        Excludes the product that's out of stock.
        """
        if isinstance(product, str):
            model = product
            results = self.db.check_inventory(model=model)
            category = results[0].get("category", "") if results else ""
        else:
            category = product.get("category", "")
            model = product.get("model", "")
        return self.db.get_alternatives_in_stock(
            category=category,
            subcategory=None,
            budget_max=budget_max,
            exclude_model=model,
        )

    def format_stock_status(self, inventory_records: list) -> str:
        """
        Voice-friendly stock status for a list of inventory records.
        """
        if not inventory_records:
            return "I couldn't find that product in our inventory. Let me check alternatives."

        parts = []
        for inv in inventory_records:
            brand = inv.get("brand", "")
            model_name = inv.get("model", "")
            qty = inv.get("quantity_in_stock", 0)
            eta = inv.get("restock_eta_days")

            if qty > 5:
                parts.append(f"{brand} {model_name} is in stock and readily available.")
            elif qty > 0:
                parts.append(f"{brand} {model_name} is available but stock is limited ({qty} remaining).")
            elif eta:
                parts.append(f"{brand} {model_name} is currently out of stock. Next batch expected in {eta} days.")
            else:
                parts.append(f"{brand} {model_name} is currently out of stock. I can suggest alternatives.")

        return " ".join(parts)

    def format_alternatives(self, alternatives: list) -> str:
        """Voice-friendly list of alternative products."""
        if not alternatives:
            return "No in-stock alternatives found in this category."

        items = []
        for alt in alternatives[:3]:
            brand = alt.get("brand", "")
            model_name = alt.get("model", "")
            price_min = alt.get("approximate_price_min")
            if price_min:
                price_str = f"Rs. {price_min/100000:.1f} lakhs"
            else:
                price_str = "price on request"
            items.append(f"{brand} {model_name} — {price_str}")

        return "In-stock alternatives: " + "; ".join(
            f"{i+1}. {item}" for i, item in enumerate(items)
        )

    def update_stock(self, brand: str, model: str, quantity: int,
                     restock_eta_days: int = None):
        """Update stock levels for a product."""
        results = self.db.check_inventory(brand=brand, model=model)
        if results:
            product_id = results[0].get("product_id")
            if product_id:
                self.db.update_product_stock(product_id, quantity, restock_eta_days)
                logger.info(f"Stock updated: {brand} {model} → {quantity} (eta={restock_eta_days})")
