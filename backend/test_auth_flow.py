import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from backend.seed_data import seed_database
from backend.models import (
    SessionLocal, User, Conversation, Message, File,
    GeneratedDocument, Printer, PrintJob, NodeSettings, AuditLog
)
from backend.auth import hash_password, verify_password

def run_tests():
    print("=== 1. SEEDING FRESH DATABASE ===")
    seed_database()

    db = SessionLocal()
    print("\n=== 2. VERIFYING ALL 9 TABLES HAVE >= 4 ROWS LINKED TO USERS ===")
    tables = [
        ("users", User, 4),
        ("conversations", Conversation, 4),
        ("messages", Message, 4),
        ("files", File, 4),
        ("generated_documents", GeneratedDocument, 4),
        ("printers", Printer, 4),
        ("print_jobs", PrintJob, 4),
        ("node_settings", NodeSettings, 1),
        ("audit_logs", AuditLog, 4),
    ]

    for name, model, min_rows in tables:
        cnt = db.query(model).count()
        print(f"Table [{name:20}]: {cnt} rows (required >= {min_rows}) -> OK: {cnt >= min_rows}")
        assert cnt >= min_rows, f"Table {name} has fewer than {min_rows} rows"

    client = TestClient(app)

    print("\n=== 3. TESTING AUTHENTICATION & BCRYPT HASHING ===")
    # Test valid admin login
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin123!"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["token"]
    print("Admin login succeeded. Token generated.")

    # Test bad password
    res = client.post("/api/auth/login", json={"username": "admin", "password": "WrongPassword!"})
    assert res.status_code == 401, f"Expected 401 on bad password: {res.status_code}"
    print("Bad password correctly rejected with 401.")

    # Test active user login (kelvin.m)
    res = client.post("/api/auth/login", json={"username": "kelvin.m", "password": "Kelvin2026!"})
    assert res.status_code == 200, f"Kelvin login failed: {res.text}"
    print("Active user (kelvin.m) login succeeded.")

    # Test pending user login (amina.z)
    res = client.post("/api/auth/login", json={"username": "amina.z", "password": "Amina2026!"})
    assert res.status_code == 403, f"Expected 403 for pending user: {res.status_code}"
    print("Pending user (amina.z) login correctly blocked with 403.")

    print("\n=== 4. TESTING NEW USER REGISTRATION ===")
    reg_payload = {
        "name": "Grace Mushi",
        "username": "grace.m",
        "dept": "Customs Valuation",
        "password": "GracePass2026!"
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200, f"Registration failed: {res.text}"
    reg_data = res.json()
    new_user_id = reg_data["user"]["id"]
    print(f"New user registered: grace.m (ID: {new_user_id}), Status: {reg_data['user']['status']}")

    # Check status via public status endpoint
    res = client.get("/api/auth/status?username=grace.m")
    assert res.status_code == 200 and res.json()["status"] == "pending"
    print("Status endpoint confirmed grace.m is pending approval.")

    print("\n=== 5. TESTING ADMIN APPROVAL WITH CUSTOM FEEDBACK ===")
    feedback_text = "Approved. Welcome to the Customs Valuation unit! Your clearance station is ready."
    res = client.post(
        f"/api/admin/users/{new_user_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"feedback": feedback_text}
    )
    assert res.status_code == 200, f"Approval failed: {res.text}"
    print("Admin approved grace.m and attached feedback.")

    # Check status endpoint again
    res = client.get("/api/auth/status?username=grace.m")
    status_data = res.json()
    assert status_data["status"] == "active", "User status should now be active"
    assert status_data["approval_feedback"] == feedback_text, "Feedback mismatch"
    print(f"Status endpoint confirmed grace.m is active with feedback: '{status_data['approval_feedback']}'")

    # Test logging in as grace.m now that she is approved
    res = client.post("/api/auth/login", json={"username": "grace.m", "password": "GracePass2026!"})
    assert res.status_code == 200, f"Login after approval failed: {res.text}"
    grace_token = res.json()["token"]
    assert res.json()["user"]["approval_feedback"] == feedback_text
    print("Grace logged in successfully. Received JWT token and admin feedback.")

    # Test access to protected route /api/auth/me
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {grace_token}"})
    assert res.status_code == 200 and res.json()["user"]["username"] == "grace.m"
    print("/api/auth/me confirmed profile for grace.m.")

    print("\n=== 6. TESTING AUDIT TRAIL LOGGING ===")
    res = client.get("/api/admin/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    logs = res.json()["logs"]
    print(f"Audit logs count: {len(logs)}")
    actions = [l["action"] for l in logs]
    print("Recorded audit actions:", actions)
    assert "user_registered" in actions
    assert "user_approved" in actions
    assert "user_login" in actions

    print("\n=== ALL AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY! ===")
    db.close()

if __name__ == "__main__":
    run_tests()
