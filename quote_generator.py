"""
QuoteGenerator — Produces structured price quotes from conversation data.

Generates:
- Quote ID (QT-YYYYMMDD-XXXX)
- On-road price breakdown (ex-showroom + insurance + registration + accessories)
- Financing options (3 options with different down payment levels)
- Voice-friendly summary for reading during calls
"""

import logging
import json
import random
from datetime import datetime, timedelta
from typing import Optional

import config

logger = logging.getLogger("manas-quotes")


class QuoteGenerator:
    def __init__(self, db):
        self.db = db

    def generate(self, model: str, customer_name: str, phone: str,
                 budget_min: float = None, budget_max: float = None,
                 call_id: int = None) -> dict:
        """
        Generate a structured quote for a product model.

        Returns full quote dict, and persists to database.
        """
        product = self.db.get_product_by_model(model)
        if not product:
            logger.warning(f"Product not found for quote: {model}")
            return {"error": f"Could not find '{model}' in catalog."}

        # Use price from product catalog
        price_max = product.get("approximate_price_max") or product.get("approximate_price_min") or 0
        price_min = product.get("approximate_price_min") or price_max

        if price_max <= 0:
            return {"error": f"Price not available for {product['brand']} {product['model']}."}

        ex_showroom = price_min if budget_max and price_max > budget_max else price_max

        # On-road price breakdown
        on_road = self._calculate_on_road(ex_showroom)

        # Financing options
        financing = self._generate_financing_options(on_road["total"])

        # Quote ID and validity
        quote_id = self._generate_quote_id()
        valid_until = (datetime.now() + timedelta(days=config.QUOTE_VALIDITY_DAYS)).strftime("%Y-%m-%d")

        quote = {
            "quote_id": quote_id,
            "customer": {
                "name": customer_name,
                "phone": phone,
            },
            "product": {
                "brand": product["brand"],
                "model": product["model"],
                "category": product.get("category", ""),
                "horsepower": product.get("horsepower"),
                "description": product.get("description", ""),
            },
            "pricing": on_road,
            "financing_options": financing,
            "valid_until": valid_until,
            "dealer_info": {
                "name": "Manas Group India",
                "address": config.MANAS_ADDRESS,
                "phone": config.MANAS_AI_PHONE_NUMBER or "",
                "email": config.MANAS_EMAIL,
            },
            "status": "draft",
        }

        # Persist to DB
        try:
            self.db.create_quote(
                quote_id=quote_id,
                call_id=call_id,
                customer_name=customer_name,
                phone=phone,
                brand=product["brand"],
                model=product["model"],
                ex_showroom_price=ex_showroom,
                total_price=on_road["total"],
                financing_options_json=json.dumps(financing),
                valid_until=valid_until,
            )
        except Exception as e:
            logger.error(f"Failed to persist quote: {e}")

        logger.info(f"Quote generated: {quote_id} for {product['brand']} {product['model']}")
        return quote

    # ------------------------------------------------------------------
    # On-road price calculation
    # ------------------------------------------------------------------

    def _calculate_on_road(self, ex_showroom: float) -> dict:
        costs = config.QUOTE_ON_ROAD_COSTS
        insurance = round(ex_showroom * costs["insurance_pct"])
        registration = round(ex_showroom * costs["registration_pct"])
        accessories = round(ex_showroom * costs["accessories_pct"])
        total = ex_showroom + insurance + registration + accessories

        return {
            "ex_showroom": ex_showroom,
            "insurance": insurance,
            "registration": registration,
            "accessories": accessories,
            "total": total,
        }

    # ------------------------------------------------------------------
    # Financing options
    # ------------------------------------------------------------------

    def _generate_financing_options(self, total: float) -> list:
        options = []
        rate = config.FINANCING_DEFAULT_RATE / 100
        monthly_rate = rate / 12
        tenure = config.FINANCING_DEFAULT_TENURE

        for down_pct in config.QUOTE_DOWN_PAYMENT_OPTIONS:
            down_payment = round(total * down_pct)
            loan = total - down_payment
            if monthly_rate > 0:
                emi = loan * monthly_rate * ((1 + monthly_rate) ** tenure) / \
                      (((1 + monthly_rate) ** tenure) - 1)
            else:
                emi = loan / tenure
            options.append({
                "down_payment": down_payment,
                "down_payment_pct": int(down_pct * 100),
                "loan_amount": round(loan),
                "tenure_months": tenure,
                "emi_monthly": round(emi),
                "interest_rate_pct": config.FINANCING_DEFAULT_RATE,
                "bank": config.FINANCING_PARTNER_BANKS[0],
            })

        return options

    # ------------------------------------------------------------------
    # Formatting
    # ------------------------------------------------------------------

    def format_for_voice(self, quote: dict) -> str:
        """Voice-friendly summary for reading during the call."""
        if "error" in quote:
            return quote["error"]

        product = quote["product"]
        pricing = quote["pricing"]
        fin = quote["financing_options"][1] if len(quote["financing_options"]) > 1 else quote["financing_options"][0]

        total_lakhs = pricing["total"] / 100000
        emi_str = f"{fin['emi_monthly']:,}" if fin["emi_monthly"] < 100000 else f"{fin['emi_monthly']/100000:.1f} lakhs"

        return (
            f"Quote {quote['quote_id']} for {product['brand']} {product['model']}: "
            f"On-road price approximately Rs. {total_lakhs:.1f} lakhs. "
            f"With {fin['down_payment_pct']}% down payment of Rs. {fin['down_payment']:,}, "
            f"EMI would be Rs. {emi_str} per month for {fin['tenure_months']} months. "
            f"Quote valid until {quote['valid_until']}."
        )

    def format_for_text(self, quote: dict) -> str:
        """WhatsApp/text-friendly formatted quote."""
        if "error" in quote:
            return quote["error"]

        product = quote["product"]
        pricing = quote["pricing"]

        lines = [
            f"*Manas Group India — Price Quote*",
            f"",
            f"*Quote ID:* {quote['quote_id']}",
            f"*Product:* {product['brand']} {product['model']}",
            f"",
            f"*Price Breakdown:*",
            f"  Ex-Showroom: Rs. {pricing['ex_showroom']:,}",
            f"  Insurance:   Rs. {pricing['insurance']:,}",
            f"  Registration: Rs. {pricing['registration']:,}",
            f"  Accessories: Rs. {pricing['accessories']:,}",
            f"  *Total On-Road: Rs. {pricing['total']:,}*",
            f"",
            f"*Financing Options:*",
        ]

        for opt in quote["financing_options"]:
            emi_str = f"Rs. {opt['emi_monthly']:,}"
            lines.append(
                f"  {opt['down_payment_pct']}% Down: Rs. {opt['down_payment']:,} → EMI {emi_str}/mo × {opt['tenure_months']}mo"
            )

        lines += [
            f"",
            f"*Valid until:* {quote['valid_until']}",
            f"*Contact:* {quote['dealer_info']['phone']}",
            f"*Address:* {quote['dealer_info']['address']}",
        ]
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_quote_id() -> str:
        today = datetime.now().strftime("%Y%m%d")
        suffix = random.randint(1000, 9999)
        return f"QT-{today}-{suffix}"
