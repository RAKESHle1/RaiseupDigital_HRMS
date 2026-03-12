from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import leaves_collection, users_collection
from models import LeaveCreate, LeaveUpdate
from auth import get_current_user, get_admin_user

router = APIRouter(prefix="/api/leaves", tags=["Leaves"])


@router.post("/")
async def apply_leave(leave: LeaveCreate, current_user: dict = Depends(get_current_user)):
    leave_dict = leave.model_dump()
    leave_dict["employeeId"] = str(current_user["_id"])
    leave_dict["employeeName"] = current_user.get("name", "")
    leave_dict["status"] = "pending"
    leave_dict["appliedDate"] = datetime.now().isoformat()
    leave_dict["leaveType"] = leave_dict["leaveType"].value if hasattr(leave_dict["leaveType"], "value") else leave_dict["leaveType"]
    
    result = await leaves_collection.insert_one(leave_dict)
    return {"message": "Leave applied successfully", "id": str(result.inserted_id)}


@router.get("/my")
async def get_my_leaves(
    month: int = None,
    year: int = None,
    status: str = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"employeeId": str(current_user["_id"])}
    if status:
        query["status"] = status
    
    leaves = []
    cursor = leaves_collection.find(query).sort("appliedDate", -1)
    async for leave in cursor:
        leave["_id"] = str(leave["_id"])
        
        if month or year:
            applied = datetime.fromisoformat(leave["appliedDate"])
            if month and applied.month != month:
                continue
            if year and applied.year != year:
                continue
        
        leaves.append(leave)
    
    return leaves


@router.get("/all")
async def get_all_leaves(
    month: int = None,
    year: int = None,
    status: str = None,
    employee_id: str = None,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    if employee_id:
        query["employeeId"] = employee_id
    
    leaves = []
    cursor = leaves_collection.find(query).sort("appliedDate", -1)
    async for leave in cursor:
        leave["_id"] = str(leave["_id"])
        
        if month or year:
            applied = datetime.fromisoformat(leave["appliedDate"])
            if month and applied.month != month:
                continue
            if year and applied.year != year:
                continue
        
        leaves.append(leave)
    
    return leaves


@router.get("/stats")
async def get_leave_stats(admin: dict = Depends(get_admin_user)):
    """Get leave statistics for dashboard."""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    stats = {"total": 0, "approved": 0, "rejected": 0, "pending": 0}
    async for result in leaves_collection.aggregate(pipeline):
        stats[result["_id"]] = result["count"]
        stats["total"] += result["count"]
    
    return stats


@router.get("/my-stats")
async def get_my_leave_stats(current_user: dict = Depends(get_current_user)):
    """Get personal leave statistics."""
    employee_id = str(current_user["_id"])
    pipeline = [
        {"$match": {"employeeId": employee_id}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    stats = {"total": 0, "approved": 0, "rejected": 0, "pending": 0}
    async for result in leaves_collection.aggregate(pipeline):
        stats[result["_id"]] = result["count"]
        stats["total"] += result["count"]
    
    return stats


@router.put("/{leave_id}")
async def update_leave_status(
    leave_id: str,
    leave_update: LeaveUpdate,
    admin: dict = Depends(get_admin_user)
):
    result = await leaves_collection.update_one(
        {"_id": ObjectId(leave_id)},
        {"$set": {"status": leave_update.status.value}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Leave not found")
    
    return {"message": f"Leave {leave_update.status.value} successfully"}


@router.delete("/{leave_id}")
async def delete_leave(leave_id: str, current_user: dict = Depends(get_current_user)):
    leave = await leaves_collection.find_one({"_id": ObjectId(leave_id)})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    
    if leave["employeeId"] != str(current_user["_id"]) and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if leave["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only delete pending leaves")
    
    await leaves_collection.delete_one({"_id": ObjectId(leave_id)})
    return {"message": "Leave deleted successfully"}
