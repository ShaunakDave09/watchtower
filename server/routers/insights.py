import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from server.entrypoint_detail import build_source_detail

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

router = APIRouter(prefix="/api", tags=["insights"])


@router.get("/funnels/{funnel_id}/entrypoints")
def get_funnel_entrypoints(funnel_id: str) -> dict:
    entrypoints = json.loads((FIXTURES_DIR / "entrypoints.json").read_text())
    return entrypoints.get(funnel_id, entrypoints["guest-checkout"])


@router.get("/funnels/{funnel_id}/entrypoints/{source_id}")
def get_entrypoint_source_detail(funnel_id: str, source_id: str) -> dict:
    entrypoints = json.loads((FIXTURES_DIR / "entrypoints.json").read_text())
    funnel = entrypoints.get(funnel_id, entrypoints["guest-checkout"])
    source = next((s for s in funnel["bySource"] if s["id"] == source_id), None)
    if source is None:
        raise HTTPException(status_code=404, detail=f"Unknown entry point source: {source_id}")
    return build_source_detail(funnel_id, funnel["funnelName"], source)


@router.get("/funnels/{funnel_id}/compare")
def get_funnel_comparison(funnel_id: str) -> dict:
    comparisons = json.loads((FIXTURES_DIR / "comparison.json").read_text())
    return comparisons.get(funnel_id, comparisons["guest-checkout"])


@router.get("/trends")
def get_trends() -> dict:
    return json.loads((FIXTURES_DIR / "trends.json").read_text())


@router.get("/alerts")
def get_alerts() -> dict:
    return json.loads((FIXTURES_DIR / "alerts.json").read_text())
