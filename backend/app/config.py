import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "RCS Business Platform"
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/rcsdb")
    jwt_secret: str = os.getenv("JWT_SECRET", "change_me")
    jwt_algorithm: str = "HS256"
    admin_username: str = os.getenv("ADMIN_USERNAME", "admin")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "admin123")

settings = Settings()
