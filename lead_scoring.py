"""
LeadScoringEngine — 0-100 lead scoring per PROJECT_VISION.md specification.

Scoring Factors:
- Has budget: up to 25 points
- Timeline <30 days: up to 20 points
- Product model known: up to 15 points
- Location Kerala: 10 points
- Farm size >5 acres: 10 points
- Multi-product interest: 10 points
- Asked for demo: 10 points

Categories: Hot (80-100), Warm (40-79), Cold (0-39)
"""

import logging
from typing import Optional

import config

logger = logging.getLogger("manas-scoring")


class LeadScoringEngine:
    def __init__(self):
        self.weights = config.LEAD_SCORING_WEIGHTS
        self.categories = config.LEAD_CATEGORIES

    def calculate(self, call_memory) -> dict:
        """
        Calculate lead score from conversation memory.
        Returns {score, category, factors, category_label, action}
        """
        data = call_memory.to_dict()
        customer = data.get("customer", {})
        interest = data.get("interest", {})

        factors = {
            "has_budget": self._score_budget(interest),
            "has_timeline_30d": self._score_timeline(interest),
            "model_known": self._score_model_known(interest),
            "location_kerala": self._score_location(customer),
            "farm_size_5acres": self._score_farm_size(customer),
            "multi_product_interest": self._score_multi_product(data),
            "asked_for_demo": self._score_demo(data),
        }

        total = sum(factors.values())
        category_key = self._get_category(total)
        category_info = self.categories.get(category_key, self.categories["cold"])

        logger.info(f"Lead score: {total}/100 ({category_key}) — factors: {factors}")

        return {
            "score": total,
            "category": category_key,
            "category_label": category_info["label"],
            "action": category_info["action"],
            "factors": factors,
        }

    # ------------------------------------------------------------------
    # Factor scoring methods
    # ------------------------------------------------------------------

    def _score_budget(self, interest: dict) -> int:
        budget_min = interest.get("budget_min")
        budget_max = interest.get("budget_max")
        if budget_max and budget_max > 0:
            return self.weights["has_budget"]
        if budget_min and budget_min > 0:
            return int(self.weights["has_budget"] * 0.6)  # Partial — only min known
        return 0

    def _score_timeline(self, interest: dict) -> int:
        timeline = (interest.get("purchase_timeline") or "").lower()
        if not timeline:
            return 0
        # Keyword-based urgency scoring
        urgent_keywords = ["immediate", "urgent", "asap", "this week", "today", "tomorrow"]
        near_keywords = ["this month", "within", "soon", "next month", "30 days"]
        if any(kw in timeline for kw in urgent_keywords):
            return self.weights["has_timeline_30d"]
        if any(kw in timeline for kw in near_keywords):
            return int(self.weights["has_timeline_30d"] * 0.75)
        return int(self.weights["has_timeline_30d"] * 0.4)  # Gave a timeline

    def _score_model_known(self, interest: dict) -> int:
        model = interest.get("specific_model", "")
        if model and len(model) > 1:
            return self.weights["model_known"]
        if interest.get("product_category"):
            return int(self.weights["model_known"] * 0.5)  # Category known, not model
        return 0

    def _score_location(self, customer: dict) -> int:
        state = (customer.get("state") or "").lower()
        if state == "kerala":
            return self.weights["location_kerala"]
        return 0

    def _score_farm_size(self, customer: dict) -> int:
        farm_size = customer.get("farm_size_acres")
        if farm_size and farm_size >= 5:
            return self.weights["farm_size_5acres"]
        return 0

    def _score_multi_product(self, data: dict) -> int:
        products = data.get("products_discussed", [])
        if len(products) >= 2:
            return self.weights["multi_product_interest"]
        if len(products) == 1:
            return int(self.weights["multi_product_interest"] * 0.5)
        return 0

    def _score_demo(self, data: dict) -> int:
        apt = data.get("appointment", {})
        if apt.get("type") == "demo":
            return self.weights["asked_for_demo"]
        # Check tool calls for demo-related actions
        tools = data.get("tool_calls_made", [])
        if "book_demo" in tools:
            return self.weights["asked_for_demo"]
        if "book_service" in tools and apt.get("type") == "demo":
            return self.weights["asked_for_demo"]
        # Also check transcript keywords
        transcript = (data.get("transcript") or "").lower()
        if any(kw in transcript for kw in ["demo", "test drive", "showroom visit"]):
            return self.weights["asked_for_demo"]
        return 0

    # ------------------------------------------------------------------
    # Category resolution
    # ------------------------------------------------------------------

    def _get_category(self, score: int) -> str:
        if score >= 80:
            return "hot"
        if score >= 40:
            return "warm"
        return "cold"

    def get_category(self, score: int) -> str:
        return self._get_category(score)
