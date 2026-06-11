"""
Function tools for Manas Group India voice agent.
Uses LiveKit's llm.ToolContext pattern with async methods.

Phase 1: 12 tools — 8 original + lock_language, log_budget, log_timeline, generate_quote.
All tools are call_memory-aware — they update conversation context on each call.
"""

import logging
from typing import Optional
from livekit import agents, api
from livekit.agents import llm

import config

logger = logging.getLogger("manas-tools")


class ManasAgentFunctions(llm.ToolContext):
    def __init__(self, ctx: agents.JobContext, phone_number: str = None, db=None,
                 call_memory=None):
        super().__init__(tools=[])
        self.ctx = ctx
        self.phone_number = phone_number
        self.inbound_caller_identity = None
        self.current_call_id = None
        self.call_memory = call_memory
        self.session = None          # set by entrypoint after AgentSession is created
        self._build_stt_fn = None    # set by entrypoint to enable STT rebuild on language switch
        self._build_tts_fn = None    # set by entrypoint to enable TTS rebuild on language switch

        if db is not None:
            self.db = db
        else:
            from db import create_database
            self.db = create_database()

        # Lazy-init modules (imported when first used, not at agent start)
        self._escalation = None
        self._quote_generator = None
        self._lead_scorer = None

    @property
    def escalation(self):
        if self._escalation is None:
            from escalation import EscalationFramework
            self._escalation = EscalationFramework(self.db, self.call_memory, self)
        return self._escalation

    @property
    def quote_generator(self):
        if self._quote_generator is None:
            from quote_generator import QuoteGenerator
            self._quote_generator = QuoteGenerator(self.db)
        return self._quote_generator

    @property
    def lead_scorer(self):
        if self._lead_scorer is None:
            from lead_scoring import LeadScoringEngine
            self._lead_scorer = LeadScoringEngine()
        return self._lead_scorer

    def _record_tool(self, tool_name: str):
        """Record tool usage in call_memory for outcome classification."""
        if self.call_memory:
            self.call_memory.record_tool_call(tool_name)

    @llm.function_tool(description="Look up a customer by phone number. Returns name, address, language preference, recent calls, active bookings, and open inquiries. Call this at the START of EVERY call.")
    async def lookup_user(self, phone: str) -> str:
        logger.info(f"Looking up customer: {phone}")
        self._record_tool("lookup_user")
        result = self.db.format_customer_for_voice(phone)
        # Enrich call_memory with customer profile
        if self.call_memory:
            profile = self.db.lookup_user(phone)
            if profile:
                self.call_memory.update_customer_field("name", profile.get("name", ""))
                self.call_memory.update_customer_field("district", profile.get("district", ""))
                self.call_memory.update_customer_field("email", profile.get("email", ""))
        return result

    @llm.function_tool(description="Transfer the call to a human support agent. Use when customer asks for a human or you cannot answer after 2 attempts.")
    async def transfer_call(self, destination: Optional[str] = None) -> str:
        self._record_tool("transfer_call")
        if destination is None:
            destination = config.DEFAULT_TRANSFER_NUMBER
            if not destination:
                return "Error: No default transfer number configured."

        if "@" not in destination:
            if config.SIP_DOMAIN:
                clean_dest = destination.replace("tel:", "").replace("sip:", "")
                destination = f"sip:{clean_dest}@{config.SIP_DOMAIN}"
            else:
                if not destination.startswith("tel:") and not destination.startswith("sip:"):
                    destination = f"tel:{destination}"
        elif not destination.startswith("sip:"):
            destination = f"sip:{destination}"

        logger.info(f"Transferring call to {destination}")

        participant_identity = None
        if self.phone_number:
            participant_identity = f"sip_{self.phone_number}"
        elif self.inbound_caller_identity:
            participant_identity = self.inbound_caller_identity
        else:
            for p in self.ctx.room.remote_participants.values():
                if "sip_" in p.identity:
                    participant_identity = p.identity
                    break

        if not participant_identity:
            return "Failed to transfer: could not identify the caller."

        if self.current_call_id:
            self.db.update_call(self.current_call_id, status="transferred",
                               transferred_to=destination.replace(f"@{config.SIP_DOMAIN}", ""))

        try:
            await self.ctx.api.sip.transfer_sip_participant(
                api.TransferSIPParticipantRequest(
                    room_name=self.ctx.room.name,
                    participant_identity=participant_identity,
                    transfer_to=destination,
                    play_dialtone=False,
                )
            )
            return f"Transfer initiated to {destination.replace(f'@{config.SIP_DOMAIN}', '')}."
        except Exception as e:
            logger.error(f"Transfer failed: {e}")
            return f"Error executing transfer: {e}"

    @llm.function_tool(description="Book a service or demo appointment. Required: customer_name, phone, model, issue_description, preferred_date (YYYY-MM-DD), time_slot (morning/afternoon), location.")
    async def book_service(self, customer_name: str, phone: str, model: str,
                           issue_description: str, preferred_date: str,
                           time_slot: str, location: str,
                           service_type: str = "repair",
                           registration_number: str = None) -> str:
        logger.info(f"Booking service for {customer_name}: {model} on {preferred_date}")
        self._record_tool("book_service")
        booking_ref = self.db.create_service_booking(
            customer_name=customer_name, phone=phone, model=model,
            issue_description=issue_description, preferred_date=preferred_date,
            time_slot=time_slot, location=location, service_type=service_type,
            registration_number=registration_number,
        )
        # Update call_memory appointment
        if self.call_memory:
            apt_type = "demo" if "demo" in issue_description.lower() or "demo" in service_type.lower() else "service"
            self.call_memory.set_appointment(
                appointment_type=apt_type,
                date=preferred_date,
                time=time_slot,
                status="pending",
            )
        slot_desc = config.SERVICE_TIME_SLOTS.get(time_slot, time_slot)
        return (
            f"Service booking confirmed! Reference: {booking_ref}. "
            f"{model} — {service_type} on {preferred_date}, {slot_desc}. "
            f"Technician will call 30 minutes before arrival."
        )

    @llm.function_tool(description="Check status of existing service bookings by phone number or booking reference number.")
    async def check_service_status(self, phone: str = None, booking_ref: str = None) -> str:
        return self.db.format_service_status_for_voice(phone=phone, booking_ref=booking_ref)

    @llm.function_tool(description="Search for product info by brand, model, or product type (tractor, harvester, implement).")
    async def get_product_info(self, query: str) -> str:
        self._record_tool("get_product_info")
        results = self.db.search_products(query)
        # Track discussed products in call_memory
        if self.call_memory and results:
            for p in results[:3]:
                self.call_memory.add_product_discussed(p)
        return self.db.format_product_list_for_voice(results)

    @llm.function_tool(description="Calculate approximate EMI and financing for a tractor. Provide model name, optional down payment and tenure in months (12-60).")
    async def check_financing(self, model: str, down_payment: float = None,
                              tenure_months: int = None) -> str:
        self._record_tool("check_financing")
        product = self.db.get_product_by_model(model)
        if not product:
            return f"Could not find '{model}' in our catalog."

        price_max = product["approximate_price_max"] or product["approximate_price_min"] or 0
        if price_max == 0:
            return f"Price info not available for {product['brand']} {product['model']}."

        if down_payment is None:
            down_payment = price_max * config.FINANCING_DEFAULT_DOWN_PAYMENT_PCT
        if tenure_months is None:
            tenure_months = config.FINANCING_DEFAULT_TENURE
        elif tenure_months not in config.FINANCING_TENURE_OPTIONS:
            closest = min(config.FINANCING_TENURE_OPTIONS, key=lambda x: abs(x - tenure_months))
            tenure_months = closest

        loan_amount = max(0, price_max - down_payment)
        if loan_amount <= 0:
            loan_amount = price_max * 0.75

        annual_rate = config.FINANCING_DEFAULT_RATE / 100
        monthly_rate = annual_rate / 12
        if monthly_rate > 0:
            emi = loan_amount * monthly_rate * ((1 + monthly_rate) ** tenure_months) / \
                  (((1 + monthly_rate) ** tenure_months) - 1)
        else:
            emi = loan_amount / tenure_months

        total_interest = (emi * tenure_months) - loan_amount
        banks = ", ".join(config.FINANCING_PARTNER_BANKS[:3])

        return (
            f"Financing for {product['brand']} {product['model']}: "
            f"Price approx Rs. {price_max/100000:.1f} lakhs. "
            f"EMI: Rs. {emi:,.0f}/month for {tenure_months} months at {config.FINANCING_DEFAULT_RATE}%. "
            f"Partner banks: {banks}. This is approximate."
        )

    @llm.function_tool(description="Schedule a callback from a human representative. Use when customer is busy or wants to be contacted later.")
    async def request_callback(self, phone: str, reason: str, preferred_time: str = None) -> str:
        self._record_tool("request_callback")
        follow_up_id = self.db.create_follow_up(
            phone=phone, reason=reason, follow_up_type="callback",
            preferred_time=preferred_time, call_id=self.current_call_id,
        )
        if self.call_memory:
            self.call_memory._data["follow_up_required"] = True
            self.call_memory._data["follow_up_date"] = preferred_time
            self.call_memory.save()
        time_msg = f" during {preferred_time}" if preferred_time else ""
        return f"Callback scheduled{time_msg}. Reference: CB-{follow_up_id}. We'll call {phone} soon."

    @llm.function_tool(description="Log a sales inquiry. Use when customer shows purchase interest, trade-in interest, or financing needs.")
    async def log_inquiry(self, customer_name: str, phone: str, interest: str,
                          product_of_interest: str = None, source: str = "inbound_call",
                          notes: str = None) -> str:
        self._record_tool("log_inquiry")
        lead_id = self.db.create_lead(
            customer_name=customer_name, phone=phone, interest=interest,
            product_of_interest=product_of_interest, source=source,
            call_id=self.current_call_id, notes=notes,
        )
        # Score the lead immediately if call_memory is available
        if self.call_memory:
            try:
                result = self.lead_scorer.calculate(self.call_memory)
                self.call_memory._data["lead_score"] = result["score"]
                self.call_memory.save()
                self.db.update_lead_score(
                    lead_id, result["score"],
                    budget_min=self.call_memory._data["interest"].get("budget_min"),
                    budget_max=self.call_memory._data["interest"].get("budget_max"),
                    urgency=self.call_memory._data["interest"].get("urgency"),
                    timeline=self.call_memory._data["interest"].get("purchase_timeline"),
                )
                logger.info(f"Lead {lead_id} scored: {result['score']} ({result['category']})")
            except Exception as e:
                logger.warning(f"Lead scoring failed: {e}")
        return f"Interest logged. Reference: LEAD-{lead_id}. Sales team will follow up with {phone} in 1-2 business days."

    # ------------------------------------------------------------------
    # Phase 1 — NEW TOOLS
    # ------------------------------------------------------------------

    @llm.function_tool(description="Lock the conversation language. Call ONCE after the customer selects their preferred language. NEVER switch language unless the customer explicitly asks. Returns confirmation message in the selected language.")
    async def lock_language(self, language: str) -> str:
        """
        Lock the conversation to a specific language.
        Valid values: "en" (English), "hi" (Hindi), "ml" (Malayalam).

        This must be called exactly once per call after the customer
        explicitly selects their language. After locking, the agent
        must NEVER switch languages unless the customer explicitly
        requests it (e.g., "Can we continue in Hindi?").
        """
        self._record_tool("lock_language")
        language = language.strip().lower()
        if language not in config.SUPPORTED_LANGUAGES:
            return f"Invalid language: {language}. Supported languages: English (en), Hindi (hi), Malayalam (ml)."

        if self.call_memory:
            self.call_memory.lock_language(language)
            logger.info(f"Language locked to: {language}")

        # Rebuild STT for the selected language (if session is wired)
        if self.session and self._build_stt_fn:
            try:
                new_stt = self._build_stt_fn(language)
                self.session.stt = new_stt
                logger.info(f"STT rebuilt for language: {language}")
            except Exception as e:
                logger.warning(f"Could not rebuild STT: {e}")

        # Rebuild TTS for the selected language (if session is wired)
        if self.session and self._build_tts_fn:
            try:
                new_tts = self._build_tts_fn(language=language)
                self.session.tts = new_tts
                logger.info(f"TTS rebuilt for language: {language}")
            except Exception as e:
                logger.warning(f"Could not rebuild TTS: {e}")

        # Return the confirmation message in the selected language
        confirmations = config.LANGUAGE_CONFIRMATION_MESSAGES
        msg = confirmations.get(language, f"Language set to {language}.")
        return msg

    @llm.function_tool(description="Log the customer's budget range. Call when the customer mentions how much they can spend or what price range they're looking at. Use amounts in rupees.")
    async def log_budget(self, min_amount: float, max_amount: float) -> str:
        """
        Record the detected budget range for lead scoring.
        Use when customer mentions:
        - "I need below X lakh"
        - "My budget is X"
        - "Can't afford more than X"
        - "What's the price range?"

        Amounts are in rupees (e.g., 500000 for 5 lakhs).
        """
        self._record_tool("log_budget")
        if self.call_memory:
            self.call_memory.set_budget(min_amount, max_amount)
            lakhs_min = f"{min_amount/100000:.1f}L" if min_amount else "unspecified"
            lakhs_max = f"{max_amount/100000:.1f}L" if max_amount else "unspecified"
            logger.info(f"Budget logged: {lakhs_min} - {lakhs_max}")
            return f"Budget noted: Rs. {min_amount:,.0f} to {max_amount:,.0f}."
        return "Budget tracking unavailable."

    @llm.function_tool(description="Log the customer's purchase timeline. Call when the customer mentions when they plan to buy. urgency: 'high' (immediate), 'medium' (within month), 'low' (just browsing).")
    async def log_timeline(self, timeline: str, urgency: str = "medium") -> str:
        """
        Record the customer's purchase timeline for lead scoring.
        timeline: free-text description (e.g., "next month", "this week", "6 months")
        urgency: 'high' (buying now), 'medium' (within 30 days), 'low' (exploring)
        """
        self._record_tool("log_timeline")
        urgency = urgency.lower() if urgency else "medium"
        if urgency not in ("high", "medium", "low"):
            urgency = "medium"

        if self.call_memory:
            self.call_memory.set_timeline(timeline, urgency)
            logger.info(f"Timeline logged: {timeline} (urgency={urgency})")
            return f"Timeline noted: {timeline}. Urgency: {urgency}."
        return "Timeline tracking unavailable."

    @llm.function_tool(description="Generate a price quote for a product model. Returns a quote with pricing breakdown, financing options, and validity. Use when customer shows strong buying intent and wants a formal price.")
    async def generate_quote(self, model: str, customer_name: str,
                             phone: str, budget: float = None) -> str:
        """
        Generate a structured price quote for a product.
        The quote includes:
        - On-road price (ex-showroom + insurance + registration + accessories)
        - 5 financing options with different down payment levels
        - Quote ID and validity period

        Returns a voice-friendly summary. The full quote is stored in the database.
        """
        self._record_tool("generate_quote")
        quote = self.quote_generator.generate(
            model=model,
            customer_name=customer_name,
            phone=phone,
            budget_max=budget,
            call_id=self.current_call_id,
        )

        if "error" in quote:
            return quote["error"]

        if self.call_memory:
            self.call_memory.mark_quote_generated()

        voice_summary = self.quote_generator.format_for_voice(quote)
        return (
            f"{voice_summary}\n\n"
            f"I've saved this quote (Ref: {quote['quote_id']}). "
            f"It's valid until {quote['valid_until']}. "
            f"Would you like to discuss financing options or book a demo?"
        )
