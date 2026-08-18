from models import SessionLocal, File, GeneratedDocument, PrintJob

def get_files_context(db, dept: str = None, limit: int = 20) -> str:
    """Fetches files from the database and turns them into plain text for the AI."""
    query = db.query(File)
    if dept:
        query = query.filter(File.dept == dept)
    files = query.limit(limit).all()

    if not files:
        return "No matching files found in the system."

    lines = []
    for f in files:
        lines.append(f"- {f.filename} ({f.file_type}, {f.size_kb}KB) in {f.dept}, path: {f.filepath}")
    return "\n".join(lines)