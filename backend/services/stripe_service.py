"""
Stripe Billing Service - Sprint 14
Handles subscription billing via Stripe Checkout and Customer Portal.
"""
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from db.mongo import get_db

logger = logging.getLogger(__name__)

# Plan configuration - prices in USD
PLANS = {
    "starter": {
        "name": "Starter",
        "price": 99.00,
        "price_id_env": "STRIPE_STARTER_PRICE_ID",
        "features": [
            "Up to 10 videos/month",
            "Basic analytics",
            "Email support"
        ]
    },
    "pro": {
        "name": "Pro",
        "price": 299.00,
        "price_id_env": "STRIPE_PRO_PRICE_ID",
        "features": [
            "Up to 50 videos/month",
            "Advanced analytics",
            "Priority support",
            "AI recommendations",
            "Multi-channel support"
        ]
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 799.00,
        "price_id_env": "STRIPE_ENTERPRISE_PRICE_ID",
        "features": [
            "Unlimited videos",
            "White-glove onboarding",
            "Dedicated account manager",
            "Custom integrations",
            "SLA guarantee"
        ]
    }
}


def is_stripe_configured() -> bool:
    """Check if Stripe is properly configured."""
    api_key = os.environ.get("STRIPE_API_KEY")
    return bool(api_key and api_key != "" and not api_key.startswith("sk_test_your"))


def get_stripe_api_key() -> Optional[str]:
    """Get the Stripe API key from environment."""
    return os.environ.get("STRIPE_API_KEY")


def get_price_id(plan: str) -> Optional[str]:
    """Get the Stripe price ID for a plan."""
    if plan not in PLANS:
        return None
    
    price_id_env = PLANS[plan]["price_id_env"]
    return os.environ.get(price_id_env)


async def create_checkout_session(
    user_id: str,
    plan: str,
    origin_url: str,
    user_email: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a Stripe Checkout session for subscription.
    Returns checkout URL or error.
    """
    if not is_stripe_configured():
        return {
            "success": False,
            "error": "Stripe not configured. Add STRIPE_API_KEY to enable billing."
        }
    
    if plan not in PLANS:
        return {
            "success": False,
            "error": f"Invalid plan: {plan}. Choose from: {', '.join(PLANS.keys())}"
        }
    
    try:
        from emergentintegrations.payments.stripe.checkout import (
            StripeCheckout, CheckoutSessionRequest
        )
        
        api_key = get_stripe_api_key()
        
        # Build success and cancel URLs from origin
        success_url = f"{origin_url}/dashboard/billing?success=true&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/dashboard/billing?cancelled=true"
        
        # Get plan price
        price = PLANS[plan]["price"]
        
        # Create checkout session with amount (subscription mode)
        stripe_checkout = StripeCheckout(
            api_key=api_key,
            webhook_url=f"{origin_url}/api/billing/webhook"
        )
        
        checkout_request = CheckoutSessionRequest(
            amount=price,
            currency="usd",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": user_id,
                "plan": plan,
                "plan_name": PLANS[plan]["name"]
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Store payment transaction record
        db = get_db()
        await db.payment_transactions.insert_one({
            "session_id": session.session_id,
            "user_id": user_id,
            "plan": plan,
            "amount": price,
            "currency": "usd",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.session_id
        }
        
    except Exception as e:
        logger.exception(f"Failed to create checkout session: {e}")
        return {
            "success": False,
            "error": f"Failed to create checkout session: {str(e)}"
        }


async def get_checkout_status(session_id: str) -> Dict[str, Any]:
    """Get the status of a checkout session."""
    if not is_stripe_configured():
        return {
            "success": False,
            "error": "Stripe not configured"
        }
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        api_key = get_stripe_api_key()
        stripe_checkout = StripeCheckout(api_key=api_key)
        
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update payment transaction record
        db = get_db()
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
        
    except Exception as e:
        logger.exception(f"Failed to get checkout status: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def handle_webhook_event(payload: bytes, signature: str) -> Dict[str, Any]:
    """Handle Stripe webhook event."""
    if not is_stripe_configured():
        return {"success": False, "error": "Stripe not configured"}
    
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        
        api_key = get_stripe_api_key()
        stripe_checkout = StripeCheckout(api_key=api_key)
        
        event = await stripe_checkout.handle_webhook(payload, signature)
        
        db = get_db()
        
        # Handle different event types
        if event.event_type == "checkout.session.completed":
            # Payment successful - activate subscription
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {
                    "payment_status": "paid",
                    "status": "completed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update user subscription
            transaction = await db.payment_transactions.find_one(
                {"session_id": event.session_id},
                {"_id": 0}
            )
            
            if transaction:
                user_id = transaction.get("user_id") or event.metadata.get("user_id")
                plan = transaction.get("plan") or event.metadata.get("plan")
                
                if user_id and plan:
                    await db.users.update_one(
                        {"id": user_id},
                        {"$set": {
                            "subscription_plan": plan,
                            "subscription_status": "active",
                            "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
            
            return {"success": True, "event": "subscription_activated"}
        
        elif event.event_type == "customer.subscription.deleted":
            # Subscription cancelled
            user_id = event.metadata.get("user_id")
            if user_id:
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {
                        "subscription_plan": "free",
                        "subscription_status": "cancelled",
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            return {"success": True, "event": "subscription_cancelled"}
        
        elif event.event_type == "invoice.payment_failed":
            # Payment failed
            user_id = event.metadata.get("user_id")
            if user_id:
                await db.users.update_one(
                    {"id": user_id},
                    {"$set": {
                        "subscription_status": "past_due",
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            return {"success": True, "event": "payment_failed"}
        
        return {"success": True, "event": event.event_type}
        
    except Exception as e:
        logger.exception(f"Webhook handling error: {e}")
        return {"success": False, "error": str(e)}


async def get_subscription_status(user_id: str) -> Dict[str, Any]:
    """Get current subscription status for a user."""
    db = get_db()
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    
    if not user:
        return {
            "plan": "free",
            "status": "inactive",
            "stripe_configured": is_stripe_configured()
        }
    
    plan = user.get("subscription_plan", "pro")  # Default to pro for demo
    status = user.get("subscription_status", "active")
    
    plan_details = PLANS.get(plan, PLANS["pro"])
    
    return {
        "plan": plan,
        "plan_name": plan_details["name"],
        "status": status,
        "price": plan_details["price"],
        "features": plan_details["features"],
        "current_period_end": user.get("subscription_period_end"),
        "stripe_customer_id": user.get("stripe_customer_id"),
        "stripe_configured": is_stripe_configured()
    }


def get_all_plans() -> Dict[str, Any]:
    """Get all available plans with details."""
    return {
        plan_id: {
            "name": plan["name"],
            "price": plan["price"],
            "features": plan["features"]
        }
        for plan_id, plan in PLANS.items()
    }
