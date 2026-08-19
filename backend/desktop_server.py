"""Entry point for the packaged macOS desktop app.

Runs the Alembic migrations against the writable desktop database and then
serves the FastAPI app (API + built frontend) on 127.0.0.1.

Expected environment (set by the Electron main process):
    DRESSUP_PORT     port to bind to
    DATABASE_URL     sqlite URL inside Application Support
    UPLOAD_DIR       writable uploads folder
    FRONTEND_DIST    folder with the built frontend (enables the SPA mount)
"""

import logging
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

logger = logging.getLogger("dressup.desktop")


def run_migrations() -> None:
    from alembic import command
    from alembic.config import Config

    config = Config(os.path.join(BASE_DIR, "alembic.ini"))
    config.set_main_option("script_location", os.path.join(BASE_DIR, "alembic"))
    command.upgrade(config, "head")


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    port = int(os.getenv("DRESSUP_PORT", "8000"))
    os.chdir(BASE_DIR)

    try:
        run_migrations()
    except Exception:
        logger.exception("Database migration failed")
        return 1

    import uvicorn

    from main import app

    logger.info("dressup.exe backend listening on 127.0.0.1:%s", port)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    return 0


if __name__ == "__main__":
    sys.exit(main())
