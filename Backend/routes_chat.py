from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import messages_collection, groups_collection, users_collection
from models import MessageCreate, GroupCreate
from auth import get_current_user, get_admin_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])


# ─── Direct Messages ─────────────────────────────────────
@router.post("/messages")
async def send_message(msg: MessageCreate, current_user: dict = Depends(get_current_user)):
    message_doc = {
        "senderId": str(current_user["_id"]),
        "senderName": current_user.get("name", ""),
        "receiverId": msg.receiverId,
        "groupId": msg.groupId,
        "message": msg.message,
        "timestamp": datetime.now().isoformat()
    }
    
    result = await messages_collection.insert_one(message_doc)
    message_doc["_id"] = str(result.inserted_id)
    return message_doc


@router.get("/messages/{user_id}")
async def get_messages(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get conversation between current user and another user."""
    my_id = str(current_user["_id"])
    
    messages = []
    cursor = messages_collection.find({
        "$or": [
            {"senderId": my_id, "receiverId": user_id},
            {"senderId": user_id, "receiverId": my_id}
        ]
    }).sort("timestamp", 1)
    
    async for msg in cursor:
        msg["_id"] = str(msg["_id"])
        messages.append(msg)
    
    return messages


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get list of users the current user has chatted with."""
    my_id = str(current_user["_id"])
    
    # Find unique conversation partners
    pipeline = [
        {"$match": {
            "$or": [{"senderId": my_id}, {"receiverId": my_id}],
            "groupId": None
        }},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$senderId", my_id]},
                    "$receiverId",
                    "$senderId"
                ]
            },
            "lastMessage": {"$first": "$message"},
            "lastTimestamp": {"$first": "$timestamp"},
            "senderName": {"$first": "$senderName"}
        }}
    ]
    
    conversations = []
    async for conv in messages_collection.aggregate(pipeline):
        # Get user details
        user = await users_collection.find_one({"_id": ObjectId(conv["_id"])})
        if user:
            conversations.append({
                "userId": str(user["_id"]),
                "name": user["name"],
                "profilePhoto": user.get("profilePhoto", ""),
                "lastMessage": conv["lastMessage"],
                "lastTimestamp": conv["lastTimestamp"]
            })
    
    return conversations


# ─── Group Chat ───────────────────────────────────────────
@router.post("/groups")
async def create_group(group: GroupCreate, current_user: dict = Depends(get_current_user)):
    group_doc = group.model_dump()
    group_doc["createdBy"] = str(current_user["_id"])
    group_doc["createdAt"] = datetime.now().isoformat()
    
    # Add creator to members
    if str(current_user["_id"]) not in group_doc["members"]:
        group_doc["members"].append(str(current_user["_id"]))
    
    result = await groups_collection.insert_one(group_doc)
    group_doc["_id"] = str(result.inserted_id)
    return group_doc


@router.get("/groups")
async def get_my_groups(current_user: dict = Depends(get_current_user)):
    my_id = str(current_user["_id"])
    groups = []
    cursor = groups_collection.find({"members": my_id})
    async for group in cursor:
        group["_id"] = str(group["_id"])
        groups.append(group)
    return groups


@router.get("/groups/all")
async def get_all_groups(admin: dict = Depends(get_admin_user)):
    groups = []
    cursor = groups_collection.find()
    async for group in cursor:
        group["_id"] = str(group["_id"])
        groups.append(group)
    return groups


@router.get("/groups/{group_id}")
async def get_group(group_id: str, current_user: dict = Depends(get_current_user)):
    group = await groups_collection.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    group["_id"] = str(group["_id"])
    return group


@router.get("/groups/{group_id}/messages")
async def get_group_messages(group_id: str, current_user: dict = Depends(get_current_user)):
    messages = []
    cursor = messages_collection.find({"groupId": group_id}).sort("timestamp", 1)
    async for msg in cursor:
        msg["_id"] = str(msg["_id"])
        messages.append(msg)
    return messages


@router.post("/groups/{group_id}/messages")
async def send_group_message(group_id: str, msg: MessageCreate, current_user: dict = Depends(get_current_user)):
    message_doc = {
        "senderId": str(current_user["_id"]),
        "senderName": current_user.get("name", ""),
        "receiverId": None,
        "groupId": group_id,
        "message": msg.message,
        "timestamp": datetime.now().isoformat()
    }
    
    result = await messages_collection.insert_one(message_doc)
    message_doc["_id"] = str(result.inserted_id)
    return message_doc


@router.put("/groups/{group_id}/members")
async def add_group_member(group_id: str, member_id: str, current_user: dict = Depends(get_current_user)):
    result = await groups_collection.update_one(
        {"_id": ObjectId(group_id)},
        {"$addToSet": {"members": member_id}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Group not found or member already exists")
    return {"message": "Member added successfully"}


# ─── Admin: Chat Monitoring ──────────────────────────────
@router.get("/admin/stats")
async def get_chat_stats(admin: dict = Depends(get_admin_user)):
    total_messages = await messages_collection.count_documents({})
    total_groups = await groups_collection.count_documents({})
    
    # Active users (sent a message in last 24 hours)
    from datetime import timedelta
    yesterday = (datetime.now() - timedelta(hours=24)).isoformat()
    active_pipeline = [
        {"$match": {"timestamp": {"$gte": yesterday}}},
        {"$group": {"_id": "$senderId"}},
        {"$count": "count"}
    ]
    active_count = 0
    async for result in messages_collection.aggregate(active_pipeline):
        active_count = result["count"]
    
    return {
        "totalMessages": total_messages,
        "totalGroups": total_groups,
        "activeUsers": active_count
    }
