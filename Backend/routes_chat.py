from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from database import messages_collection, groups_collection, users_collection, leaves_collection, read_receipts_collection
from models import MessageCreate, GroupCreate
from auth import get_current_user, get_admin_user
from presence_state import is_user_online

router = APIRouter(prefix="/api/chat", tags=["Chat"])


def _parse_iso_date(date_value: str):
    try:
        return datetime.fromisoformat(str(date_value).split("T")[0]).date()
    except Exception:
        return None


# ─── Direct Messages ─────────────────────────────────────
@router.post("/messages")
async def send_message(msg: MessageCreate, current_user: dict = Depends(get_current_user)):
    message_doc = {
        "senderId": str(current_user["_id"]),
        "senderName": current_user.get("name", ""),
        "receiverId": msg.receiverId,
        "groupId": msg.groupId,
        "message": msg.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    result = await messages_collection.insert_one(message_doc)
    message_doc["_id"] = str(result.inserted_id)
    return message_doc


@router.get("/messages/{user_id}")
async def get_messages(user_id: str, current_user: dict = Depends(get_current_user)):
    try:
        my_id = str(current_user["_id"])
        messages = []
        cursor = messages_collection.find({
            "$or": [
                {"senderId": my_id, "receiverId": user_id},
                {"senderId": user_id, "receiverId": my_id}
            ]
        }).sort("timestamp", -1)  # Sort messages in descending order
        async for msg in cursor:
            msg["_id"] = str(msg["_id"])
            messages.append(msg)

        # Get the other user's read receipt (when they last read MY messages)
        other_receipt = await read_receipts_collection.find_one(
            {"userId": user_id, "chatWithUserId": my_id}
        )
        other_read_ts = other_receipt.get("lastReadTimestamp", "") if other_receipt else ""

        return {"messages": messages, "otherReadTimestamp": other_read_ts}
    except Exception as e:
        print(f"Error in get_messages: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    try:
        my_id = str(current_user["_id"])
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
                "lastSenderId": {"$first": "$senderId"},
                "senderName": {"$first": "$senderName"}
            }}
        ]
        conversations = []
        async for conv in messages_collection.aggregate(pipeline):
            other_user_id_str = conv["_id"]
            if not other_user_id_str:
                continue

            try:
                user = await users_collection.find_one({"_id": ObjectId(other_user_id_str)})
            except Exception:
                # Handle cases where other_user_id_str is not a valid ObjectId
                user = None

            if not user:
                continue

            other_user_id = str(user["_id"])

            # Calculate unread count from DB
            receipt = await read_receipts_collection.find_one(
                {"userId": my_id, "chatWithUserId": other_user_id}
            )
            last_read_ts = receipt.get("lastReadTimestamp", "") if receipt else ""

            unread_filter = {
                "senderId": other_user_id,
                "receiverId": my_id,
                "groupId": None,
            }
            if last_read_ts:
                unread_filter["timestamp"] = {"$gt": last_read_ts}
            unread_count = await messages_collection.count_documents(unread_filter)

            conversations.append({
                "userId": other_user_id,
                "name": user["name"],
                "profilePhoto": user.get("profilePhoto", ""),
                "lastMessage": conv["lastMessage"],
                "lastTimestamp": conv["lastTimestamp"],
                "lastSenderId": conv.get("lastSenderId", ""),
                "unreadCount": unread_count,
            })

        # Sort conversations: unread first, then by timestamp descending
        conversations.sort(key=lambda c: c.get("lastTimestamp", ""), reverse=True)
        return conversations
    except Exception as e:
        print(f"Error in get_conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.post("/mark-read/{user_id}")
async def mark_conversation_read(user_id: str, current_user: dict = Depends(get_current_user)):
    """Mark all messages from user_id as read (record current timestamp)."""
    my_id = str(current_user["_id"])
    now_ts = datetime.now(timezone.utc).isoformat()
    await read_receipts_collection.update_one(
        {"userId": my_id, "chatWithUserId": user_id},
        {"$set": {"lastReadTimestamp": now_ts, "updatedAt": now_ts}},
        upsert=True,
    )
    return {"message": "Marked as read"}


@router.get("/unread-counts")
async def get_unread_counts(current_user: dict = Depends(get_current_user)):
    """Return a map of { otherUserId: unreadCount } for all conversations."""
    my_id = str(current_user["_id"])

    # Get all read receipts for this user
    receipts = {}
    async for r in read_receipts_collection.find({"userId": my_id}):
        receipts[r["chatWithUserId"]] = r.get("lastReadTimestamp", "")

    # Aggregate unread messages grouped by sender
    pipeline = [
        {"$match": {"receiverId": my_id, "groupId": None}},
        {"$group": {
            "_id": "$senderId",
            "messages": {"$push": {"timestamp": "$timestamp"}},
            "total": {"$sum": 1},
        }}
    ]

    counts = {}
    async for group in messages_collection.aggregate(pipeline):
        sender_id = group["_id"]
        last_read_ts = receipts.get(sender_id, "")
        if last_read_ts:
            unread = sum(1 for m in group["messages"] if m.get("timestamp", "") > last_read_ts)
        else:
            unread = group["total"]
        if unread > 0:
            counts[sender_id] = unread

    return counts


@router.get("/presence")
async def get_presence(
    user_ids: str = "",
    current_user: dict = Depends(get_current_user),
):
    ids = []
    for raw in (user_ids or "").split(","):
        value = raw.strip()
        if value:
            ids.append(value)
    ids = list(dict.fromkeys(ids))

    if not ids:
        return {}

    today = datetime.now().date()
    on_leave_map = {uid: False for uid in ids}
    leave_cursor = leaves_collection.find({
        "employeeId": {"$in": ids},
        "status": "approved",
    })
    async for leave in leave_cursor:
        employee_id = str(leave.get("employeeId", ""))
        if employee_id not in on_leave_map:
            continue
        start_date = _parse_iso_date(leave.get("startDate", ""))
        end_date = _parse_iso_date(leave.get("endDate", ""))
        if not start_date or not end_date:
            continue
        if start_date <= today <= end_date:
            on_leave_map[employee_id] = True

    result = {}
    for uid in ids:
        if on_leave_map.get(uid):
            result[uid] = "leave"
        elif is_user_online(uid):
            result[uid] = "online"
        else:
            result[uid] = "offline"
    return result


# ─── Group Chat ───────────────────────────────────────────
@router.post("/groups")
async def create_group(group: GroupCreate, current_user: dict = Depends(get_current_user)):
    group_doc = group.model_dump()
    group_doc["createdBy"] = str(current_user["_id"])
    group_doc["createdAt"] = datetime.now(timezone.utc).isoformat()
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
        "timestamp": datetime.now(timezone.utc).isoformat()
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
    from datetime import timedelta
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
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
