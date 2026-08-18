import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, Enum, TIMESTAMP, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_NAME = os.getenv("DB_NAME")

engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}")
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ============================================
# 1. USERS — login, registration, admin approval
# ============================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    dept = Column(String(100))
    role = Column(Enum("staff", "admin"), default="staff")
    status = Column(Enum("pending", "active", "removed"), default="pending")
    approval_feedback = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    generated_documents = relationship("GeneratedDocument", back_populates="user", cascade="all, delete-orphan")
    print_jobs = relationship("PrintJob", back_populates="user", cascade="all, delete-orphan")


# ============================================
# 2. CONVERSATIONS — groups chat messages per session
# ============================================
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(150), default="New chat")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


# ============================================
# 3. MESSAGES — the actual chat turns (AI Chat feature)
# ============================================
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender = Column(Enum("user", "ai"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


# ============================================
# 4. FILES — File Search feature (indexes office documents)
# ============================================
class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    file_type = Column(String(20))
    size_kb = Column(Integer)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    dept = Column(String(100))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    uploader = relationship("User")
    print_jobs = relationship("PrintJob", back_populates="file")


# ============================================
# 5. GENERATED_DOCUMENTS — Automation feature (Word/Excel/PPT creation)
# ============================================
class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doc_type = Column(Enum("word", "excel", "powerpoint"), nullable=False)
    filename = Column(String(255), nullable=False)
    source_prompt = Column(Text)
    status = Column(Enum("processing", "ready", "failed"), default="processing")
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    user = relationship("User", back_populates="generated_documents")


# ============================================
# 6. PRINTERS — Admin-managed printer list
# ============================================
class Printer(Base):
    __tablename__ = "printers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100))
    ip_address = Column(String(50))
    status = Column(Enum("online", "offline"), default="online")

    print_jobs = relationship("PrintJob", back_populates="printer")


# ============================================
# 7. PRINT_JOBS — Print-from-chat feature
# ============================================
class PrintJob(Base):
    __tablename__ = "print_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="SET NULL"))
    printer_id = Column(Integer, ForeignKey("printers.id", ondelete="SET NULL"))
    status = Column(Enum("queued", "printing", "done", "failed"), default="queued")
    requested_at = Column(TIMESTAMP, default=datetime.utcnow)

    user = relationship("User", back_populates="print_jobs")
    file = relationship("File", back_populates="print_jobs")
    printer = relationship("Printer", back_populates="print_jobs")


# ============================================
# 8. NODE_SETTINGS — Admin panel: network/model/max-users settings
# Single-row "settings" table — one row holds current config
# ============================================
class NodeSettings(Base):
    __tablename__ = "node_settings"

    id = Column(Integer, primary_key=True, default=1)
    node_address = Column(String(100), default="localhost:8000")
    active_model = Column(String(50), default="qwen3:1.7b")
    max_users = Column(Integer, default=60)
    default_printer_id = Column(Integer, ForeignKey("printers.id", ondelete="SET NULL"))

    default_printer = relationship("Printer")


# ============================================
# 9. AUDIT_LOGS — tracks approvals, removals, logins (admin accountability)
# ============================================
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    action = Column(String(100), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"))
    details = Column(String(255))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    actor = relationship("User", foreign_keys=[actor_id])
    target_user = relationship("User", foreign_keys=[target_user_id])


# Creates any tables that don't already exist yet — safe to run even if some
# tables (from your earlier raw SQL) are already there.
if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("All tables created (or already existed) successfully.")