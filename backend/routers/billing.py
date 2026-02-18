"""Billing routes."""
from fastapi import APIRouter, Depends

from services.auth_service import get_current_user, require_admin, get_client_id_from_user
from db.mongo import billing_records_collection, clients_collection

router = APIRouter(tags=["billing"])


@router.get("/billing/dashboard")
async def get_billing_dashboard(user: dict = Depends(get_current_user)):
    """
    Returns billing information for the current client.
    Includes plan details, status, and Stripe placeholder info.
    """
    client_id = get_client_id_from_user(user)
    
    billing_db = billing_records_collection()
    clients_db = clients_collection()
    
    billing = await billing_db.find_one({"clientId": client_id}, {"_id": 0}) if client_id else None
    client_info = await clients_db.find_one({"id": client_id}, {"_id": 0}) if client_id else None
    
    # TODO: Integrate Stripe for real billing
    plan_features = {
        "Starter": {
            "price": 99,
            "features": [
                "Up to 4 episodes per month",
                "Basic editing",
                "Standard thumbnails",
                "Email support"
            ]
        },
        "Pro": {
            "price": 299,
            "features": [
                "Up to 12 episodes per month",
                "Advanced editing & mixing",
                "Custom thumbnails & graphics",
                "Priority support",
                "Analytics dashboard",
                "ROI tracking"
            ]
        },
        "Enterprise": {
            "price": 799,
            "features": [
                "Unlimited episodes",
                "Full production suite",
                "Dedicated account manager",
                "Custom integrations",
                "White-label options",
                "24/7 support"
            ]
        }
    }
    
    current_plan = billing.get("currentPlan", "Pro") if billing else "Pro"
    
    return {
        "billing": billing,
        "client": client_info,
        "currentPlan": current_plan,
        "planDetails": plan_features.get(current_plan, plan_features["Pro"]),
        "allPlans": plan_features,
        "stripeConnected": bool(billing and billing.get("stripeCustomerId"))
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
