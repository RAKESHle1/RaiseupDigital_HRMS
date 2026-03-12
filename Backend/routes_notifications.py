from fastapi import APIRouter, Depends
from typing import List
from database import leaves_collection, messages_collection, users_collection
from auth import get_current_user
from bson import ObjectId
from datetime import datetime
import pytz

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])
IST = pytz.timezone('Asia/Kolkata')

@router.get("/", response_model=list)
async def get_my_notifications(current_user=Depends(get_current_user)):
    user_id = str(current_user["_id"])
    notifications = []
    
    # 1. Leaves
    leaves = await leaves_collection.find({"employeeId": user_id, "status": {"$in": ["approved", "rejected"]}}).sort("appliedDate", -1).limit(5).to_list(10)
    for leave in leaves:
        timestamp = leave.get("appliedDate", datetime.now(IST).isoformat())
        notifications.append({
            "id": f"leave_{str(leave['_id'])}",
            "title": "Leave Update",
            "message": f"Your leave request for {leave['leaveType']} has been {leave['status']}.",
            "type": leave['status'],
            "timestamp": timestamp,
            "read": False
        })
        
    # 2. Chat Messages
    messages = await messages_collection.find({"receiverId": user_id}).sort("timestamp", -1).limit(10).to_list(10)
    for msg in messages:
        sender = await users_collection.find_one({"_id": ObjectId(msg["senderId"])})
        sender_name = sender["name"] if sender else "Someone"
        notifications.append({
            "id": f"msg_{str(msg['_id'])}",
            "title": "New Message",
            "message": f"{sender_name}: {msg['message']}",
            "type": "chat",
            "timestamp": msg.get("timestamp", datetime.now(IST).isoformat()),
            "read": False
        })
        
    # 3. General Admin Messages (mocked for now, or fetch from a global collection)
    
    # Sort by timestamp descending
    try:
        notifications.sort(key=lambda x: datetime.fromisoformat(x["timestamp"]), reverse=True)
    except:
        pass
        
    return notifications[:15]
