from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_db, close_db
from routes_users import router as users_router
from routes_attendance import router as attendance_router
from routes_leaves import router as leaves_router
from routes_chat import router as chat_router
from routes_notifications import router as notifications_router
import socketio

# ─── Socket.IO Setup ─────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
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
    allow_origins=["https://raiseupdigital-hrms-mnizzsmaoz-raiseupdigitalhrms.vercel.app"],  # Replace "*" with the frontend URL
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
    print(f"🔌 Client connected: {sid}")

@sio.on("disconnect")
async def disconnect(sid):
    print(f"🔌 Client disconnected: {sid}")

@sio.on("join_room")
async def join_room(sid, data):
    room = data.get("room")
    if room:
        sio.enter_room(sid, room)
        await sio.emit("room_joined", {"room": room}, room=sid)

@sio.on("leave_room")
async def leave_room(sid, data):
    room = data.get("room")
    if room:
        sio.leave_room(sid, room)

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

# ─── WebRTC Signaling ────────────────────────────────────
@sio.on("call_user")
async def call_user(sid, data):
    await sio.emit("incoming_call", data, room=data.get("to"))

@sio.on("call_accepted")
async def call_accepted(sid, data):
    await sio.emit("call_accepted", data, room=data.get("to"))

@sio.on("ice_candidate")
async def ice_candidate(sid, data):
    await sio.emit("ice_candidate", data, room=data.get("to"))

@sio.on("call_ended")
async def call_ended(sid, data):
    await sio.emit("call_ended", data, room=data.get("to"))


# ─── Mount Socket.IO ─────────────────────────────────────
socket_app = socketio.ASGIApp(sio, app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=8000, reload=True)