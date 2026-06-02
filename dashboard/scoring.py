from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Dict, Iterable, Optional, Tuple

import pandas as pd


REQUIRED_COLUMNS = [
    "Record ID",
    "Deal Name",
    "Create Date",
    "Deal Stage",
    "Revised number of employees",
    "Amount",
    "Next step",
    "Number of Sales Activities",
]


STAGE_WEIGHTS_DEFAULT: Dict[str, float] = {
    "Economical Allignment Started": 1.00,
    "Demo Booked": 0.85,
    "Factorial Project Alignment started": 0.70,
    "To reschedule": 0.50,
    "On Hold": 0.35,
    "New Deals": 0.20,
}


@dataclass(frozen=True)
class ScoringConfig:
    today: pd.Timestamp
    stage_weights: Dict[str, float]
    weights: Dict[str, float]
    stale_days: int = 90
    very_stale_days: int = 180


def default_config(today: Optional[pd.Timestamp] = None) -> ScoringConfig:
    if today is None:
        today = pd.Timestamp.today().normalize()

    weights = {
        "amount": 0.30,
        "employees": 0.25,
        "stage": 0.20,
        "activities": 0.15,
        "next_step": 0.10,
    }

    return ScoringConfig(
        today=today,
        stage_weights=dict(STAGE_WEIGHTS_DEFAULT),
        weights=weights,
    )


def validate_columns(df: pd.DataFrame, required: Iterable[str] = REQUIRED_COLUMNS) -> None:
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            "Missing required columns in export: "
            + ", ".join(missing)
            + ". Export again from HubSpot with these fields."
        )


def _to_float(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _norm_0_1(series: pd.Series) -> pd.Series:
    s = _to_float(series).copy()
    s = s.fillna(0.0)
    mx = float(s.max()) if len(s) else 0.0
    mn = float(s.min()) if len(s) else 0.0
    if mx == mn:
        return s * 0.0
    return (s - mn) / (mx - mn)


_RISK_NEXT_STEP_RE = re.compile(r"\b(?:TBD|cold|unclear)\b", re.IGNORECASE)


def add_scoring_columns(df: pd.DataFrame, cfg: Optional[ScoringConfig] = None) -> pd.DataFrame:
    """
    Returns a copy with:
      - days_open
      - has_amount, has_next_step
      - stage_weight
      - flags: flag_stale, flag_very_stale, flag_risky_next_step
      - priority_score_0_100
      - queues: queue_close_30d, queue_unblock_high_value, queue_activate_backlog
    """
    if cfg is None:
        cfg = default_config()

    validate_columns(df)

    out = df.copy()
    out["Create Date"] = pd.to_datetime(out["Create Date"], errors="coerce")
    out["Amount"] = _to_float(out["Amount"])
    out["Revised number of employees"] = _to_float(out["Revised number of employees"])
    out["Number of Sales Activities"] = _to_float(out["Number of Sales Activities"]).fillna(0)

    out["days_open"] = (cfg.today - out["Create Date"]).dt.days
    out["has_amount"] = out["Amount"].notna()
    out["has_next_step"] = out["Next step"].notna() & (out["Next step"].astype(str).str.strip() != "")

    out["stage_weight"] = out["Deal Stage"].map(cfg.stage_weights).fillna(0.20)

    # Flags
    out["flag_stale"] = out["days_open"] >= cfg.stale_days
    out["flag_very_stale"] = out["days_open"] >= cfg.very_stale_days
    out["flag_risky_next_step"] = out["Next step"].fillna("").astype(str).str.contains(_RISK_NEXT_STEP_RE)

    # Score components (0-1)
    score_amount = _norm_0_1(out["Amount"].fillna(0.0))
    score_emp = _norm_0_1(out["Revised number of employees"].fillna(0.0))
    score_stage = _to_float(out["stage_weight"]).clip(lower=0.0, upper=1.0).fillna(0.0)
    score_act = _norm_0_1(out["Number of Sales Activities"])
    score_next_step = out["has_next_step"].astype(float)

    w = cfg.weights
    score_0_1 = (
        w["amount"] * score_amount
        + w["employees"] * score_emp
        + w["stage"] * score_stage
        + w["activities"] * score_act
        + w["next_step"] * score_next_step
    )

    out["priority_score_0_100"] = (score_0_1 * 100.0).round(1)

    # Queues (booleans)
    out["queue_close_30d"] = (
        (out["Deal Stage"].eq("Demo Booked"))
        | (
            out["Deal Stage"].eq("On Hold")
            & out["Next step"].fillna("").astype(str).str.contains(
                r"\b(?:signature|sign|approved budget|CFO)\b", case=False, regex=True
            )
        )
    )

    out["queue_unblock_high_value"] = (
        out["Deal Stage"].isin(["Factorial Project Alignment started", "Economical Allignment Started", "Demo Booked"])
        & (out["Amount"].fillna(0.0) >= 5000.0)
        & (out["days_open"] >= cfg.stale_days)
    )

    out["queue_activate_backlog"] = (
        out["Deal Stage"].eq("New Deals") & (out["Number of Sales Activities"].fillna(0.0) <= 0.0)
    )

    # Convenience: weighted pipeline
    out["weighted_amount"] = out["Amount"].fillna(0.0) * out["stage_weight"].fillna(0.0)

    return out


def build_action_queues(df_scored: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """
    Returns a dict with 3 dataframes sorted by highest value/priority for action.
    """
    cols = [
        "Record ID",
        "Deal Name",
        "Deal Stage",
        "Amount",
        "Revised number of employees",
        "Number of Sales Activities",
        "days_open",
        "Next step",
        "priority_score_0_100",
        "flag_stale",
        "flag_very_stale",
        "flag_risky_next_step",
    ]

    def pick(mask: pd.Series, sort_cols: Tuple[str, ...]) -> pd.DataFrame:
        sub = df_scored.loc[mask, [c for c in cols if c in df_scored.columns]].copy()
        return sub.sort_values(list(sort_cols), ascending=[False] * len(sort_cols), na_position="last")

    qA = pick(df_scored["queue_close_30d"], ("priority_score_0_100", "Amount"))
    qB = pick(df_scored["queue_unblock_high_value"], ("Amount", "priority_score_0_100"))
    qC = pick(df_scored["queue_activate_backlog"], ("Revised number of employees", "priority_score_0_100"))

    return {
        "close_30d": qA,
        "unblock_high_value": qB,
        "activate_backlog": qC,
    }

