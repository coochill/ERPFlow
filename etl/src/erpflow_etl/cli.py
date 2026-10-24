import argparse
import json
import os
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

from erpflow_etl.pipeline import run_pipeline


ETL_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ETL_ROOT / ".env")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Extract, transform, validate, and optionally import ERPFlow inventory."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to the source CSV or XLSX file.",
    )
    parser.add_argument(
        "--output",
        default=str(ETL_ROOT / "data" / "output"),
        help="Directory for validation and import reports.",
    )
    parser.add_argument(
        "--load-to-api",
        action="store_true",
        help="Explicitly enable importing valid rows into ERPFlow.",
    )
    parser.add_argument(
        "--api-base-url",
        default=os.getenv("ERP_API_BASE_URL"),
        help="ERP API base URL; defaults to ERP_API_BASE_URL.",
    )
    parser.add_argument(
        "--api-token",
        default=os.getenv("ERP_API_TOKEN"),
        help="Optional API token; defaults to ERP_API_TOKEN.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Rows per API request (1–500).",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.load_to_api and not args.api_base_url:
        parser.error(
            "--load-to-api requires --api-base-url or ERP_API_BASE_URL in .env."
        )

    if not 1 <= args.batch_size <= 500:
        parser.error("--batch-size must be between 1 and 500.")

    try:
        result = run_pipeline(
            input_path=args.input,
            output_dir=args.output,
            load_to_api=args.load_to_api,
            api_base_url=args.api_base_url if args.load_to_api else None,
            api_token=args.api_token if args.load_to_api else None,
            batch_size=args.batch_size,
        )
    except (OSError, ValueError, requests.RequestException) as exc:
        print(f"ETL failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
