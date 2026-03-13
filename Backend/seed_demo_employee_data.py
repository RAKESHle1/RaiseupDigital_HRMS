import asyncio
import os
from datetime import date, datetime, timedelta
from typing import Dict, List, Set

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from auth import get_password_hash


load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "hrms_db")
DEFAULT_PASSWORD = "password123"

EMPLOYEES = [
    {
        "name": "Rakesh",
        "email": "rakesh@raiseupdigital.com",
        "employeeId": "RUD-001",
        "phone": "9876500001",
        "department": "Operations",
        "designation": "HR Executive",
        "joiningDate": "2024-04-10",
    },
    {
        "name": "Tarun",
        "email": "tarun@raiseupdigital.com",
        "employeeId": "RUD-002",
        "phone": "9876500002",
        "department": "Operations",
        "designation": "HR Associate",
        "joiningDate": "2024-06-15",
    },
]

# You can extend this list anytime.
PUBLIC_HOLIDAYS = {
    "2026-02-15": "Maha Shivaratri",
    "2026-03-04": "Holi",
}

LEAVE_PLANS = {
    "rakesh@raiseupdigital.com": [
        {
            "leaveType": "Casual Leave",
            "startDate": "2026-02-12",
            "endDate": "2026-02-13",
            "reason": "Family function travel",
            "status": "approved",
            "appliedDate": "2026-02-05T09:15:00",
        },
        {
            "leaveType": "Sick Leave",
            "startDate": "2026-03-10",
            "endDate": "2026-03-10",
            "reason": "Fever and rest",
            "status": "approved",
            "appliedDate": "2026-03-09T08:40:00",
        },
        {
            "leaveType": "Earned Leave",
            "startDate": "2026-02-24",
            "endDate": "2026-02-24",
            "reason": "Personal work",
            "status": "rejected",
            "appliedDate": "2026-02-20T11:00:00",
        },
        {
            "leaveType": "Casual Leave",
            "startDate": "2026-03-12",
            "endDate": "2026-03-12",
            "reason": "Bank and legal work",
            "status": "pending",
            "appliedDate": "2026-03-11T15:10:00",
        },
    ],
    "tarun@raiseupdigital.com": [
        {
            "leaveType": "Sick Leave",
            "startDate": "2026-02-27",
            "endDate": "2026-02-27",
            "reason": "Viral fever",
            "status": "approved",
            "appliedDate": "2026-02-26T10:25:00",
        },
        {
            "leaveType": "Casual Leave",
            "startDate": "2026-03-06",
            "endDate": "2026-03-06",
            "reason": "Family event",
            "status": "approved",
            "appliedDate": "2026-03-04T16:00:00",
        },
        {
            "leaveType": "Earned Leave",
            "startDate": "2026-02-18",
            "endDate": "2026-02-18",
            "reason": "Outstation travel",
            "status": "rejected",
            "appliedDate": "2026-02-15T09:55:00",
        },
        {
            "leaveType": "Casual Leave",
            "startDate": "2026-03-11",
            "endDate": "2026-03-11",
            "reason": "Home maintenance",
            "status": "pending",
            "appliedDate": "2026-03-10T12:45:00",
        },
    ],
}


def iterate_dates(start_day: date, end_day: date):
    current = start_day
    while current <= end_day:
        yield current
        current += timedelta(days=1)


def to_hhmm(total_minutes: int) -> str:
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours:02d}:{minutes:02d}"


def expand_date_set(start_iso: str, end_iso: str) -> Set[str]:
    start_day = date.fromisoformat(start_iso)
    end_day = date.fromisoformat(end_iso)
    result: Set[str] = set()
    for day in iterate_dates(start_day, end_day):
        result.add(day.isoformat())
    return result


def calculate_work_hours(day: date, seed_offset: int) -> float:
    day_no = day.day
    hours = 8 + (((day_no * (seed_offset + 3)) % 14) / 10)  # 8.0 - 9.3

    if day_no % 7 == 0:
        hours += 1.2
    if (day_no + seed_offset) % 8 == 0:
        hours += 1.4
    if day_no % 9 == 0:
        hours += 1.1
    if day_no % 11 == 0:
        hours += 1.8
    if day_no % 13 == 0:
        hours = 5.5

    return round(min(hours, 11.8), 2)


