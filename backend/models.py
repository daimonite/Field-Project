from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine("sqlite:///./ai_office.db")
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    username = Column(String, unique=True)
    password_hash = Column(String)
    dept = Column(String)
    role = Column(String, default="staff")     # "staff" or "admin"
    status = Column(String, default="pending")  # "pending", "active", "removed"

Base.metadata.create_all(engine)