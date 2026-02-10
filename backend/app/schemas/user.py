"""
User Schemas (Pydantic Models)

Pydantic models for request/response validation and serialization.

Why separate schemas from database models?
==========================================
1. Separation of concerns: Database layer != API layer
2. Security: Never expose hashed_password in responses
3. Flexibility: API representation can differ from database
4. Validation: Pydantic validates incoming data before it hits the database

Schema Types:
=============
- UserCreate: Registration data (email, password, username)
- UserLogin: Login credentials (email, password)
- UserInDB: Database representation (includes hashed_password)
- UserResponse: Public user info (excludes password)
- Token: JWT token response

Example Flow:
=============
1. Client sends UserCreate -> Register endpoint
2. Endpoint validates with Pydantic
3. Password hashed, User model created
4. UserResponse returned (no password)
"""
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    """
    Schema for user registration.

    Validates:
    - Email format (EmailStr)
    - Password strength (min 8 characters)
    - Username length (3-50 characters)
    """
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """
    Schema for user login.

    Simple email + password authentication.
    """
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """
    Public user information returned in API responses.

    Never includes hashed_password or sensitive data.
    """
    id: UUID
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Allows creation from ORM models


class UserInDB(UserBase):
    """
    Database representation of user.

    Includes hashed_password for authentication but
    never returned in API responses.
    """
    id: UUID
    hashed_password: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """
    JWT token response.

    Returned after successful login or registration.
    """
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """
    Data encoded in JWT token.

    Contains user email for identifying the authenticated user.
    """
    email: Optional[str] = None


class UserUpdate(BaseModel):
    """
    Schema for admin user updates.

    All fields optional for partial updates.
    Password will be hashed before storing if provided.
    """
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    is_admin: Optional[bool] = None


class UserWithStats(UserResponse):
    """User response with per-user data counts and storage size for admin listing."""
    tank_count: int = 0
    livestock_count: int = 0
    equipment_count: int = 0
    photo_count: int = 0
    note_count: int = 0
    reminder_count: int = 0
    total_records: int = 0
    data_size_mb: float = 0.0


class SystemStats(BaseModel):
    """
    System statistics for admin dashboard.
    """
    total_users: int
    total_tanks: int
    total_parameters: int
    total_photos: int
    total_notes: int
    total_livestock: int
    total_reminders: int
    total_equipment: int
    database_size_mb: Optional[float] = None
    active_users_last_30_days: int
