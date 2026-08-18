import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from backend.models import (
    SessionLocal, User, Conversation, Message, File,
    GeneratedDocument, Printer, PrintJob
)

def run_ai_feature_tests():
    client = TestClient(app)
    db = SessionLocal()

    print("=== 1. LOGGING IN AS ACTIVE USER (kelvin.m) ===")
    res = client.post("/api/auth/login", json={"username": "kelvin.m", "password": "Kelvin2026!"})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["token"]
    user_id = res.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Logged in as kelvin.m (ID: {user_id}). Token verified.")

    print("\n=== 2. TESTING AI CHAT WITH DATABASE QUERY ===")
    res = client.post(
        "/api/ai/chat",
        headers=headers,
        json={"prompt": "Query Database: How many active users are on this node and list departments?"}
    )
    assert res.status_code == 200, f"AI Chat query failed: {res.text}"
    chat_data = res.json()
    print("AI Reply:", chat_data["reply"])
    conv_id = chat_data["conversation_id"]
    assert conv_id is not None, "Conversation ID was not returned"

    # Verify conversation & messages saved in DB
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    assert conv is not None, "Conversation record missing in DB"
    assert len(conv.messages) >= 2, "Conversation should have user and AI messages"
    print(f"Verified Conversation #{conv_id} persisted with {len(conv.messages)} messages in DB.")

    print("\n=== 3. TESTING AI FILE SUMMARIZATION ===")
    res = client.post(
        "/api/ai/chat",
        headers=headers,
        json={
            "prompt": "Summarize PDF: Q3_Domestic_Revenue_Summary.pdf",
            "conversation_id": conv_id
        }
    )
    assert res.status_code == 200, f"Summarize request failed: {res.text}"
    sum_data = res.json()
    print("AI Summary Reply:", sum_data["reply"])
    assert sum_data.get("action", {}).get("type") == "file_summary"
    print("File summary action verified.")

    print("\n=== 4. TESTING AI DOCUMENT GENERATION (Word/Excel) ===")
    res = client.post(
        "/api/ai/chat",
        headers=headers,
        json={
            "prompt": "Write to Word: Draft quarterly network security and node uptime audit report",
            "conversation_id": conv_id
        }
    )
    assert res.status_code == 200, f"Doc generation chat failed: {res.text}"
    doc_chat_data = res.json()
    print("AI Doc Gen Reply:", doc_chat_data["reply"])
    assert doc_chat_data.get("action", {}).get("type") == "document_generated"
    gen_doc_id = doc_chat_data["action"]["doc_id"]

    # Rollback/close session to refresh MySQL REPEATABLE READ snapshot
    db.rollback()

    # Check generated_documents table
    gen_doc = db.query(GeneratedDocument).filter(GeneratedDocument.id == gen_doc_id).first()
    assert gen_doc is not None, f"Generated document #{gen_doc_id} record not found in DB"
    assert gen_doc.user_id == user_id, "Generated doc user_id mismatch"
    assert gen_doc.doc_type == "word"
    print(f"Verified GeneratedDocument #{gen_doc_id} ('{gen_doc.filename}') saved in DB.")

    print("\n=== 5. TESTING AI PRINT DISPATCH ===")
    res = client.post(
        "/api/ai/chat",
        headers=headers,
        json={
            "prompt": "Print Doc: Q3 Domestic Revenue Summary to Floor 2 printer",
            "conversation_id": conv_id
        }
    )
    assert res.status_code == 200, f"Print chat failed: {res.text}"
    print_chat_data = res.json()
    print("AI Print Reply:", print_chat_data["reply"])
    assert print_chat_data.get("action", {}).get("type") == "print_queued"
    job_id = print_chat_data["action"]["job_id"]

    db.rollback()
    # Check print_jobs table
    job = db.query(PrintJob).filter(PrintJob.id == job_id).first()
    assert job is not None, f"PrintJob #{job_id} not found in DB"
    assert job.user_id == user_id, "PrintJob user_id mismatch"
    assert job.status == "queued"
    print(f"Verified PrintJob #{job_id} queued in DB.")

    print("\n=== 6. TESTING DIRECT AUTOMATION CONVERT ENDPOINT ===")
    test_file = db.query(File).first()
    res = client.post(
        "/api/automation/convert",
        headers=headers,
        json={"file_id": test_file.id, "target_format": "pdf"}
    )
    assert res.status_code == 200, f"Convert endpoint failed: {res.text}"
    convert_data = res.json()
    print("Convert result:", convert_data["message"])
    assert convert_data["ok"] is True

    print("\n=== 7. TESTING DIRECT AUTOMATION PRINT ENDPOINT ===")
    test_printer = db.query(Printer).first()
    res = client.post(
        "/api/automation/print",
        headers=headers,
        json={"file_id": test_file.id, "printer_id": test_printer.id}
    )
    assert res.status_code == 200, f"Direct print failed: {res.text}"
    print_res_data = res.json()
    print("Direct Print result:", print_res_data["message"])
    assert print_res_data["ok"] is True

    print("\n=== 8. TESTING USER DOCUMENTS & PRINT QUEUE LIST ENDPOINTS ===")
    docs_res = client.get("/api/documents", headers=headers)
    assert docs_res.status_code == 200
    docs_list = docs_res.json()["documents"]
    print(f"Found {len(docs_list)} generated documents for user.")
    assert len(docs_list) >= 2

    jobs_res = client.get("/api/print-jobs", headers=headers)
    assert jobs_res.status_code == 200
    jobs_list = jobs_res.json()["print_jobs"]
    print(f"Found {len(jobs_list)} print jobs for user.")
    assert len(jobs_list) >= 2

    print("\n=== ALL AI & DATABASE AUTOMATION TESTS PASSED SUCCESSFULLY! ===")
    db.close()

if __name__ == "__main__":
    run_ai_feature_tests()
