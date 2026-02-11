"""
Authentication API Endpoints

Handles user registration and login.

Endpoints:
==========
- POST /register: Create new user account
- POST /login: Authenticate and receive JWT token
- GET /me: Get current user information

Authentication Flow:
====================
1. Registration:
   - User submits email, username, password
   - Password is hashed using bcrypt
   - User record created in database
   - JWT token returned for immediate login

2. Login:
   - User submits email, password
   - Password verified against hash
   - JWT token generated and returned
   - Token expires after ACCESS_TOKEN_EXPIRE_MINUTES (default: 30)

3. Authenticated Requests:
   - Client includes token in Authorization header: "Bearer <token>"
   - Backend validates token and extracts user identity
   - User-specific data returned

Security Considerations:
========================
- Passwords never stored in plain text (bcrypt hashing)
- JWT tokens have expiration (prevents indefinite access)
- Token signature prevents tampering
- Email validation prevents invalid addresses
- Password minimum length enforced (8 characters)

JWT Token Structure:
====================
{
  "sub": "user@example.com",  // Subject (user email)
  "exp": 1640995200           // Expiration timestamp
}

Future Enhancements:
====================
- Refresh tokens for longer sessions
- Email verification
- Password reset flow
- Two-factor authentication
- Rate limiting for login attempts
"""
from datetime import timedelta
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.core.security import create_access_token, get_password_hash, verify_password
from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    Process:
    1. Check if email already exists
    2. Hash the password
    3. Create user in database
    4. Generate JWT token
    5. Return token for immediate authentication

    Args:
        user_in: User registration data (email, username, password)
        db: Database session

    Returns:
        JWT token for authentication

    Raises:
        HTTPException 400: If email already registered

    Example Request:
    ```json
    POST /api/v1/auth/register
    {
      "email": "user@example.com",
      "username": "John Doe",
      "password": "securepassword123"
    }
    ```

    Example Response:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer"
    }
    ```
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user with hashed password
    db_user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=db_user.email, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login with email and password.

    OAuth2 compatible endpoint (uses OAuth2PasswordRequestForm).
    Form data fields:
    - username: Actually the email (OAuth2 standard uses 'username')
    - password: User's password

    Process:
    1. Find user by email
    2. Verify password
    3. Generate JWT token
    4. Return token

    Args:
        form_data: OAuth2 form with username (email) and password
        db: Database session

    Returns:
        JWT token for authentication

    Raises:
        HTTPException 401: If credentials are invalid

    Example Request (form-data):
    ```
    POST /api/v1/auth/login
    username=user@example.com
    password=securepassword123
    ```

    Example Response:
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer"
    }
    ```

    Usage with curl:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/auth/login" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "username=user@example.com&password=securepassword123"
    ```
    """
    # Find user by email (form_data.username is actually the email)
    user = db.query(User).filter(User.email == form_data.username).first()

    # Verify credentials
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.email, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get current user information.

    Requires authentication (JWT token in Authorization header).

    Args:
        current_user: Authenticated user from JWT token

    Returns:
        Current user's public information

    Example Request:
    ```bash
    curl -X GET "http://localhost:8000/api/v1/auth/me" \
      -H "Authorization: Bearer <your_token_here>"
    ```

    Example Response:
    ```json
    {
      "id": "abc-123-def-456",
      "email": "user@example.com",
      "username": "John Doe",
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00"
    }
    ```
    """
    return current_user


ALLOWED_AVATAR_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload or replace the current user's avatar image."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_AVATAR_EXTENSIONS)}")

    contents = await file.read()
    if len(contents) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")

    upload_dir = Path(settings.UPLOAD_DIR) / "avatars"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Delete old avatar file if exists
    if current_user.avatar_url:
        old_path = Path("/app") / current_user.avatar_url.lstrip("/")
        if old_path.exists():
            old_path.unlink()

    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / unique_filename
    with open(file_path, "wb") as f:
        f.write(contents)

    current_user.avatar_url = f"/uploads/avatars/{unique_filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserResponse)
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove the current user's avatar."""
    if current_user.avatar_url:
        old_path = Path("/app") / current_user.avatar_url.lstrip("/")
        if old_path.exists():
            old_path.unlink()
        current_user.avatar_url = None
        db.commit()
        db.refresh(current_user)
    return current_user


@router.get("/me/avatar")
async def get_avatar(
    current_user: User = Depends(get_current_user),
):
    """Serve the current user's avatar image."""
    if not current_user.avatar_url:
        raise HTTPException(status_code=404, detail="No avatar set")

    file_path = Path("/app") / current_user.avatar_url.lstrip("/")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Avatar file not found")

    return FileResponse(str(file_path))
