from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from bson import ObjectId
from datetime import datetime, date
from database import attendance_collection, users_collection, face_encodings_collection
from auth import get_current_user, get_admin_user
import face_recognition
import numpy as np
import cv2
import pickle
import os
import io
import tempfile
from PIL import Image
from starlette.concurrency import run_in_threadpool
import asyncio

router = APIRouter(prefix="/api/frs", tags=["Face Recognition"])

# ─── Face Encoding Storage ────────────────────────────────
# Local directory for temporary storage/backups
FACE_IMAGES_DIR = os.path.join(os.path.dirname(__file__), "face_images")
os.makedirs(FACE_IMAGES_DIR, exist_ok=True)

# In-memory face encodings cache for fast lookups
face_encodings_list = []
face_user_ids = []

async def load_encodings_from_db():
    """
    Load all registered face encodings from MongoDB into memory.
    This ensures that even if the server restarts (e.g. on Render), 
    the face recognition system remains functional.
    """
    global face_encodings_list, face_user_ids
    try:
        cursor = face_encodings_collection.find({})
        db_encodings = await cursor.to_list(length=10000)
        
        face_encodings_list = []
        face_user_ids = []
        
        for doc in db_encodings:
            user_id = doc["user_id"]
            encoding = np.array(doc["encoding"], dtype=np.float64)
            face_encodings_list.append(encoding)
            face_user_ids.append(user_id)
            
        print(f"FRS: Loaded {len(face_user_ids)} face encodings from MongoDB.")
    except Exception as e:
        print(f"FRS: Error loading encodings from MongoDB: {e}")

# Initial load task
@router.on_event("startup")
async def startup_event():
    await load_encodings_from_db()

def _prepare_image_for_dlib(data: bytes):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        
        try:
            image = face_recognition.load_image_file(tmp_path)
            if len(image.shape) == 3 and image.shape[2] == 4:
                image = image[:, :, :3]
            image = np.ascontiguousarray(image, dtype=np.uint8)
            return image
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
    except Exception as e:
        return None

def _process_recognition(contents: bytes):
    try:
        rgb_img = _prepare_image_for_dlib(contents)
        if rgb_img is None: return {"error": "Invalid image data"}

        # Resize for faster identification
        imgS = cv2.resize(rgb_img, (0, 0), None, 0.25, 0.25)
        imgS = np.ascontiguousarray(imgS, dtype=np.uint8)

        face_locations = face_recognition.face_locations(imgS)
        face_encs = face_recognition.face_encodings(imgS, face_locations)

        if len(face_encs) == 0: return {"error": "No face detected"}
        if len(face_encodings_list) == 0: return {"error": "No registered faces"}

        # Match against known faces
        encode_face = face_encs[0]
        face_distances = face_recognition.face_distance(face_encodings_list, encode_face)
        match_index = np.argmin(face_distances)

        if face_distances[match_index] > 0.5:
            return {"error": "Unrecognized face"}

        matched_user_id = face_user_ids[match_index]
        confidence = round((1 - float(face_distances[match_index])) * 100, 1)
        
        return {"matched_user_id": matched_user_id, "confidence": confidence}
    except Exception as e:
        return {"error": str(e)}


@router.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        res = await run_in_threadpool(_process_recognition, contents)
        if "error" in res:
            raise HTTPException(status_code=400, detail=res["error"])

        matched_user_id = res["matched_user_id"]
        user = await users_collection.find_one({"_id": ObjectId(matched_user_id)})
        if not user: raise HTTPException(status_code=404, detail="User accounts out of sync")

        today = date.today().isoformat()
        now_time = datetime.now().strftime("%H:%M")
        
        existing = await attendance_collection.find_one({"employeeId": matched_user_id, "date": today})
        
        action = "clock_in"
        working_hours = 0

        if existing:
            if not existing.get("clockOut"):
                in_t = datetime.strptime(existing["clockIn"], "%H:%M")
                out_t = datetime.strptime(now_time, "%H:%M")
                hrs = round((out_t - in_t).total_seconds() / 3600, 2)
                await attendance_collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": {"clockOut": now_time, "workingHours": hrs, "status": "present" if hrs >= 8 else "half_day"}}
                )
                action = "clock_out"
                working_hours = hrs
            else:
                action = "already_done"
        else:
            await attendance_collection.insert_one({
                "employeeId": matched_user_id, "employeeName": user.get("name", "Unknown"),
                "date": today, "clockIn": now_time, "clockOut": None,
                "workingHours": 0, "status": "present", "method": "frs"
            })

        return {
            "status": "success", "action": action,
            "employee": {"name": user["name"], "id": matched_user_id},
            "time": now_time, "confidence": res["confidence"], "workingHours": working_hours
        }
    except HTTPException as e: raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register")
async def register_face(
    user_id: str = Form(...),
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user)
):
    global face_encodings_list, face_user_ids
    contents = await file.read()
    
    try:
        def _get_encoding(data):
            img = _prepare_image_for_dlib(data)
            if img is None: return None
            encs = face_recognition.face_encodings(img)
            return encs[0] if encs else None

        new_encoding = await run_in_threadpool(_get_encoding, contents)
        if new_encoding is None:
            raise HTTPException(status_code=400, detail="No face detected. Please capture a clear face photo.")

        # Persist to MongoDB (Stateless)
        # Convert numpy array to list for storage
        encoding_list = new_encoding.tolist()
        await face_encodings_collection.update_one(
            {"user_id": user_id},
            {"$set": {"user_id": user_id, "encoding": encoding_list, "updated_at": datetime.now()}},
            upsert=True
        )

        # Update local memory cache
        if user_id in face_user_ids:
            idx = face_user_ids.index(user_id)
            face_encodings_list[idx] = new_encoding
        else:
            face_encodings_list.append(new_encoding)
            face_user_ids.append(user_id)

        await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"faceRegistered": True}})
        return {"status": "success", "message": "Face registered successfully and saved to DB"}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/unregister/{user_id}")
async def unregister_face(user_id: str, admin: dict = Depends(get_admin_user)):
    global face_encodings_list, face_user_ids
    
    # Remove from MongoDB
    await face_encodings_collection.delete_one({"user_id": user_id})
    
    # Remove from cache
    if user_id in face_user_ids:
        idx = face_user_ids.index(user_id)
        face_encodings_list.pop(idx); face_user_ids.pop(idx)
    
    await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"faceRegistered": False}})
    return {"message": "Face unregistered"}

@router.get("/status")
async def frs_status(current_user: dict = Depends(get_current_user)):
    return {"faceRegistered": str(current_user["_id"]) in face_user_ids}

@router.get("/registered-count")
async def registered_count(admin: dict = Depends(get_admin_user)):
    return {"total": len(face_user_ids), "userIds": face_user_ids}
