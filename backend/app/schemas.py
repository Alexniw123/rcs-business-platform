from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    role: str = "agent"

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    role: str
    is_active: bool = True

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    username: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProviderCreate(BaseModel):
    name: str
    provider_type: str = "sinch"
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    sender_id: Optional[str] = None

class CampaignCreate(BaseModel):
    name: str
    content: str

class InvoiceCreate(BaseModel):
    customer_name: str
    amount: float
    currency: str = "USD"
    status: str = "draft"
    due_date: Optional[str] = None
    notes: Optional[str] = None
    campaign_id: Optional[int] = None
