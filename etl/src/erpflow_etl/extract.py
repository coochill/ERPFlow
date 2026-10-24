from pathlib import Path
import pandas as pd

SUPPORTED_EXTENSIONS = {".csv", ".xlsx"}


def extract_file(file_path: str | Path) -> pd.DataFrame:
    """Read a supported CSV or Excel file into a DataFrame."""
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    if not path.is_file():
        raise ValueError(f"Input path is not a file: {path}")

    extension = path.suffix.lower()

    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {extension or '(no extension)'}. "
            "Supported types: CSV, XLSX."
        )

    if extension == ".csv":
        return pd.read_csv(path)

    return pd.read_excel(path, engine="openpyxl")
