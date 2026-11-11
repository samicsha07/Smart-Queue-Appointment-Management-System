from typing import List, Dict, Any, Optional
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("smartqueue.websocket")

class ConnectionManager:
    def __init__(self):
        # List of all active general connections
        self.active_connections: List[WebSocket] = []
        # Map user_id -> List[WebSocket] for direct user notifications
        self.user_connections: Dict[int, List[WebSocket]] = {}
        # Map centre_id -> List[WebSocket] for targeted queue broadcasts
        self.centre_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None, centre_id: Optional[int] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        
        if user_id:
            if user_id not in self.user_connections:
                self.user_connections[user_id] = []
            self.user_connections[user_id].append(websocket)
            
        if centre_id:
            if centre_id not in self.centre_connections:
                self.centre_connections[centre_id] = []
            self.centre_connections[centre_id].append(websocket)
            
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)} | User: {user_id} | Centre: {centre_id}")

    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None, centre_id: Optional[int] = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        if user_id and user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                
        if centre_id and centre_id in self.centre_connections:
            if websocket in self.centre_connections[centre_id]:
                self.centre_connections[centre_id].remove(websocket)
            if not self.centre_connections[centre_id]:
                del self.centre_connections[centre_id]
                
        logger.info(f"WebSocket disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        payload = json.dumps(message, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.error(f"Error sending broadcast: {e}")
                disconnected.append(connection)
        for dead in disconnected:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

    async def broadcast_to_centre(self, centre_id: int, message: Dict[str, Any]):
        payload = json.dumps(message, default=str)
        connections = self.centre_connections.get(centre_id, [])
        disconnected = []
        for connection in connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.error(f"Error sending to centre {centre_id}: {e}")
                disconnected.append(connection)
        for dead in disconnected:
            if dead in connections:
                connections.remove(dead)
        # Also broadcast to general listeners
        await self.broadcast(message)

    async def send_to_user(self, user_id: int, message: Dict[str, Any]):
        payload = json.dumps(message, default=str)
        connections = self.user_connections.get(user_id, [])
        disconnected = []
        for connection in connections:
            try:
                await connection.send_text(payload)
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                disconnected.append(connection)
        for dead in disconnected:
            if dead in connections:
                connections.remove(dead)

manager = ConnectionManager()
