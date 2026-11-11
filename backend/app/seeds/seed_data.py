from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.admin import Admin
from backend.app.models.service_centre import ServiceCentre
from backend.app.models.service_category import ServiceCategory
from backend.app.models.service_slot import ServiceSlot
from backend.app.models.appointment import Appointment
from backend.app.models.queue_token import QueueToken
from backend.app.models.notification import Notification
from backend.app.services.auth_service import get_password_hash

def seed_database_if_empty(db: Session):
    # Check if admin exists
    admin_exists = db.query(Admin).first()
    if admin_exists:
        return # Already seeded

    print("Seeding SmartQueue database with realistic demo data...")

    # 1. Admin
    admin = Admin(
        name="System Administrator",
        email="admin@smartqueue.com",
        hashed_password=get_password_hash("AdminPassword123!"),
        role="admin",
        is_active=True
    )
    db.add(admin)

    # 2. Customers
    user1 = User(
        name="John Doe",
        email="customer@smartqueue.com",
        phone="+1 555-0101",
        hashed_password=get_password_hash("Customer123!"),
        is_active=True
    )
    user2 = User(
        name="Sarah Jenkins",
        email="sarah.jenkins@example.com",
        phone="+1 555-0102",
        hashed_password=get_password_hash("Customer123!"),
        is_active=True
    )
    user3 = User(
        name="Michael Chang",
        email="michael.chang@example.com",
        phone="+1 555-0103",
        hashed_password=get_password_hash("Customer123!"),
        is_active=True
    )
    db.add_all([user1, user2, user3])
    db.commit()
    db.refresh(user1)
    db.refresh(user2)
    db.refresh(user3)

    # 3. Service Centres
    hospital = ServiceCentre(
        name="Metro Central Hospital",
        type="Hospital",
        address="100 Healthcare Parkway, Medical District",
        city="New York",
        phone="+1 212-555-0199",
        opening_time="08:00",
        closing_time="20:00",
        is_active=True
    )
    bank = ServiceCentre(
        name="Apex National Bank - Downtown Branch",
        type="Bank",
        address="45 Financial Plaza, Suite 100",
        city="New York",
        phone="+1 212-555-0240",
        opening_time="09:00",
        closing_time="17:00",
        is_active=True
    )
    salon = ServiceCentre(
        name="Luxe Glow Salon & Spa",
        type="Salon",
        address="88 Fashion Avenue, 2nd Floor",
        city="New York",
        phone="+1 212-555-0377",
        opening_time="10:00",
        closing_time="19:00",
        is_active=True
    )
    clinic = ServiceCentre(
        name="LifeWell Family Clinic",
        type="Clinic",
        address="220 Elm Street, Midtown",
        city="New York",
        phone="+1 212-555-0488",
        opening_time="08:30",
        closing_time="17:30",
        is_active=True
    )
    db.add_all([hospital, bank, salon, clinic])
    db.commit()
    db.refresh(hospital)
    db.refresh(bank)
    db.refresh(salon)
    db.refresh(clinic)

    # 4. Service Categories
    cat_gen = ServiceCategory(
        centre_id=hospital.id,
        name="General Physician Consultation",
        description="Routine medical checkup, health screening, prescription renewals",
        avg_duration_minutes=15,
        token_prefix="G",
        is_active=True
    )
    cat_cardio = ServiceCategory(
        centre_id=hospital.id,
        name="Cardiology & Heart Care",
        description="Comprehensive cardiovascular evaluation and ECG testing",
        avg_duration_minutes=25,
        token_prefix="C",
        is_active=True
    )
    cat_lab = ServiceCategory(
        centre_id=hospital.id,
        name="Laboratory & Bloodwork",
        description="Pathology blood draws, lipid panels, metabolic panels",
        avg_duration_minutes=10,
        token_prefix="L",
        is_active=True
    )

    cat_teller = ServiceCategory(
        centre_id=bank.id,
        name="Teller & Cash Services",
        description="Cash deposits, foreign exchange, drafts, account balance",
        avg_duration_minutes=10,
        token_prefix="T",
        is_active=True
    )
    cat_loans = ServiceCategory(
        centre_id=bank.id,
        name="Loan & Mortgage Consulting",
        description="Home loans, auto loans, commercial financing advisory",
        avg_duration_minutes=30,
        token_prefix="M",
        is_active=True
    )

    cat_hair = ServiceCategory(
        centre_id=salon.id,
        name="Haircut, Styling & Color",
        description="Precision haircut, coloring, blowouts and treatments",
        avg_duration_minutes=35,
        token_prefix="H",
        is_active=True
    )

    db.add_all([cat_gen, cat_cardio, cat_lab, cat_teller, cat_loans, cat_hair])
    db.commit()
    db.refresh(cat_gen)
    db.refresh(cat_cardio)
    db.refresh(cat_lab)
    db.refresh(cat_teller)
    db.refresh(cat_loans)
    db.refresh(cat_hair)

    # 5. Slots for Today and Next 3 Days
    today = date.today()
    slots_list = []
    time_windows = [
        ("09:00", "09:30"), ("09:30", "10:00"),
        ("10:00", "10:30"), ("10:30", "11:00"),
        ("11:00", "11:30"), ("11:30", "12:00"),
        ("13:00", "13:30"), ("13:30", "14:00"),
        ("14:00", "14:30"), ("14:30", "15:00"),
        ("15:00", "15:30"), ("15:30", "16:00")
    ]

    for d_offset in range(4):
        target_d = today + timedelta(days=d_offset)
        for cat in [cat_gen, cat_cardio, cat_teller, cat_hair]:
            for start_t, end_t in time_windows:
                slot = ServiceSlot(
                    centre_id=cat.centre_id,
                    category_id=cat.id,
                    slot_date=target_d,
                    start_time=start_t,
                    end_time=end_t,
                    max_capacity=5,
                    booked_count=0,
                    is_available=True
                )
                slots_list.append(slot)
    db.add_all(slots_list)
    db.commit()

    # 6. Sample Live Queue Tokens for Today in Metro Central Hospital
    # Token 1: Already Completed earlier today
    t_comp = QueueToken(
        token_number="G001",
        sequence_number=1,
        user_id=None,
        centre_id=hospital.id,
        category_id=cat_gen.id,
        operating_date=today,
        status="completed",
        called_at=datetime.utcnow() - timedelta(minutes=45),
        served_at=datetime.utcnow() - timedelta(minutes=40),
        completed_at=datetime.utcnow() - timedelta(minutes=20)
    )
    db.add(t_comp)

    # Token 2: Currently Serving
    t_serv = QueueToken(
        token_number="G002",
        sequence_number=2,
        user_id=user2.id,
        centre_id=hospital.id,
        category_id=cat_gen.id,
        operating_date=today,
        status="serving",
        called_at=datetime.utcnow() - timedelta(minutes=8),
        served_at=datetime.utcnow() - timedelta(minutes=7)
    )
    db.add(t_serv)

    # Token 3: Waiting (Customer: Michael Chang)
    t_wait1 = QueueToken(
        token_number="G003",
        sequence_number=3,
        user_id=user3.id,
        centre_id=hospital.id,
        category_id=cat_gen.id,
        operating_date=today,
        status="waiting"
    )
    db.add(t_wait1)

    # Token 4: Waiting (Our default customer John Doe - customer@smartqueue.com)
    # He will see: Token G004, Currently Serving: G002, People Ahead: 1, Est Wait: 15-30m
    app_john = Appointment(
        user_id=user1.id,
        centre_id=hospital.id,
        category_id=cat_gen.id,
        appointment_date=today,
        appointment_time="10:30",
        status="booked",
        notes="Follow-up consultation on routine bloodwork"
    )
    db.add(app_john)
    db.commit()
    db.refresh(app_john)

    t_wait2 = QueueToken(
        token_number="G004",
        sequence_number=4,
        appointment_id=app_john.id,
        user_id=user1.id,
        centre_id=hospital.id,
        category_id=cat_gen.id,
        operating_date=today,
        status="waiting"
    )
    db.add(t_wait2)

    # Add initial notification for John
    notif1 = Notification(
        user_id=user1.id,
        appointment_id=app_john.id,
        token_id=t_wait2.id,
        title="Welcome to SmartQueue",
        message=f"Your appointment is confirmed at {hospital.name} for 10:30 AM today. Token G004 has been assigned to you.",
        type="booking",
        is_read=False
    )
    db.add(notif1)

    db.commit()
    print("Database seeding completed successfully!")
