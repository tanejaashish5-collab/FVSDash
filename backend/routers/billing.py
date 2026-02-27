"""Billing routes - Sprint 14 update with real Stripe integration."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from services.auth_service import get_current_user, require_admin, get_client_id_from_user
from services import stripe_service
from db.mongo import billing_records_collection, clients_collection

router = APIRouter(tags=["billing"])


class CheckoutRequest(BaseModel):
    plan: str  # starter, pro, enterprise
    origin_url: str  # Frontend origin for redirect URLs


# ============================================================================
# Stripe Billing Endpoints - Sprint 14
# ============================================================================

@router.post("/billing/checkout")
async def create_checkout(
    data: CheckoutRequest,
    user: dict = Depends(get_current_user)
):
    """
    Create a Stripe Checkout session for subscription.
    Returns checkout URL to redirect user to.
    """
    user_id = user.get("id")
    user_email = user.get("email")
    
    result = await stripe_service.create_checkout_session(
        user_id=user_id,
        plan=data.plan,
        origin_url=data.origin_url,
        user_email=user_email
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {
        "checkout_url": result["checkout_url"],
        "session_id": result["session_id"]
    }


@router.get("/billing/checkout/status/{session_id}")
async def get_checkout_status(
    session_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get the status of a checkout session.
    Used for polling after redirect from Stripe.
    """
    result = await stripe_service.get_checkout_status(session_id)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/billing/webhook")
async def handle_webhook(request: Request):
    """
    Handle Stripe webhook events.
    This endpoint must be publicly accessible (no auth).
    """
    payload = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    result = await stripe_service.handle_webhook_event(payload, signature)
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {"received": True, "event": result.get("event")}


@router.get("/billing/status")
async def get_billing_status(user: dict = Depends(get_current_user)):
    """
    Get current subscription status.
    Returns plan, status, features, and billing info.
    """
    user_id = user.get("id")
    return await stripe_service.get_subscription_status(user_id)


@router.get("/billing/plans")
async def get_plans():
    """
    Get all available subscription plans.
    No auth required - public pricing info.
    """
    return stripe_service.get_all_plans()


# ============================================================================
# Existing Billing Endpoints
# ============================================================================

@router.get("/billing/dashboard")
async def get_billing_dashboard(user: dict = Depends(get_current_user)):
    """
    Returns billing information for the current client.
    Includes plan details, status, and Stripe integration status.
    """
    client_id = get_client_id_from_user(user)
    user_id = user.get("id")
    
    billing_db = billing_records_collection()
    clients_db = clients_collection()
    
    billing = await billing_db.find_one({"clientId": client_id}, {"_id": 0}) if client_id else None
    client_info = await clients_db.find_one({"id": client_id}, {"_id": 0}) if client_id else None
    
    # Get real subscription status from Stripe service
    subscription = await stripe_service.get_subscription_status(user_id)
    
    plan_features = {
        "starter": {
            "name": "Starter",
            "price": 99,
            "features": [
                "Up to 10 videos per month",
                "Basic editing",
                "Standard thumbnails",
                "Email support"
            ]
        },
        "pro": {
            "name": "Pro",
            "price": 299,
            "features": [
                "Up to 50 videos per month",
                "Advanced editing & mixing",
                "Custom thumbnails & graphics",
                "Priority support",
                "Analytics dashboard",
                "ROI tracking",
                "AI recommendations"
            ]
        },
        "enterprise": {
            "name": "Enterprise",
            "price": 799,
            "features": [
                "Unlimited videos",
                "Full production suite",
                "Dedicated account manager",
                "Custom integrations",
                "White-label options",
                "24/7 support"
            ]
        }
    }
    
    current_plan = subscription.get("plan", "pro")
    
    return {
        "billing": billing,
        "client": client_info,
        "currentPlan": current_plan,
        "planName": subscription.get("plan_name", "Pro"),
        "planStatus": subscription.get("status", "active"),
        "planDetails": plan_features.get(current_plan, plan_features["pro"]),
        "allPlans": plan_features,
        "stripeConfigured": subscription.get("stripe_configured", False),
        "stripeCustomerId": subscription.get("stripe_customer_id"),
        "currentPeriodEnd": subscription.get("current_period_end")
    }


@router.get("/clients")
async def get_clients(user: dict = Depends(require_admin)):
    db = clients_collection()
    return await db.find({}, {"_id": 0}).to_list(1000)


@router.get("/billing")
async def get_billing(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    db = billing_records_collection()
    query = {"clientId": client_id} if client_id else {}
    return await db.find(query, {"_id": 0}).to_list(100)
