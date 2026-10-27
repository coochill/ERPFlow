import json
import os
import secrets
import shutil
import time
import uuid
from pathlib import Path
import re
import pandas as pd

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status

from erpflow_etl.extract import extract_file
from erpflow_etl.transform import transform_inventory
from erpflow_etl.validate import validate_inventory

app = FastAPI(
    title="ERPFlow ETL API",
    description="Internal inventory data import service.",
    version="1.0.0",
)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_PREVIEW_ROWS = 100
MAX_IMPORT_ROWS = 500
PREVIEW_TTL_SECONDS = 60 * 60  # 1 hour
SUPPORTED_EXTENSIONS = {".csv", ".xlsx"}

PREVIEW_DIR = Path(
    os.getenv("ETL_PREVIEW_DIR", "/app/data/previews")
)


def require_service_token(
    authorization: str | None = Header(default=None),
) -> None:
    expected_token = os.getenv("ETL_SERVICE_TOKEN")

    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ETL service authentication is not configured.",
        )

    scheme, separator, supplied_token = (
        authorization or ""
    ).partition(" ")

    if (
        not separator
        or scheme.lower() != "bearer"
        or not supplied_token
        or not secrets.compare_digest(supplied_token, expected_token)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def cleanup_expired_previews() -> None:
    """Remove expired previews and abandoned temporary uploads."""
    if not PREVIEW_DIR.exists():
        return

    now = time.time()

    for entry in PREVIEW_DIR.iterdir():
        try:
            if entry.is_file() and entry.name.startswith(".upload-"):
                if now - entry.stat().st_mtime > PREVIEW_TTL_SECONDS:
                    entry.unlink(missing_ok=True)
                continue

            if not entry.is_dir():
                continue

            metadata_path = entry / "metadata.json"

            if not metadata_path.is_file():
                if now - entry.stat().st_mtime > PREVIEW_TTL_SECONDS:
                    shutil.rmtree(entry, ignore_errors=True)
                continue

            metadata = json.loads(metadata_path.read_text("utf-8"))

            if metadata.get("expires_at", 0) <= now:
                shutil.rmtree(entry, ignore_errors=True)

        except (OSError, ValueError, json.JSONDecodeError):
            # Leave entries untouched if cleanup cannot safely inspect them.
            continue


def preview_records(data):
    """Convert a DataFrame into JSON-safe records."""
    return json.loads(
        data.head(MAX_PREVIEW_ROWS).to_json(orient="records")
    )


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "erpflow-etl"}


@app.get(
    "/internal/health",
    dependencies=[Depends(require_service_token)],
)
def internal_health_check():
    return {"status": "ok", "service": "erpflow-etl"}


@app.post(
    "/internal/inventory/previews",
    dependencies=[Depends(require_service_token)],
)
async def create_inventory_preview(file: UploadFile = File(...)):
    """Upload and validate inventory data without importing it."""
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    cleanup_expired_previews()

    original_filename = Path(file.filename or "").name
    extension = Path(original_filename).suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Upload a CSV or XLSX file.",
        )

    upload_id = uuid.uuid4().hex
    temporary_path = PREVIEW_DIR / f".upload-{upload_id}{extension}"
    job_id = uuid.uuid4().hex
    job_dir = PREVIEW_DIR / job_id

    size = 0

    try:
        # Stream to disk so the entire upload is not held in memory.
        with temporary_path.open("wb") as destination:
            while True:
                chunk = await file.read(64 * 1024)

                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail="File exceeds the 5 MB upload limit.",
                    )

                destination.write(chunk)

        if size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded file is empty.",
            )

        extracted = extract_file(temporary_path)
        transformed = transform_inventory(extracted)
        valid_rows, invalid_rows = validate_inventory(transformed)

        job_dir.mkdir(parents=True, exist_ok=False)

        valid_rows.to_csv(job_dir / "valid.csv", index=False)
        invalid_rows.to_csv(job_dir / "invalid.csv", index=False)

        created_at = time.time()
        metadata = {
            "job_id": job_id,
            "source_filename": original_filename,
            "created_at": created_at,
            "expires_at": created_at + PREVIEW_TTL_SECONDS,
            "total_rows": len(extracted),
            "valid_rows": len(valid_rows),
            "invalid_rows": len(invalid_rows),
        }

        (job_dir / "metadata.json").write_text(
            json.dumps(metadata),
            encoding="utf-8",
        )

        return {
            **metadata,
            "preview_limit": MAX_PREVIEW_ROWS,
            "valid_preview": preview_records(valid_rows),
            "invalid_preview": preview_records(invalid_rows),
        }

    except HTTPException:
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)
        raise

    except (ValueError, OSError) as error:
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to process the inventory file: {error}",
        ) from error

    except Exception as error:
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unable to read the uploaded file. "
                "Check that it is a valid CSV or XLSX file."
            ),
        ) from error

    finally:
        temporary_path.unlink(missing_ok=True)
        await file.close()


@app.get(
    "/internal/inventory/previews/{job_id}/records",
    dependencies=[Depends(require_service_token)],
)
def get_inventory_preview_records(job_id: str):
    """Return stored valid records for Laravel to import."""
    if not re.fullmatch(r"[a-f0-9]{32}", job_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid preview job ID.",
        )

    cleanup_expired_previews()

    job_dir = PREVIEW_DIR / job_id
    metadata_path = job_dir / "metadata.json"
    valid_csv_path = job_dir / "valid.csv"

    if not metadata_path.is_file() or not valid_csv_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preview not found or expired. Upload the file again.",
        )

    try:
        metadata = json.loads(metadata_path.read_text("utf-8"))

        if metadata.get("expires_at", 0) <= time.time():
            shutil.rmtree(job_dir, ignore_errors=True)
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Preview expired. Upload the file again.",
            )

        valid_count = int(metadata.get("valid_rows", 0))

        if valid_count > MAX_IMPORT_ROWS:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=(
                    f"This preview contains {valid_count} valid rows. "
                    f"The maximum import size is {MAX_IMPORT_ROWS}."
                ),
            )

        dataframe = pd.read_csv(valid_csv_path)
        records = json.loads(dataframe.to_json(orient="records"))

        if len(records) != valid_count:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Stored preview record count does not match metadata.",
            )

        return {
            "job_id": job_id,
            "source_filename": metadata["source_filename"],
            "total_rows": metadata["total_rows"],
            "valid_rows": valid_count,
            "invalid_rows": metadata["invalid_rows"],
            "records": records,
        }

    except HTTPException:
        raise
    except (OSError, ValueError, KeyError, pd.errors.ParserError) as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve the stored preview records.",
        ) from error
