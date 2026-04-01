from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "hrms_db")

client = AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]

# Collections
users_collection = database["users"]
attendance_collection = database["attendance"]
leaves_collection = database["leaves"]
messages_collection = database["messages"]
groups_collection = database["groups"]
read_receipts_collection = database["read_receipts"]
face_encodings_collection = database["face_encodings"]

async def connect_db():
    """Verify MongoDB connection on startup."""
    try:
        await client.admin.command("ping")
        print("SUCCESS: Connected to MongoDB successfully!")
        
        # Create indexes
        await users_collection.create_index("email", unique=True)
        await users_collection.create_index("employeeId", unique=True)
        await attendance_collection.create_index([("employeeId", 1), ("date", 1)])
        await leaves_collection.create_index("employeeId")
        await messages_collection.create_index([("senderId", 1), ("receiverId", 1)])
        await messages_collection.create_index("timestamp")
        await groups_collection.create_index("name")
        await read_receipts_collection.create_index(
            [("userId", 1), ("chatWithUserId", 1)], unique=True
        )
        
        # Create default admin if not exists
        admin = await users_collection.find_one({"email": "admin@hrms.com"})
        if not admin:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            await users_collection.insert_one({
                "employeeId": "EMP001",
                "name": "Admin User",
                "email": "admin@hrms.com",
                "password": pwd_context.hash("admin123"),
                "phone": "1234567890",
                "department": "Administration",
                "designation": "System Administrator",
                "joiningDate": "2024-01-01",
                "salary": 0,
                "profilePhoto": "",
                "role": "admin",
                "isActive": True
            })
            print("SUCCESS: Default admin created: admin@hrms.com / admin123")
        
    except Exception as e:
        print(f"ERROR: MongoDB connection failed: {e}")

async def close_db():
    """Close MongoDB connection on shutdown."""
    client.close()
    print("INFO: MongoDB connection closed.")
