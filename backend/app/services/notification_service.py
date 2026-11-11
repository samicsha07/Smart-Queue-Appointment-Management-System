from sqlalchemy.orm import Session
from typing import Optional
from backend.app.models.notification import Notification
from backend.app.services.websocket_manager import manager

async def create_and_send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str,
    appointment_id: Optional[int] = None,
    token_id: Optional[int] = None
) -> Notification:
    notif = Notification(
        user_id=user_id,
        appointment_id=appointment_id,
        token_id=token_id,
        title=title,
        message=message,
        type=type,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Push live notification via WebSocket if user is connected
    try:
        await manager.send_to_user(
            user_id=user_id,
            message={
                "event": "NEW_NOTIFICATION",
                "notification": {
                    "id": notif.id,
                    "title": notif.title,
                    "message": notif.message,
                    "type": notif.type,
                    "created_at": notif.created_at.isoformat() if notif.created_at else None,
                    "is_read": False
                }
            }
        )
    except Exception as e:
        print(f"Error sending live notification to user {user_id}: {e}")

    return notif
