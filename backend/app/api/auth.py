from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
import json
from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token, decode_token
)
from app.core.config import settings
from app.models.models import User, UserSettings, RevokedToken
from app.schemas.schemas import (
    UserRegister, UserLogin, GoogleAuthRequest, TokenResponse, TokenRefresh, UserOut
)
from app.api.deps import get_current_user
from app.services.google_auth import verify_google_id_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    # Check if username exists
    existing_username = db.query(User).filter(User.username == user_in.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This username is already taken"
        )
    
    hashed_pwd = hash_password(user_in.password)
    user = User(
        email=user_in.email.lower(),
        username=user_in.username,
        display_name=user_in.display_name or user_in.username,
        hashed_password=hashed_pwd,
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        bio="Music Lover • Dream Big 🎵",
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default settings
    user_settings = UserSettings(user_id=user.id)
    db.add(user_settings)
    db.commit()

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not user.hashed_password or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is disabled")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/google", response_model=TokenResponse)
def google_auth(auth_in: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Real Google OAuth 2.0 / OpenID Connect token verification.
    Cryptographically verifies Google ID token signature, issuer, audience, and expiration.
    """
    google_info = verify_google_id_token(auth_in.credential)

    google_sub = str(google_info.get("sub"))
    email = google_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google token missing required email claim"
        )
    
    # Check if user exists by google_id or email
    user = db.query(User).filter((User.google_id == google_sub) | (User.email == email.lower())).first()
    if not user:
        # Create user from Google Profile
        display_name = google_info.get("name") or email.split("@")[0]
        base_username = email.split("@")[0].replace(".", "_")
        username = base_username
        suffix = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{suffix}"
            suffix += 1

        avatar_url = google_info.get("picture") or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
        
        user = User(
            email=email.lower(),
            google_id=google_sub,
            username=username,
            display_name=display_name,
            avatar_url=avatar_url,
            is_verified=True,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        user_settings = UserSettings(user_id=user.id)
        db.add(user_settings)
        db.commit()
    else:
        # Link google_id if not already set
        if not user.google_id:
            user.google_id = google_sub
            db.commit()
            db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is disabled"
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token_in: TokenRefresh, db: Session = Depends(get_db)):
    # Check if token is already revoked
    is_revoked = db.query(RevokedToken).filter(RevokedToken.token == token_in.refresh_token).first()
    if is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked"
        )

    payload = decode_token(token_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Refresh Token Rotation: Revoke previous refresh token
    revoked = RevokedToken(token=token_in.refresh_token)
    db.add(revoked)
    db.commit()

    new_access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    token_in: TokenRefresh = None,
    db: Session = Depends(get_db)
):
    # Server-side token revocation
    if token_in and token_in.refresh_token:
        already_revoked = db.query(RevokedToken).filter(RevokedToken.token == token_in.refresh_token).first()
        if not already_revoked:
            revoked = RevokedToken(token=token_in.refresh_token)
            db.add(revoked)
            db.commit()
    return {"message": "Logged out successfully"}
