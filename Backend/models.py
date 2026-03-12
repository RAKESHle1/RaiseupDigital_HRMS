from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum


# ─── Enums ────────────────────────────────────────────────
class UserRole(str, Enum):
    admin = "admin"
    employee = "employee"

class LeaveStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class LeaveType(str, Enum):
    sick = "Sick Leave"
    casual = "Casual Leave"
    earned = "Earned Leave"
    maternity = "Maternity Leave"
    paternity = "Paternity Leave"
    unpaid = "Unpaid Leave"

class AttendanceStatus(str, Enum):
    present = "present"
    absent = "absent"
    half_day = "half_day"


# ─── User Models ──────────────────────────────────────────
class UserCreate(BaseModel):
    employeeId: str
    name: str
    email: EmailStr
    password: str
    phone: str = ""
    department: str = ""
    designation: str = ""
    joiningDate: str = ""
    salary: Optional[float] = 0
    profilePhoto: Optional[str] = ""
    role: UserRole = UserRole.employee

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    joiningDate: Optional[str] = None
    salary: Optional[float] = None
    profilePhoto: Optional[str] = None
    role: Optional[UserRole] = None
    isActive: Optional[bool] = None

class UserResponse(BaseModel):
    id: str = Field(alias="_id")
    employeeId: str
    name: str
    email: str
    phone: str = ""
    department: str = ""
    designation: str = ""
    joiningDate: str = ""
    salary: float = 0
    profilePhoto: str = ""
    role: str
    isActive: bool = True

    class Config:
        populate_by_name = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ─── Attendance Models ────────────────────────────────────
class ClockInRequest(BaseModel):
    pass

class ClockOutRequest(BaseModel):
    pass

class AttendanceResponse(BaseModel):
    id: str = Field(alias="_id")
    employeeId: str
    employeeName: Optional[str] = ""
    date: str
    clockIn: Optional[str] = None
    clockOut: Optional[str] = None
    workingHours: Optional[float] = 0
    status: str = "absent"

    class Config:
        populate_by_name = True


# ─── Leave Models ─────────────────────────────────────────
class LeaveCreate(BaseModel):
    leaveType: LeaveType
    startDate: str
    endDate: str
    reason: str

class LeaveUpdate(BaseModel):
    status: LeaveStatus

class LeaveResponse(BaseModel):
    id: str = Field(alias="_id")
    employeeId: str
    employeeName: Optional[str] = ""
    leaveType: str
    startDate: str
    endDate: str
    reason: str
    status: str = "pending"
    appliedDate: str = ""

    class Config:
        populate_by_name = True


# ─── Message Models ───────────────────────────────────────
class MessageCreate(BaseModel):
    receiverId: Optional[str] = None
    groupId: Optional[str] = None
    message: str

class MessageResponse(BaseModel):
    id: str = Field(alias="_id")
    senderId: str
    senderName: Optional[str] = ""
    receiverId: Optional[str] = None
    groupId: Optional[str] = None
    message: str
    timestamp: str

    class Config:
        populate_by_name = True


# ─── Group Models ─────────────────────────────────────────
class GroupCreate(BaseModel):
    name: str
    members: list[str] = []
    description: str = ""

class GroupResponse(BaseModel):
    id: str = Field(alias="_id")
    name: str
    members: list[str] = []
    description: str = ""
    createdBy: str = ""
    createdAt: str = ""

    class Config:
        populate_by_name = True


# ─── Token Models ─────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict
