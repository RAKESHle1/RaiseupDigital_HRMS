from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from bson import ObjectId
from database import users_collection
from models import UserCreate, UserUpdate, UserResponse, UserLogin, Token
from auth import verify_password, get_password_hash, create_access_token, get_current_user, get_admin_user
from pydantic import BaseModel
import base64

router = APIRouter(prefix="/api", tags=["Users"])

class PasswordChangeRequest(BaseModel):
    currentPassword: str
    newPassword: str


# ─── Authentication ───────────────────────────────────────
@router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await users_collection.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    token = create_access_token(data={"sub": user["email"]})
    user_dict = {
        "id": str(user["_id"]),
        "employeeId": user["employeeId"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "department": user.get("department", ""),
        "designation": user.get("designation", ""),
        "profilePhoto": user.get("profilePhoto", ""),
    }
    return {"access_token": token, "token_type": "bearer", "user": user_dict}


@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user.pop("password", None)
    return current_user


# ─── Employee Management (Admin) ─────────────────────────
@router.post("/users", response_model=dict)
async def create_user(user: UserCreate, admin: dict = Depends(get_admin_user)):
    # Check if email already exists
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_id = await users_collection.find_one({"employeeId": user.employeeId})
    if existing_id:
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    
    user_dict = user.model_dump()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["isActive"] = True
    
    result = await users_collection.insert_one(user_dict)
    return {"message": "Employee created successfully", "id": str(result.inserted_id)}


@router.get("/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    try:
        print(f"Fetching active users (requested by {current_user.get('email')})")
        users = []
        cursor = users_collection.find({"isActive": True})
        async for user in cursor:
            user["_id"] = str(user["_id"])
            user.pop("password", None)
            users.append(user)
        print(f"Retrieved {len(users)} active users")
        return users
    except Exception as e:
        print(f"Error in get_all_users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/users/all")
async def get_all_users_including_inactive(admin: dict = Depends(get_admin_user)):
    try:
        print(f"Fetching all users (requested by admin {admin.get('email')})")
        users = []
        cursor = users_collection.find()
        async for user in cursor:
            user["_id"] = str(user["_id"])
            user.pop("password", None)
            users.append(user)
        print(f"Retrieved total {len(users)} users")
        return users
    except Exception as e:
        print(f"Error in get_all_users_including_inactive: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    user.pop("password", None)
    return user


@router.put("/users/{user_id}")
async def update_user(user_id: str, user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    # Only admin can update other users; employees can only update themselves
    if current_user["role"] != "admin" and str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found or no changes made")
    
    return {"message": "User updated successfully"}


@router.put("/users/{user_id}/deactivate")
async def deactivate_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"isActive": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated successfully"}


@router.put("/users/{user_id}/activate")
async def activate_user(user_id: str, admin: dict = Depends(get_admin_user)):
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"isActive": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User activated successfully"}


@router.put("/users/{user_id}/change-password")
async def change_password(user_id: str, payload: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user["role"] != "admin":
        if not verify_password(payload.currentPassword, user_doc.get("password", "")):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(payload.newPassword) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    if verify_password(payload.newPassword, user_doc.get("password", "")):
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": get_password_hash(payload.newPassword)}}
    )
    return {"message": "Password updated successfully"}


@router.post("/users/{user_id}/photo")
async def upload_photo(user_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and str(current_user["_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    contents = await file.read()
    photo_base64 = base64.b64encode(contents).decode("utf-8")
    photo_data = f"data:{file.content_type};base64,{photo_base64}"
    
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"profilePhoto": photo_data}}
    )
    return {"message": "Photo uploaded successfully", "profilePhoto": photo_data}
