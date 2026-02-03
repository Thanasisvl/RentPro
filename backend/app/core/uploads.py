from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5MB


def get_upload_root() -> Path:
    root = os.getenv("RENTPRO_UPLOAD_DIR", "./uploads")
    return Path(root).resolve()


def _ensure_within_root(root: Path, target: Path) -> None:
    root = root.resolve()
    target = target.resolve()
    if root not in target.parents and root != target:
        raise HTTPException(status_code=400, detail="Invalid upload path")


def contract_pdf_destination(contract_id: int) -> tuple[Path, str]:
    """
    Returns (absolute_dest_path, relative_path_to_store_in_db)
    """
    root = get_upload_root()
    rel_dir = Path("contracts")
    filename = f"contract_{contract_id}_{uuid4().hex}.pdf"
    rel_path = rel_dir / filename
    abs_path = (root / rel_path).resolve()
    _ensure_within_root(root, abs_path)
    return abs_path, rel_path.as_posix()


async def save_pdf_upload(
    upload: UploadFile,
    dest_abs_path: Path,
    *,
    max_bytes: int = DEFAULT_MAX_UPLOAD_BYTES,
) -> None:
    """
    Streams upload to disk, enforces:
      - header content-type sanity
      - PDF magic bytes sniffing
      - max size
      - atomic write (tmp then replace)
    """
    # weak signal: Content-Type header
    if upload.content_type not in (None, "", "application/pdf"):
        raise HTTPException(status_code=415, detail="Only application/pdf is allowed")

    dest_abs_path.parent.mkdir(parents=True, exist_ok=True)

    tmp_path = dest_abs_path.with_suffix(dest_abs_path.suffix + ".tmp")

    total = 0
    seen_header = b""
    try:
        with open(tmp_path, "wb") as f:
            while True:
                chunk = await upload.read(64 * 1024)
                if not chunk:
                    break

                if total == 0:
                    # collect enough bytes to sniff
                    seen_header = chunk[:8]

                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(status_code=413, detail="File too large")

                f.write(chunk)

        # sniff: PDF files start with "%PDF-"
        if not seen_header.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail="File is not a valid PDF")

        # atomic replace
        os.replace(tmp_path, dest_abs_path)

    finally:
        # best-effort cleanup
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except OSError:
            pass
        await upload.close()
