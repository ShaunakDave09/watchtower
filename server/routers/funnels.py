import json
from pathlib import Path

from fastapi import APIRouter

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

router = APIRouter(prefix="/api", tags=["funnels"])


@router.get("/funnels/{funnel_id}")
def get_funnel_detail(funnel_id: str) -> dict:
    funnels = json.loads((FIXTURES_DIR / "funnel_detail.json").read_text())
    return funnels.get(funnel_id, funnels["guest-checkout"])
