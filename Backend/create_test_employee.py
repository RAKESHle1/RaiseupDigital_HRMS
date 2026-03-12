import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from auth import get_password_hash

load_dotenv()

async def create_test_employee():
    print("Connecting to DB...")
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db = client[os.getenv("DATABASE_NAME")]
    users_collection = db["users"]
    
    test_email = "employee@raiseup.com"
    existing = await users_collection.find_one({"email": test_email})
    
    if existing:
        print(f"Employee {test_email} already exists!")
        return

    hashed_password = get_password_hash("password123")
    
    test_employee = {
        "employeeId": "EMP_TEST_999",
        "name": "Test Employee",
        "email": test_email,
        "phone": "9876543210",
        "department": "Engineering",
        "designation": "Software Developer",
        "joiningDate": "2024-03-01",
        "hashedPassword": hashed_password,
        "role": "employee",
        "isActive": True,
        "profilePhoto": None
    }
    
    await users_collection.insert_one(test_employee)
    print(f"✅ Successfully created test employee!")
    print(f"Email: {test_email}")
    print(f"Password: password123")

if __name__ == "__main__":
    asyncio.run(create_test_employee())
