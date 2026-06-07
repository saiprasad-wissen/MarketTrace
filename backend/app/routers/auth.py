import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.user import User
from app.schemas import UserRegister, UserLogin, TokenResponse, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from app.services.auth_service import get_password_hash, verify_password, create_access_token, generate_otp, get_current_user
from app.services.email_service import send_otp_email

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_pw = get_password_hash(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_pw
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate token
    access_token = create_access_token(data={"sub": new_user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": new_user.id, "name": new_user.name, "email": new_user.email, "role": "Analyst"}
    }

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalars().first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": "Analyst"}
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if not user:
        # Don't reveal that the user doesn't exist for security reasons
        return {"message": "If that email exists, an OTP has been sent."}

    # Generate real OTP
    otp = generate_otp()
    user.reset_otp = otp
    user.reset_otp_expiry = datetime.utcnow() + timedelta(minutes=15)
    await db.commit()
    
    # Try to send real email, fallback to terminal print if no credentials
    try:
        send_otp_email(user.email, otp)
    except Exception as e:
        logger.error(f"Could not send email, falling back to terminal. Error: {e}")
        
    # Always print to terminal for hackathon demo purposes just in case
    print(f"\n{'='*50}")
    print(f"🔒 HACKATHON DEMO: OTP SENT FOR {req.email}")
    print(f"👉 YOUR SECURE CODE IS: {otp}")
    print(f"{'='*50}\n")
    
    return {"message": "If that email exists, an OTP has been sent."}

@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    
    if not user or user.reset_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    if user.reset_otp_expiry and user.reset_otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")
        
    return {"message": "OTP verified successfully"}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    
    if not user or user.reset_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    if user.reset_otp_expiry and user.reset_otp_expiry < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP has expired")

    user.hashed_password = get_password_hash(req.new_password)
    user.reset_otp = None
    user.reset_otp_expiry = None
    await db.commit()
    
    return {"message": "Password reset successfully"}

@router.get("/me", response_model=TokenResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "access_token": "",
        "token_type": "bearer",
        "user": {"id": current_user.id, "name": current_user.name, "email": current_user.email, "role": "Analyst"}
    }
