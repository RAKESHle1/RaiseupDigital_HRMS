import asyncio
from database import users_collection
from bson import ObjectId

async def main():
    try:
        print("Connecting to check users...")
        count = await users_collection.count_documents({})
        print(f"Total users: {count}")
        
        # Test individual user lookups
        cursor = users_collection.find({})
        async for user in cursor:
            print(f"Found user via cursor: {user.get('email')}")
            
        print("Diagnostic complete.")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())
