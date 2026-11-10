
import os
from pathlib import Path
from getpass import getpass

from dotenv import load_dotenv
from sqlalchemy import func
from sqlalchemy.engine import make_url

# --------------------------------------------------
# 1. Load environment variables
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

# Load existing application settings first.
load_dotenv(BASE_DIR / ".env")

# Override DATABASE_URL with the dedicated Neon URL.
load_dotenv(BASE_DIR / ".env.neon", override=True)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing.")

# Ensure this script cannot accidentally target a local DB.
parsed_url = make_url(DATABASE_URL)
hostname = parsed_url.host or ""

if not hostname.endswith(".neon.tech"):
    raise RuntimeError(
        "Safety check failed: DATABASE_URL is not a Neon hostname."
    )

# --------------------------------------------------
# 2. Import existing application components
# --------------------------------------------------

from app.database import SessionLocal
from app.models.user import User
from app.models.notification_preference import NotificationPreference
from app.auth.security import hash_password

# --------------------------------------------------
# 3. Account details
# --------------------------------------------------

FULL_NAME = "Goutam Barman"
EMAIL = "goutam99store@gmail.com"
PHONE = "9733131070"
ROLE = "super_admin"


def main():
    print("\nG-MART SUPER ADMIN CREATION")
    print("---------------------------")
    print(f"Name:  {FULL_NAME}")
    print(f"Email: {EMAIL}")
    print(f"Phone: {PHONE}")
    print(f"Role:  {ROLE}")
    print(f"Database host: {hostname}")

    password = getpass("\nEnter a strong password: ")
    confirm_password = getpass("Confirm your password: ")

    if not password:
        raise ValueError("Password cannot be empty.")

    if len(password) < 12:
        raise ValueError("Use a password with at least 12 characters.")

    if password != confirm_password:
        raise ValueError("Passwords do not match.")

    db = SessionLocal()

    try:
        # Check whether the email already exists.
        existing_email = db.query(User).filter(
            func.lower(User.email) == EMAIL.lower()
        ).first()

        if existing_email:
            raise RuntimeError(
                "This email already exists. No account was changed."
            )

        # Check whether the phone number already exists.
        existing_phone = db.query(User).filter(
            User.phone == PHONE
        ).first()

        if existing_phone:
            raise RuntimeError(
                "This phone number already exists. No account was changed."
            )

        # Create the Super Admin using the app's own password hashing.
        new_user = User(
            full_name=FULL_NAME,
            email=EMAIL,
            phone=PHONE,
            hashed_password=hash_password(password),
            role=ROLE,
            is_active=True,
            section_permissions={}
        )

        db.add(new_user)
        db.flush()

        # Create notification preferences, matching normal registration.
        preferences = NotificationPreference(
            user_id=new_user.id,
            in_app_enabled=True,
            email_enabled=True,
            sms_enabled=True
        )

        db.add(preferences)
        db.commit()

        print("\nSUCCESS! Super Admin account created.")
        print(f"User ID: {new_user.id}")
        print(f"Email: {new_user.email}")
        print(f"Role: {new_user.role}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
