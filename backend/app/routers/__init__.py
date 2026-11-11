from backend.app.routers.auth import router as auth_router
from backend.app.routers.services import router as services_router
from backend.app.routers.appointments import router as appointments_router
from backend.app.routers.queue import router as queue_router
from backend.app.routers.admin import router as admin_router
from backend.app.routers.notifications import router as notifications_router

__all__ = [
    "auth_router",
    "services_router",
    "appointments_router",
    "queue_router",
    "admin_router",
    "notifications_router"
]
