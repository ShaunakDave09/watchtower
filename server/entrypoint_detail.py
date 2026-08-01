"""Derives a FunnelDetailData-shaped payload for a single entry-point source.

Reuses the 4-stage (Visited/Signed up/Activated/Paid) breakdown already in
entrypoints.json's bySource list — the same shape the FunnelDetail page
consumes for the full 13-stage funnel, just scoped to one source. Fields
that aren't tracked per source (drop-off reasons, weekly trend, app/web
split, stuck users) are synthesized deterministically from the source's id
so the page reads as a real, stable dataset rather than reshuffling on
every request.
"""

import random

TIER_TIME_TO_CONVERT = {"high": 9.0, "mid": 12.0, "low": 15.5}

REASON_POOL = [
    ("Form validation errors", "danger"),
    ("Session timeout mid-step", "danger"),
    ("Abandoned after OTP prompt", "accent"),
    ("Payment method declined", "accent"),
    ("Slow network / page load timeout", "muted"),
    ("Browser or app compatibility issue", "faint"),
]

NAME_POOL = [
    ("Rahul Sharma", "rahul.s@gmail.com"),
    ("Priya Patel", "priya.p@outlook.com"),
    ("Amit Joshi", "amit.j@company.in"),
    ("Sneha Reddy", "sneha.r@gmail.com"),
    ("Vikram Singh", "v.singh@yahoo.com"),
    ("Ananya Iyer", "ananya.i@gmail.com"),
    ("Karan Mehta", "karan.m@outlook.com"),
    ("Neha Gupta", "neha.g@gmail.com"),
    ("Rohan Verma", "rohan.v@company.in"),
    ("Divya Nair", "divya.n@yahoo.com"),
]


def _tier(quality: float) -> str:
    if quality >= 10:
        return "high"
    if quality >= 5:
        return "mid"
    return "low"


def build_source_detail(funnel_id: str, funnel_name: str, source: dict) -> dict:
    rng = random.Random(f"{funnel_id}:{source['id']}")
    quality = source["quality"]
    tier = _tier(quality)
    stages_raw = source["stages"]

    visited = stages_raw[0]["users"]
    stages = []
    for i, s in enumerate(stages_raw):
        conv_pct = round(s["users"] / visited * 100, 1)
        if i == 0:
            drop_pct = None
        else:
            prev_users = stages_raw[i - 1]["users"]
            drop_pct = round(100 - s["users"] / prev_users * 100)
        stages.append(
            {
                "step": i + 1,
                "label": s["label"],
                "users": s["users"],
                "convPct": conv_pct,
                "dropPct": drop_pct,
            }
        )

    worst = max(stages[1:], key=lambda s: s["dropPct"] or 0)
    worst["worst"] = True
    worst_idx = stages.index(worst)
    prev_users = stages[worst_idx - 1]["users"]
    lost = prev_users - worst["users"]

    end_to_end_conv = stages[-1]["convPct"]
    time_to_convert = TIER_TIME_TO_CONVERT[tier] + rng.uniform(-0.8, 0.8)
    time_delta = rng.uniform(-1.0, 0.6)
    conv_delta_pt = rng.uniform(-2.5, 2.0)

    reasons_sample = rng.sample(REASON_POOL, 3)
    p1 = rng.randint(32, 46)
    p2 = rng.randint(20, 32)
    p3 = max(5, 100 - p1 - p2)
    reasons = [
        {"label": reasons_sample[0][0], "pct": p1, "tone": reasons_sample[0][1]},
        {"label": reasons_sample[1][0], "pct": p2, "tone": reasons_sample[1][1]},
        {"label": reasons_sample[2][0], "pct": p3, "tone": reasons_sample[2][1]},
    ]

    trend = []
    v = max(1.0, end_to_end_conv - rng.uniform(1.0, 2.5))
    for week in range(1, 8):
        v += rng.uniform(-0.4, 0.5)
        trend.append({"week": f"W{week}", "value": round(v, 1)})
    trend.append({"week": "W8", "value": end_to_end_conv})

    app_ratio = rng.uniform(1.25, 1.45)
    web_ratio = rng.uniform(0.55, 0.75)
    app_conv = round(end_to_end_conv * app_ratio, 1)
    web_conv = round(end_to_end_conv * web_ratio, 1)
    comparison_rows = []
    for i, s in enumerate(stages):
        app_pct = 100 if i == 0 else min(99, round(s["convPct"] * app_ratio, 1))
        web_pct = 100 if i == 0 else round(s["convPct"] * web_ratio, 1)
        comparison_rows.append(
            {
                "stage": s["label"],
                "app": f"{app_pct}%",
                "web": f"{web_pct}%",
                "danger": i == worst_idx,
            }
        )

    users_sample = rng.sample(NAME_POOL, 5)
    platforms = ["App", "Web"]
    statuses = ["Stuck", "Stuck", "Retrying"]
    users = []
    for i, (name, email) in enumerate(users_sample):
        platform = rng.choices(platforms, weights=[0.6, 0.4])[0]
        status = rng.choice(statuses)
        days = rng.randint(0, 5)
        hours = rng.randint(1, 23)
        time_in_stage = f"{days}d {hours}h" if days else f"{hours}h"
        users.append(
            {
                "id": f"{source['id']}-u{i + 1}",
                "name": name,
                "email": email,
                "currentStage": worst["label"],
                "stageTone": "danger",
                "timeInStage": time_in_stage,
                "platform": platform,
                "status": status,
            }
        )

    return {
        "id": source["id"],
        "name": f"{source['name']} entry point",
        "meta": f"4 stages · {funnel_name} funnel · {quality:.1f}% quality",
        "kpis": {
            "totalEntries": f"{visited:,}",
            "endToEndConv": f"{end_to_end_conv}%",
            "endToEndDelta": f"{'▲' if conv_delta_pt >= 0 else '▼'}{abs(conv_delta_pt):.1f}pt",
            "avgTimeToConvert": f"{time_to_convert:.1f}d",
            "avgTimeDelta": f"{'▲' if time_delta >= 0 else '▼'}{abs(time_delta):.1f}d",
            "biggestDropoffLabel": worst["label"],
            "biggestDropoffSub": f"↓{worst['dropPct']}% of users lost",
        },
        "stages": stages,
        "dropoffReasons": {
            "stageLabel": f"STAGE {worst['step']} · {worst['label'].upper()}",
            "reasons": reasons,
        },
        "trend": trend,
        "comparison": {
            "app": app_conv,
            "web": web_conv,
            "calloutHtml": f"App converts {round(app_conv / web_conv, 1)}× better than Web",
            "rows": comparison_rows,
        },
        "userTable": {
            "stageLabel": f"Users at stage {worst['step']} · {worst['label']}",
            "totalUsers": lost,
            "users": users,
            "page": 1,
            "pageCount": max(1, lost // 5),
        },
    }
