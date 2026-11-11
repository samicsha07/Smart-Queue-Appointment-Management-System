import sys, os
sys.path.insert(0, os.getcwd())
import asyncio
from backend.app.database import SessionLocal, Base, engine
from backend.app.models import *
from backend.app.seeds.seed_data import seed_database_if_empty
from backend.app.services.queue_service import call_next_customer

async def diag():
    print("Step 1: create tables", flush=True)
    Base.metadata.create_all(bind=engine)
    print("Step 2: SessionLocal", flush=True)
    db = SessionLocal()
    print("Step 3: seed", flush=True)
    seed_database_if_empty(db)
    print("Step 4: call_next_customer", flush=True)
    hosp = db.query(ServiceCentre).filter(ServiceCentre.type == "Hospital").first()
    res = await call_next_customer(db, hosp.id)
    print(f"Step 5: result = {res.token_number if res else None}", flush=True)
    db.close()
    print("Done!", flush=True)

if __name__ == "__main__":
    asyncio.run(diag())
