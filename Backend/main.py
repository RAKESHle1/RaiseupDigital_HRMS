import os
from dotenv import load_dotenv

# Load environment variables (Local only, Render uses dashboard settings)
try:
    load_dotenv()
except Exception:
    pass
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_db, close_db
from routes_users import router as users_router
from routes_attendance import router as attendance_router
from routes_leaves import router as leaves_router
from routes_chat import router as chat_router
from routes_notifications import router as notifications_router
from routes_frs import router as frs_router
import socketio
from presence_state import is_user_online, mark_user_offline_by_sid, mark_user_online

# ─── Allowed Origins ──────────────────────────────────────
ALLOWED_ORIGINS = [
    "https://raiseupdigital-hrms.vercel.app",
    "https://raiseupdigital-hrms-mnizzmaoz-raiseupdigitalhrms.vercel.app",
    "http://localhost:3000",
]

# ─── Socket.IO Setup ─────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=ALLOWED_ORIGINS
)

# ─── Lifespan (replaces deprecated on_event) ──────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

# ─── FastAPI App ──────────────────────────────────────────
app = FastAPI(
    title="HRMS Portal API",
    description="Human Resource Management System API",
    version="1.0.0",
    lifespan=lifespan
)

# ─── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────
app.include_router(users_router)
app.include_router(attendance_router)
app.include_router(leaves_router)
app.include_router(chat_router)
app.include_router(notifications_router)
app.include_router(frs_router)

# ─── Health Check ─────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "HRMS Portal API is running!", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}


# ─── Socket.IO Events ────────────────────────────────────
@sio.on("connect")
async def connect(sid, environ):
    print(f"SOCKET Client connected: {sid}")

@sio.on("disconnect")
async def disconnect(sid):
    print(f"SOCKET Client disconnected: {sid}")
    user_id = mark_user_offline_by_sid(sid)
    if user_id and not is_user_online(user_id):
        await sio.emit("presence_update", {"userId": str(user_id), "status": "offline"})

@sio.on("join_room")
async def join_room(sid, data):
    room = data.get("room")
    if room:
        room = str(room)
        await sio.enter_room(sid, room)
        await sio.emit("room_joined", {"room": room}, room=sid)
        if data.get("self"):
            mark_user_online(sid, room)
            await sio.emit("presence_update", {"userId": room, "status": "online"})

@sio.on("leave_room")
async def leave_room(sid, data):
    room = data.get("room")
    if room:
        await sio.leave_room(sid, str(room))

@sio.on("send_message")
async def handle_message(sid, data):
    room = data.get("room")
    if room:
        await sio.emit("new_message", data, room=room, skip_sid=sid)
    elif data.get("receiverId"):
        await sio.emit("new_message", data, room=data["receiverId"])

@sio.on("typing")
async def handle_typing(sid, data):
    room = data.get("room")
    if room:
        await sio.emit("user_typing", data, room=room, skip_sid=sid)
        return
    receiver_id = data.get("receiverId")
    if receiver_id:
        await sio.emit("user_typing", data, room=str(receiver_id))

@sio.on("stop_typing")
async def handle_stop_typing(sid, data):
    room = data.get("room")
    if room:
        await sio.emit("user_stop_typing", data, room=room, skip_sid=sid)
        return
    receiver_id = data.get("receiverId")
    if receiver_id:
        await sio.emit("user_stop_typing", data, room=str(receiver_id))

# ─── WebRTC Signaling ────────────────────────────────────
@sio.on("call_user")
async def call_user(sid, data):
    to_room = data.get("to")
    if to_room:
        await sio.emit("incoming_call", data, room=str(to_room))

@sio.on("call_accepted")
async def call_accepted(sid, data):
    to_room = data.get("to")
    if to_room:
        await sio.emit("call_accepted", data, room=str(to_room))

@sio.on("ice_candidate")
async def ice_candidate(sid, data):
    to_room = data.get("to")
    if to_room:
        await sio.emit("ice_candidate", data, room=str(to_room))

@sio.on("call_ended")
async def call_ended(sid, data):
    to_room = data.get("to")
    if to_room:
        await sio.emit("call_ended", data, room=str(to_room))

@sio.on("call_status_update")
async def call_status_update(sid, data):
    to_room = data.get("to")
    if to_room:
        await sio.emit("call_status_update", data, room=str(to_room))


# ─── Mount Socket.IO ─────────────────────────────────────
socket_app = socketio.ASGIApp(sio, app)


if __name__ == "__main__":
    import uvicorn
    # Render provides PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    print(f"DEBUG: Starting server on port {port}")
    uvicorn.run("main:socket_app", host="0.0.0.0", port=port, reload=False)


