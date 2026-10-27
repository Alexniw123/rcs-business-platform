from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime
from typing import List
import io
import json
import os

from .db import Base, engine, SessionLocal
from .models import User, Provider, UserProvider, Campaign, Recipient, LogEntry, Invoice
from .schemas import UserCreate, UserLogin, UserOut, TokenOut, ProviderCreate, CampaignCreate, InvoiceCreate
from .security import create_access_token, get_current_user, require_role, get_db
from .services.sinch_service import send_sinch_message

app = FastAPI(title="RCS Business Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

Base.metadata.create_all(bind=engine)

def ensure_admin_user():
    db = SessionLocal()
    existing = db.query(User).filter(User.username == os.getenv("ADMIN_USERNAME", "admin")).first()
    if not existing:
        admin = User(
            username=os.getenv("ADMIN_USERNAME", "admin"),
            email="admin@local",
            password_hash=get_password_hash(os.getenv("ADMIN_PASSWORD", "admin123")),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
    db.close()

ensure_admin_user()

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/api/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/api/users", response_model=List[UserOut])
def list_users(current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    return db.query(User).all()

@app.post("/api/users", response_model=UserOut)
def create_user(payload: UserCreate, current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@app.post("/api/providers", response_model=dict)
def create_provider(payload: ProviderCreate, current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    provider = Provider(
        name=payload.name,
        provider_type=payload.provider_type,
        api_url=payload.api_url,
        api_key=payload.api_key,
        api_secret=payload.api_secret,
        sender_id=payload.sender_id,
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return {"id": provider.id, "name": provider.name}

@app.get("/api/providers")
def list_providers(current_user: User = Depends(require_role({"admin", "manager", "agent"})), db: Session = Depends(get_db)):
    return [
        {"id": p.id, "name": p.name, "provider_type": p.provider_type, "api_url": p.api_url, "sender_id": p.sender_id}
        for p in db.query(Provider).all()
    ]

@app.post("/api/users/{user_id}/assign-provider")
def assign_provider_to_user(user_id: int, provider_id: int, current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    existing = db.query(UserProvider).filter(UserProvider.user_id == user_id, UserProvider.provider_id == provider_id).first()
    if existing:
        return {"status": "already_assigned"}

    assigned = UserProvider(user_id=user_id, provider_id=provider_id)
    db.add(assigned)
    db.commit()
    return {"status": "assigned"}

def get_user_provider(db: Session, user_id: int):
    assigned = db.query(UserProvider).filter(UserProvider.user_id == user_id).first()
    if not assigned:
        return None
    return db.query(Provider).filter(Provider.id == assigned.provider_id).first()

@app.post("/api/campaigns")
def create_campaign(payload: CampaignCreate, current_user: User = Depends(require_role({"admin", "manager", "agent"})), db: Session = Depends(get_db)):
    campaign = Campaign(
        name=payload.name,
        content=payload.content,
        user_id=current_user.id,
        status="draft",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {"id": campaign.id, "name": campaign.name, "status": campaign.status}

@app.get("/api/campaigns")
def list_campaigns(current_user: User = Depends(require_role({"admin", "manager", "agent"})), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        campaigns = db.query(Campaign).all()
    else:
        campaigns = db.query(Campaign).filter(Campaign.user_id == current_user.id).all()

    return [
        {"id": c.id, "name": c.name, "content": c.content, "status": c.status, "created_at": c.created_at}
        for c in campaigns
    ]

@app.post("/api/campaigns/{campaign_id}/upload")
async def upload_campaign_csv(campaign_id: int, file: UploadFile = File(...), current_user: User = Depends(require_role({"admin", "manager", "agent"})), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    csv_data = (await file.read()).decode("utf-8-sig")
    rows = list(__import__("csv").DictReader(__import__("io").StringIO(csv_data)))

    for row in rows:
        phone = (row.get("phone") or row.get("mobile") or row.get("number") or "").strip()
        phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if not phone:
            continue

        recipient = Recipient(
            campaign_id=campaign.id,
            phone=phone,
            first_name=row.get("first_name") or row.get("firstname") or "",
            last_name=row.get("last_name") or row.get("lastname") or "",
            status="pending",
        )
        db.add(recipient)

    db.commit()
    return {"status": "uploaded", "count": len(rows)}

@app.post("/api/campaigns/{campaign_id}/send")
def send_campaign(campaign_id: int, current_user: User = Depends(require_role({"admin", "manager", "agent"})), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    provider = get_user_provider(db, current_user.id)
    if not provider:
        raise HTTPException(status_code=400, detail="No provider assigned to this user")

    recipients = db.query(Recipient).filter(Recipient.campaign_id == campaign.id).all()
    if not recipients:
        raise HTTPException(status_code=400, detail="No recipients found")

    for recipient in recipients:
        row = {
            "phone": recipient.phone,
            "first_name": recipient.first_name or "",
            "last_name": recipient.last_name or "",
        }

        text = campaign.content
        for key, value in row.items():
            text = text.replace("{" + key + "}", str(value))

        try:
            result = send_sinch_message(recipient.phone, text, provider)
            recipient.status = "sent"
            recipient.error = json.dumps(result)
            db.add(LogEntry(
                user_id=current_user.id,
                campaign_id=campaign.id,
                phone=recipient.phone,
                status="sent",
                response=json.dumps(result),
            ))
        except Exception as exc:
            recipient.status = "failed"
            recipient.error = str(exc)
            db.add(LogEntry(
                user_id=current_user.id,
                campaign_id=campaign.id,
                phone=recipient.phone,
                status="failed",
                response=str(exc),
            ))

    campaign.status = "sent"
    db.commit()
    return {"status": "sent", "count": len(recipients)}

@app.get("/api/campaigns/{campaign_id}/recipients")
def get_recipients(campaign_id: int, current_user: User = Depends(require_role({"admin", "manager", "agent"})), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id, Campaign.user_id == current_user.id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    recipients = db.query(Recipient).filter(Recipient.campaign_id == campaign.id).all()
    return [
        {"id": r.id, "phone": r.phone, "first_name": r.first_name, "last_name": r.last_name, "status": r.status, "error": r.error}
        for r in recipients
    ]

@app.get("/api/logs")
def get_logs(current_user: User = Depends(require_role({"admin", "manager", "agent"})), db: Session = Depends(get_db)):
    if current_user.role == "admin":
        logs = db.query(LogEntry).all()
    else:
        logs = db.query(LogEntry).filter(LogEntry.user_id == current_user.id).all()

    return [
        {"id": l.id, "user_id": l.user_id, "campaign_id": l.campaign_id, "phone": l.phone, "status": l.status, "response": l.response, "created_at": l.created_at}
        for l in logs
    ]

@app.post("/api/invoices")
def create_invoice(payload: InvoiceCreate, current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    invoice = Invoice(
        invoice_number=invoice_number,
        user_id=current_user.id,
        campaign_id=payload.campaign_id,
        customer_name=payload.customer_name,
        amount=payload.amount,
        currency=payload.currency,
        status=payload.status,
        due_date=datetime.strptime(payload.due_date, "%Y-%m-%d").replace(tzinfo=None) if payload.due_date else None,
        notes=payload.notes,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice

@app.get("/api/invoices")
def list_invoices(current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    invoices = db.query(Invoice).all()
    return [
        {"id": i.id, "invoice_number": i.invoice_number, "customer_name": i.customer_name, "amount": float(i.amount), "currency": i.currency, "status": i.status, "due_date": i.due_date, "notes": i.notes, "created_at": i.created_at}
        for i in invoices
    ]

@app.put("/api/invoices/{invoice_id}")
def update_invoice(invoice_id: int, payload: InvoiceCreate, current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.customer_name = payload.customer_name
    invoice.amount = payload.amount
    invoice.currency = payload.currency
    invoice.status = payload.status
    invoice.notes = payload.notes
    invoice.due_date = datetime.strptime(payload.due_date, "%Y-%m-%d").replace(tzinfo=None) if payload.due_date else None
    db.commit()
    return {"status": "updated"}

@app.get("/api/invoices/{invoice_id}")
def get_invoice(invoice_id: int, current_user: User = Depends(require_role({"admin", "manager"})), db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "customer_name": invoice.customer_name,
        "amount": float(invoice.amount),
        "currency": invoice.currency,
        "status": invoice.status,
        "due_date": invoice.due_date,
        "notes": invoice.notes,
        "created_at": invoice.created_at,
    }
