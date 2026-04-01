import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv('Backend/.env')
url = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
db_name = os.getenv('DATABASE_NAME', 'hrms_db')

async def main():
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    async for u in db['users'].find({}, {'name':1,'email':1,'employeeId':1,'role':1,'isActive':1}).sort('name',1):
        print(f"{u.get('name')} | {u.get('email')} | {u.get('employeeId')} | {u.get('role')} | active={u.get('isActive', True)}")
    client.close()

asyncio.run(main())