def build_work_record(employee_db_id: str, employee_name: str, day: date, seed_offset: int) -> Dict:
    hours = calculate_work_hours(day, seed_offset)
    clock_in_minutes = (9 * 60) + (((day.day + seed_offset * 5) % 5) * 10)  # 09:00-09:40
    clock_out_minutes = min(clock_in_minutes + int(hours * 60), (23 * 60) + 50)

    return {
        "employeeId": employee_db_id,
        "employeeName": employee_name,
        "date": day.isoformat(),
        "clockIn": to_hhmm(clock_in_minutes),
        "clockOut": to_hhmm(clock_out_minutes),
        "workingHours": hours,
        "status": "present" if hours >= 9 else "half_day",
    }


async def ensure_employees(users_collection) -> Dict[str, Dict]:
    user_by_email: Dict[str, Dict] = {}

    for employee in EMPLOYEES:
        existing = await users_collection.find_one({"email": employee["email"]})
        if not existing:
            payload = {
                **employee,
                "password": get_password_hash(DEFAULT_PASSWORD),
                "role": "employee",
                "isActive": True,
                "profilePhoto": "",
                "salary": 42000,
            }
            await users_collection.insert_one(payload)
            existing = await users_collection.find_one({"email": employee["email"]})
            print(f"Created employee account: {employee['name']} ({employee['email']})")
        else:
            print(f"Using existing employee account: {employee['name']} ({employee['email']})")

        user_by_email[employee["email"]] = existing

    return user_by_email


async def seed_leaves(leaves_collection, user_by_email: Dict[str, Dict]):
    upserted = 0
    for email, leave_list in LEAVE_PLANS.items():
        user = user_by_email[email]
        user_id = str(user["_id"])
        user_name = user.get("name", "")

        for leave in leave_list:
            query = {
                "employeeId": user_id,
                "startDate": leave["startDate"],
                "endDate": leave["endDate"],
                "status": leave["status"],
            }
            payload = {
                "employeeId": user_id,
                "employeeName": user_name,
                "leaveType": leave["leaveType"],
                "startDate": leave["startDate"],
                "endDate": leave["endDate"],
                "reason": leave["reason"],
                "status": leave["status"],
                "appliedDate": leave["appliedDate"],
            }
            await leaves_collection.update_one(query, {"$set": payload}, upsert=True)
            upserted += 1

    print(f"Leave records upserted: {upserted}")


async def seed_attendance(attendance_collection, user_by_email: Dict[str, Dict]):
    range_start = date(2026, 2, 1)
    range_end = date(2026, 3, 13)

    upserted = 0
    for seed_offset, employee in enumerate(EMPLOYEES):
        user = user_by_email[employee["email"]]
        user_id = str(user["_id"])
        user_name = user.get("name", employee["name"])
        leave_plan = LEAVE_PLANS.get(employee["email"], [])

        approved_leave_days: Set[str] = set()
        for leave in leave_plan:
            if leave["status"] == "approved":
                approved_leave_days |= expand_date_set(leave["startDate"], leave["endDate"])

        for day in iterate_dates(range_start, range_end):
            day_iso = day.isoformat()
            is_weekend = day.weekday() >= 5  # Saturday/Sunday
            is_public_holiday = day_iso in PUBLIC_HOLIDAYS

            if is_weekend or is_public_holiday:
                payload = {
                    "employeeId": user_id,
                    "employeeName": user_name,
                    "date": day_iso,
                    "clockIn": None,
                    "clockOut": None,
                    "workingHours": 0,
                    "status": "holiday",
                }
            elif day_iso in approved_leave_days:
                payload = {
                    "employeeId": user_id,
                    "employeeName": user_name,
                    "date": day_iso,
                    "clockIn": None,
                    "clockOut": None,
                    "workingHours": 0,
                    "status": "leave",
                }
            else:
                payload = build_work_record(user_id, user_name, day, seed_offset)

            await attendance_collection.update_one(
                {"employeeId": user_id, "date": day_iso},
                {"$set": payload},
                upsert=True,
            )
            upserted += 1

    print(f"Attendance records upserted: {upserted}")
    print("Date range: 2026-02-01 to 2026-03-13")


async def main():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users_collection = db["users"]
    attendance_collection = db["attendance"]
    leaves_collection = db["leaves"]

    try:
        await client.admin.command("ping")
        print(f"Connected to MongoDB ({DATABASE_NAME})")

        user_by_email = await ensure_employees(users_collection)
        await seed_leaves(leaves_collection, user_by_email)
        await seed_attendance(attendance_collection, user_by_email)
        print("Demo seed completed successfully.")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
