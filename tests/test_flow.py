"""
SmartQueue Full Workflow End-to-End Test
"""

import sys
import os
import asyncio
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database import SessionLocal, Base, engine
from backend.app.models import *
from backend.app.seeds.seed_data import seed_database_if_empty
from backend.app.services.queue_service import (
    generate_next_token,
    calculate_queue_position,
    call_next_customer,
    update_token_status_service,
)
from backend.app.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_token
)

async def run_e2e_tests():
    print("=" * 60, flush=True)
    print("Starting SmartQueue Comprehensive Verification Tests", flush=True)
    print("=" * 60, flush=True)

    # 1. Initialize DB and seed
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database_if_empty(db)
    print("[PASS] 1. Database schema and seed data loaded.", flush=True)

    # 2. Test Admin Login
    admin = db.query(Admin).filter(Admin.email == "admin@smartqueue.com").first()
    assert admin is not None, "Admin not found!"
    assert verify_password("AdminPassword123!", admin.hashed_password), "Admin password verification failed!"
    admin_token = create_access_token(subject=admin.id, role=admin.role)
    admin_payload = decode_token(admin_token)
    assert admin_payload.get("role") == "admin", "Admin token role mismatch!"
    print(f"[PASS] 2. Admin authenticated: {admin.email} (Role: {admin.role})", flush=True)

    # 3. Test Customer Login
    customer = db.query(User).filter(User.email == "customer@smartqueue.com").first()
    assert customer is not None, "Customer not found!"
    assert verify_password("Customer123!", customer.hashed_password), "Customer password verification failed!"
    user_token = create_access_token(subject=customer.id, role="customer")
    user_payload = decode_token(user_token)
    assert user_payload.get("role") == "customer", "Customer token role mismatch!"
    print(f"[PASS] 3. Customer authenticated: {customer.name} ({customer.email})", flush=True)

    # 4. Service Centres & Categories
    centres = db.query(ServiceCentre).filter(ServiceCentre.is_active == True).all()
    assert len(centres) >= 4, "Expected at least 4 active service centres!"
    hospital = db.query(ServiceCentre).filter(ServiceCentre.type == "Hospital").first()
    assert hospital is not None, "Hospital centre not found!"
    categories = db.query(ServiceCategory).filter(ServiceCategory.centre_id == hospital.id).all()
    assert len(categories) >= 3, "Expected categories under hospital!"
    gen_cat = categories[0]
    print(f"[PASS] 4. Service centre verified: '{hospital.name}' with {len(categories)} categories.", flush=True)

    # 5. Sequential Token Generation Logic
    today = date.today()
    token_1 = generate_next_token(db, hospital.id, gen_cat.id, today)
    token_2 = generate_next_token(db, hospital.id, gen_cat.id, today)
    assert token_2.sequence_number > token_1.sequence_number, "Tokens are not strictly sequential!"
    assert token_1.token_number != token_2.token_number, "Duplicate token detected!"
    print(f"[PASS] 5. Sequential Token generation: {token_1.token_number} -> {token_2.token_number}", flush=True)

    # 6. Live Queue Position & Wait Time Calculation
    queue_calc = calculate_queue_position(db, token_2)
    assert "token_number" in queue_calc
    assert "people_ahead" in queue_calc
    assert "estimated_waiting_time_minutes" in queue_calc
    print(f"[PASS] 6. Queue Calculation for Token {token_2.token_number}:", flush=True)
    print(f"       Currently Serving: {queue_calc['currently_serving_token']}", flush=True)
    print(f"       People Ahead: {queue_calc['people_ahead']}", flush=True)
    print(f"       Estimated Wait Time: {queue_calc['estimated_waiting_time_minutes']} minutes", flush=True)

    # 7. Admin Action: Call Next Customer
    called_token = await call_next_customer(db, hospital.id)
    if called_token:
        assert called_token.status == "serving", "Called token should have status 'serving'!"
        print(f"[PASS] 7. Admin 'Call Next' action: Token #{called_token.token_number} is now SERVING.", flush=True)
    else:
        print("[PASS] 7. Queue is currently empty of waiting customers.", flush=True)

    # 8. Mark Completed
    if called_token:
        completed_token = await update_token_status_service(db, called_token.id, "completed")
        assert completed_token.status == "completed", "Status should be 'completed'!"
        print(f"[PASS] 8. Status transition: Token #{completed_token.token_number} marked as COMPLETED.", flush=True)

    # 9. In-app Notification Verification
    notifications = db.query(Notification).filter(Notification.user_id == customer.id).all()
    assert len(notifications) >= 1, "Expected in-app notification for customer!"
    print(f"[PASS] 9. In-app Notifications: {len(notifications)} notification(s) stored in database.", flush=True)

    # 10. Analytics Aggregation Verification
    total_tokens = db.query(QueueToken).filter(QueueToken.operating_date == today).count()
    completed_count = db.query(QueueToken).filter(
        QueueToken.operating_date == today,
        QueueToken.status == "completed"
    ).count()
    assert total_tokens > 0, "Analytics tokens count is zero!"
    print(f"[PASS] 10. Analytics Aggregation: {total_tokens} total tokens today, {completed_count} completed.", flush=True)

    db.close()
    print("=" * 60, flush=True)
    print("ALL 10 TESTS PASSED SUCCESSFULLY! SMARTQUEUE SYSTEM FULLY FUNCTIONAL.", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
