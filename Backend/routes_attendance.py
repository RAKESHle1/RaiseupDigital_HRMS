from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, date
from database import attendance_collection, users_collection
from auth import get_current_user, get_admin_user

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.post("/clock-in")
async def clock_in(current_user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    employee_id = str(current_user["_id"])
    
    # Check if already clocked in today
    existing = await attendance_collection.find_one({
        "employeeId": employee_id,
        "date": today
    })
    
    if existing and existing.get("clockIn"):
        raise HTTPException(status_code=400, detail="Already clocked in today")
    
    now = datetime.now().strftime("%H:%M")
    
    if existing:
        await attendance_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"clockIn": now, "status": "present"}}
        )
    else:
        await attendance_collection.insert_one({
            "employeeId": employee_id,
            "employeeName": current_user.get("name", ""),
            "date": today,
            "clockIn": now,
            "clockOut": None,
            "workingHours": 0,
            "status": "present"
        })
    
    return {"message": "Clocked in successfully", "time": now}


@router.post("/clock-out")
async def clock_out(current_user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    employee_id = str(current_user["_id"])
    
    existing = await attendance_collection.find_one({
        "employeeId": employee_id,
        "date": today
    })
    
    if not existing or not existing.get("clockIn"):
        raise HTTPException(status_code=400, detail="You must clock in first")
    
    if existing.get("clockOut"):
        raise HTTPException(status_code=400, detail="Already clocked out today")
    
    now = datetime.now().strftime("%H:%M")
    
    # Calculate working hours
    clock_in_time = datetime.strptime(existing["clockIn"], "%H:%M")
    clock_out_time = datetime.strptime(now, "%H:%M")
    diff = clock_out_time - clock_in_time
    working_hours = round(diff.total_seconds() / 3600, 2)
    
    status = "present" if working_hours >= 9 else "half_day"
    
    await attendance_collection.update_one(
        {"_id": existing["_id"]},
        {"$set": {
            "clockOut": now,
            "workingHours": working_hours,
            "status": status
        }}
    )
    
    return {
        "message": "Clocked out successfully",
        "time": now,
        "workingHours": working_hours,
        "status": status
    }


@router.get("/my")
async def get_my_attendance(
    month: int | None = None,
    year: int | None = None,
    date_filter: str | None = None,
    current_user: dict = Depends(get_current_user)
):
    employee_id = str(current_user["_id"])
    query = {"employeeId": employee_id}
    
    if date_filter:
        query["date"] = date_filter
    
    records = []
    cursor = attendance_collection.find(query).sort("date", -1)
    async for record in cursor:
        record["_id"] = str(record["_id"])
        
        # Filter by month/year if specified (only if date_filter is NOT specified or matches)
        # This keeps the logic robust if both are sent.
        if (month or year) and not date_filter:
            record_date = datetime.strptime(record["date"], "%Y-%m-%d")
            if month and record_date.month != month:
                continue
            if year and record_date.year != year:
                continue
        
        records.append(record)
    
    return records


@router.get("/today")
async def get_today_attendance(current_user: dict = Depends(get_current_user)):
    today = date.today().isoformat()
    employee_id = str(current_user["_id"])
    
    record = await attendance_collection.find_one({
        "employeeId": employee_id,
        "date": today
    })
    
    if record:
        record["_id"] = str(record["_id"])
    
    return record


@router.get("/all")
async def get_all_attendance(
    date_filter: str | None = None,
    month: int | None = None,
    year: int | None = None,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if date_filter:
        query["date"] = date_filter
    
    records = []
    cursor = attendance_collection.find(query).sort("date", -1)
    async for record in cursor:
        record["_id"] = str(record["_id"])
        
        if month or year:
            record_date = datetime.strptime(record["date"], "%Y-%m-%d")
            if month and record_date.month != month:
                continue
            if year and record_date.year != year:
                continue
        
        records.append(record)
    
    return records


@router.get("/report")
async def get_attendance_report(
    month: int | None = None,
    year: int | None = None,
    admin: dict = Depends(get_admin_user)
):
    """Get attendance report with summary statistics."""
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    records = []
    cursor = attendance_collection.find().sort("date", -1)
    async for record in cursor:
        record_date = datetime.strptime(record["date"], "%Y-%m-%d")
        if record_date.month == target_month and record_date.year == target_year:
            record["_id"] = str(record["_id"])
            records.append(record)
    
    # Build per-employee summary
    employee_summary = {}
    for record in records:
        emp_id = record["employeeId"]
        if emp_id not in employee_summary:
            employee_summary[emp_id] = {
                "employeeId": emp_id,
                "employeeName": record.get("employeeName", ""),
                "totalDays": 0,
                "presentDays": 0,
                "totalHours": 0,
                "avgHours": 0,
            }
        employee_summary[emp_id]["totalDays"] += 1
        if record.get("clockIn") and record.get("clockOut"):
            employee_summary[emp_id]["presentDays"] += 1
            employee_summary[emp_id]["totalHours"] += record.get("workingHours", 0)
    
    for emp_id in employee_summary:
        if employee_summary[emp_id]["presentDays"] > 0:
            employee_summary[emp_id]["avgHours"] = round(
                employee_summary[emp_id]["totalHours"] / employee_summary[emp_id]["presentDays"], 2
            )

    return {
        "month": target_month,
        "year": target_year,
        "records": records,
        "summary": list(employee_summary.values())
    }
