from models import SessionLocal, User
from auth import hash_password

db = SessionLocal()

username = "admin"
password = "Admin123!"
name = "System Administrator"
dept = "Administration"

existing = db.query(User).filter_by(username=username).first()

if existing:
    print("Admin username already exists.")
else:
    admin = User(
        name=name,
        username=username,
        dept=dept,
        password_hash=hash_password(password),
        role="admin",
        status="active"
    )

    db.add(admin)
    db.commit()

    print("Admin account created successfully.")
    print("Username:", username)
    print("Password:", password)

db.close()