import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import text

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import (
    engine, Base, SessionLocal, User, Conversation, Message,
    File, GeneratedDocument, Printer, PrintJob, NodeSettings, AuditLog
)
from auth import hash_password

def sync_schema():
    """Align database schema and create missing columns/tables."""
    with engine.connect() as conn:
        # Check users table columns
        cols = [c[0] for c in conn.execute(text("DESCRIBE users")).fetchall()]
        if "created_at" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
            print("Added 'created_at' column to users table.")
        if "approval_feedback" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN approval_feedback TEXT NULL"))
            print("Added 'approval_feedback' column to users table.")
        conn.commit()

    Base.metadata.create_all(engine)
    print("Database tables verified and ready.")

def seed_database():
    sync_schema()
    db = SessionLocal()

    try:
        # Clear existing test data in child-to-parent order to avoid FK issues
        print("Clearing existing table records for fresh seeding...")
        db.query(AuditLog).delete()
        db.query(PrintJob).delete()
        db.query(GeneratedDocument).delete()
        db.query(Message).delete()
        db.query(Conversation).delete()
        db.query(File).delete()
        db.query(NodeSettings).delete()
        db.query(Printer).delete()
        db.query(User).delete()
        db.commit()

        # ============================================
        # 1. PRINTERS (4 printers)
        # ============================================
        printers = [
            Printer(name="HP LaserJet Enterprise M608", location="Floor 2 - Domestic Revenue", ip_address="192.168.1.101", status="online"),
            Printer(name="Canon imageRUNNER ADVANCE", location="Floor 3 - Customs and Border", ip_address="192.168.1.102", status="online"),
            Printer(name="Epson WorkForce Enterprise", location="Floor 1 - Taxpayer Hall", ip_address="192.168.1.103", status="online"),
            Printer(name="Brother HL-L6400DW Pro", location="Server Room - IT Dept", ip_address="192.168.1.104", status="offline"),
        ]
        db.add_all(printers)
        db.commit()
        for p in printers:
            db.refresh(p)
        print(f"Seeded {len(printers)} printers.")

        # ============================================
        # 2. NODE SETTINGS
        # ============================================
        settings = NodeSettings(
            id=1,
            node_address="http://localhost:8000",
            active_model="qwen3:1.7b",
            max_users=60,
            default_printer_id=printers[0].id
        )
        db.add(settings)
        db.commit()
        print("Seeded node settings.")

        # ============================================
        # 3. USERS (1 Admin + 4 Staff Users)
        # ============================================
        admin_user = User(
            name="System Administrator",
            username="admin",
            password_hash=hash_password("Admin123!"),
            dept="Administration and IT",
            role="admin",
            status="active",
            approval_feedback="System Default Administrator Account",
            created_at=datetime.utcnow()
        )

        user1 = User(
            name="Kelvin Mushi",
            username="kelvin.m",
            password_hash=hash_password("Kelvin2026!"),
            dept="IT & Systems",
            role="staff",
            status="active",
            approval_feedback="Approved by Admin: Granted full access to Network AI Node and IT tools.",
            created_at=datetime.utcnow()
        )

        user2 = User(
            name="Sarah Kimani",
            username="sarah.k",
            password_hash=hash_password("Sarah2026!"),
            dept="Domestic Revenue",
            role="staff",
            status="active",
            approval_feedback="Approved by Admin: Welcome to Domestic Revenue. Printer 1 assigned.",
            created_at=datetime.utcnow()
        )

        user3 = User(
            name="David Ochieng",
            username="david.o",
            password_hash=hash_password("David2026!"),
            dept="Customs & Border Control",
            role="staff",
            status="active",
            approval_feedback="Approved by Admin: Access to customs file repository and AI parser granted.",
            created_at=datetime.utcnow()
        )

        user4 = User(
            name="Amina Zaid",
            username="amina.z",
            password_hash=hash_password("Amina2026!"),
            dept="Taxpayer Services",
            role="staff",
            status="pending",
            approval_feedback=None,
            created_at=datetime.utcnow()
        )

        db.add_all([admin_user, user1, user2, user3, user4])
        db.commit()
        for u in [admin_user, user1, user2, user3, user4]:
            db.refresh(u)
        print(f"Seeded 1 Admin and 4 Users (Kelvin, Sarah, David, Amina).")

        # ============================================
        # 4. FILES (4 files linked to users)
        # ============================================
        files = [
            File(
                filename="Q3_Domestic_Revenue_Summary.pdf",
                filepath="/shared/revenue/Q3_Domestic_Revenue_Summary.pdf",
                file_type="pdf",
                size_kb=2450,
                uploaded_by=user2.id,
                dept="Domestic Revenue",
                created_at=datetime.utcnow()
            ),
            File(
                filename="Customs_Tariff_Schedule_2026.xlsx",
                filepath="/shared/customs/Customs_Tariff_Schedule_2026.xlsx",
                file_type="xlsx",
                size_kb=1820,
                uploaded_by=user3.id,
                dept="Customs & Border Control",
                created_at=datetime.utcnow()
            ),
            File(
                filename="AI_Office_Node_Architecture.docx",
                filepath="/shared/it/AI_Office_Node_Architecture.docx",
                file_type="docx",
                size_kb=950,
                uploaded_by=user1.id,
                dept="IT & Systems",
                created_at=datetime.utcnow()
            ),
            File(
                filename="Taxpayer_Charter_Guidelines.pdf",
                filepath="/shared/taxpayer/Taxpayer_Charter_Guidelines.pdf",
                file_type="pdf",
                size_kb=3100,
                uploaded_by=admin_user.id,
                dept="Administration and IT",
                created_at=datetime.utcnow()
            ),
        ]
        db.add_all(files)
        db.commit()
        for f in files:
            db.refresh(f)
        print(f"Seeded {len(files)} files linked to users.")

        # ============================================
        # 5. CONVERSATIONS (4 conversations linked to users)
        # ============================================
        convs = [
            Conversation(user_id=user1.id, title="Server Load & Ollama Latency Analysis"),
            Conversation(user_id=user2.id, title="Q3 Revenue Analysis & Chart Generation"),
            Conversation(user_id=user3.id, title="Customs Clearance Protocol Inquiry"),
            Conversation(user_id=admin_user.id, title="System Health & Security Audit"),
        ]
        db.add_all(convs)
        db.commit()
        for c in convs:
            db.refresh(c)
        print(f"Seeded {len(convs)} conversations linked to users.")

        # ============================================
        # 6. MESSAGES (8 messages linked to conversations)
        # ============================================
        messages = [
            Message(conversation_id=convs[0].id, sender="user", content="Can you analyze CPU utilization when 5 users query the local LLM concurrently?"),
            Message(conversation_id=convs[0].id, sender="ai", content="With Qwen 1.7B running on CPU, each inference consumes approx 1.2GB RAM. 5 concurrent users peak at ~6GB RAM with responsive throughput."),

            Message(conversation_id=convs[1].id, sender="user", content="Generate a summary table of domestic VAT collections for Q3 2026."),
            Message(conversation_id=convs[1].id, sender="ai", content="Summary of Q3 VAT Collections:\n- July: $14.2M\n- August: $15.8M\n- September: $16.4M\nTotal: $46.4M (+8.3% QoQ)."),

            Message(conversation_id=convs[2].id, sender="user", content="What are the mandatory import clearance documents for temperature-controlled pharma?"),
            Message(conversation_id=convs[2].id, sender="ai", content="Required documentation:\n1. Form C-14 Certificate\n2. Continuous Temperature Cold Chain Log\n3. TFDA Special Import Permit\n4. Master Air Waybill."),

            Message(conversation_id=convs[3].id, sender="user", content="Check node status and report active printer queues."),
            Message(conversation_id=convs[3].id, sender="ai", content="System Status: Nominal. 4 active staff accounts registered. 1 print job processing on Canon Floor 3."),
        ]
        db.add_all(messages)
        db.commit()
        print(f"Seeded {len(messages)} messages across conversations.")

        # ============================================
        # 7. GENERATED DOCUMENTS (4 documents linked to users)
        # ============================================
        docs = [
            GeneratedDocument(
                user_id=user1.id,
                doc_type="word",
                filename="IT_Infrastructure_Audit_Report.docx",
                source_prompt="Draft formal IT infrastructure report for node cluster",
                status="ready"
            ),
            GeneratedDocument(
                user_id=user2.id,
                doc_type="excel",
                filename="Q3_Revenue_Breakdown_Template.xlsx",
                source_prompt="Create Excel financial model for tax divisions",
                status="ready"
            ),
            GeneratedDocument(
                user_id=user3.id,
                doc_type="powerpoint",
                filename="Customs_Inspection_Briefing.pptx",
                source_prompt="Generate slide deck for border clearance workflow",
                status="ready"
            ),
            GeneratedDocument(
                user_id=admin_user.id,
                doc_type="word",
                filename="Annual_Security_Compliance_2026.docx",
                source_prompt="Draft annual compliance memo for department directors",
                status="ready"
            ),
        ]
        db.add_all(docs)
        db.commit()
        print(f"Seeded {len(docs)} generated documents linked to users.")

        # ============================================
        # 8. PRINT JOBS (4 print jobs linking users, files & printers)
        # ============================================
        jobs = [
            PrintJob(user_id=user1.id, file_id=files[2].id, printer_id=printers[3].id, status="done"),
            PrintJob(user_id=user2.id, file_id=files[0].id, printer_id=printers[0].id, status="printing"),
            PrintJob(user_id=user3.id, file_id=files[1].id, printer_id=printers[1].id, status="queued"),
            PrintJob(user_id=admin_user.id, file_id=files[3].id, printer_id=printers[2].id, status="queued"),
        ]
        db.add_all(jobs)
        db.commit()
        print(f"Seeded {len(jobs)} print jobs linking users, files, and printers.")

        # ============================================
        # 9. AUDIT LOGS (4 audit logs tracking user events and approvals)
        # ============================================
        logs = [
            AuditLog(
                actor_id=None,
                action="user_registered",
                target_user_id=user4.id,
                details="User amina.z registered from Taxpayer Services and is pending approval.",
                created_at=datetime.utcnow()
            ),
            AuditLog(
                actor_id=admin_user.id,
                action="user_approved",
                target_user_id=user1.id,
                details="Approved kelvin.m. Feedback: Granted full access to Network AI Node and IT tools.",
                created_at=datetime.utcnow()
            ),
            AuditLog(
                actor_id=admin_user.id,
                action="user_approved",
                target_user_id=user2.id,
                details="Approved sarah.k. Feedback: Welcome to Domestic Revenue. Printer 1 assigned.",
                created_at=datetime.utcnow()
            ),
            AuditLog(
                actor_id=admin_user.id,
                action="user_approved",
                target_user_id=user3.id,
                details="Approved david.o. Feedback: Access to customs file repository and AI parser granted.",
                created_at=datetime.utcnow()
            ),
        ]
        db.add_all(logs)
        db.commit()
        print(f"Seeded {len(logs)} audit logs.")

        print("\n=== ALL 9 DATABASE TABLES SUCCESSFULLY SEEDED WITH 4 USERS AND LINKED DATA ===")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
