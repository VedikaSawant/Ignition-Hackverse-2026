from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserCreate, UserLogin, UserUpdate, UserOut, Token
from auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    linked_cg_id = None
    linked_doc_id = None

    if data.linked_caregiver_email:
        cg = db.query(User).filter(User.email == data.linked_caregiver_email, User.role == "caregiver").first()
        if cg:
            linked_cg_id = cg.id

    if data.linked_doctor_email:
        doc = db.query(User).filter(User.email == data.linked_doctor_email, User.role == "doctor").first()
        if doc:
            linked_doc_id = doc.id

    user = User(
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=data.role,
        age=data.age,
        phone=data.phone,
        conditions=data.conditions or "",
        linked_caregiver_id=linked_cg_id,
        linked_doctor_id=linked_doc_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.put("/me", response_model=UserOut)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data.name is not None:
        current_user.name = data.name
    if data.age is not None:
        current_user.age = data.age
    if data.phone is not None:
        current_user.phone = data.phone
    if data.conditions is not None:
        current_user.conditions = data.conditions
    if data.profile_photo_url is not None:
        current_user.profile_photo_url = data.profile_photo_url

    if data.linked_caregiver_email:
        cg = db.query(User).filter(User.email == data.linked_caregiver_email, User.role == "caregiver").first()
        if cg:
            current_user.linked_caregiver_id = cg.id

    if data.linked_doctor_email:
        doc = db.query(User).filter(User.email == data.linked_doctor_email, User.role == "doctor").first()
        if doc:
            current_user.linked_doctor_id = doc.id

    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.post("/demo-login", response_model=Token)
def demo_login(role: str = "patient", db: Session = Depends(get_db)):
    """Quick demo login for hackathon judges."""
    email_map = {
        "patient": "patient@demo.com",
        "caregiver": "caregiver@demo.com",
        "doctor": "doctor@demo.com",
    }
    email = email_map.get(role, "patient@demo.com")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo user not found. Please restart the server to seed data.")

    token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))
