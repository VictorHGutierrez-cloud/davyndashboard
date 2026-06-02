from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import pandas as pd


STAGE_ORDER_DEFAULT: List[str] = [
    "New Deals",
    "Factorial Project Alignment started",
    "Economical Allignment Started",
    "Demo Booked",
    "To reschedule",
    "On Hold",
]


@dataclass(frozen=True)
class MetricsConfig:
    stage_order: List[str]


def default_config() -> MetricsConfig:
    return MetricsConfig(stage_order=list(STAGE_ORDER_DEFAULT))


def stage_distribution(df: pd.DataFrame, stage_col: str = "Deal Stage", cfg: Optional[MetricsConfig] = None) -> pd.DataFrame:
    if cfg is None:
        cfg = default_config()

    s = df[stage_col].fillna("Unknown").astype(str)
    vc = s.value_counts(dropna=False)
    total = float(len(s)) if len(s) else 1.0

    out = (
        vc.rename("count")
        .to_frame()
        .assign(pct=lambda x: (x["count"] / total * 100.0).round(1))
        .reset_index()
        .rename(columns={"index": "Deal Stage"})
    )

    order_map = {name: i for i, name in enumerate(cfg.stage_order)}
    out["__order"] = out["Deal Stage"].map(order_map).fillna(999).astype(int)
    out = out.sort_values(["__order", "count"], ascending=[True, False]).drop(columns="__order")
    return out


def kpis(df_scored: pd.DataFrame) -> Dict[str, float]:
    """
    Expects df with scoring columns from dashboard/scoring.py (days_open, weighted_amount, etc.).
    Returns numeric KPIs for top cards.
    """
    n = float(len(df_scored))
    if n == 0:
        return {
            "deals_total": 0,
            "pipeline_known": 0.0,
            "pipeline_weighted": 0.0,
            "pct_missing_amount": 0.0,
            "pct_missing_next_step": 0.0,
            "activation_rate_new_deals": 0.0,
            "stale_deals": 0,
            "very_stale_deals": 0,
        }

    pipeline_known = float(df_scored["Amount"].fillna(0.0).sum()) if "Amount" in df_scored.columns else 0.0
    pipeline_weighted = (
        float(df_scored["weighted_amount"].fillna(0.0).sum()) if "weighted_amount" in df_scored.columns else 0.0
    )

    pct_missing_amount = float((~df_scored.get("has_amount", pd.Series([False] * len(df_scored))).astype(bool)).mean() * 100.0)
    pct_missing_next_step = float(
        (~df_scored.get("has_next_step", pd.Series([False] * len(df_scored))).astype(bool)).mean() * 100.0
    )

    new_deals = df_scored[df_scored["Deal Stage"].eq("New Deals")] if "Deal Stage" in df_scored.columns else df_scored.iloc[0:0]
    if len(new_deals):
        activation_rate = float((new_deals["Number of Sales Activities"].fillna(0.0) > 0).mean() * 100.0)
    else:
        activation_rate = 0.0

    stale_deals = int(df_scored.get("flag_stale", pd.Series([False] * len(df_scored))).sum())
    very_stale_deals = int(df_scored.get("flag_very_stale", pd.Series([False] * len(df_scored))).sum())

    return {
        "deals_total": int(n),
        "pipeline_known": pipeline_known,
        "pipeline_weighted": pipeline_weighted,
        "pct_missing_amount": pct_missing_amount,
        "pct_missing_next_step": pct_missing_next_step,
        "activation_rate_new_deals": activation_rate,
        "stale_deals": stale_deals,
        "very_stale_deals": very_stale_deals,
    }


def deals_created_by_month(df: pd.DataFrame, date_col: str = "Create Date") -> pd.DataFrame:
    if date_col not in df.columns:
        return pd.DataFrame({"month": pd.Series(dtype=str), "deals_created": pd.Series(dtype=int)})

    s = pd.to_datetime(df[date_col], errors="coerce")
    if s.notna().sum() == 0:
        return pd.DataFrame({"month": pd.Series(dtype=str), "deals_created": pd.Series(dtype=int)})

    month = s.dt.to_period("M").astype(str)
    out = (
        month.value_counts()
        .rename("deals_created")
        .to_frame()
        .reset_index()
    )
    # After reset_index, pandas may name the index column using the original series name.
    if "month" not in out.columns:
        if "index" in out.columns:
            out = out.rename(columns={"index": "month"})
        elif date_col in out.columns:
            out = out.rename(columns={date_col: "month"})
        elif "Create Date" in out.columns:
            out = out.rename(columns={"Create Date": "month"})

    if "month" not in out.columns:
        out["month"] = pd.Series(dtype=str)
    if "deals_created" not in out.columns:
        out["deals_created"] = pd.Series(dtype=int)

    out = out[["month", "deals_created"]].sort_values("month")
    return out


def stage_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Summarize by stage: count, avg amount, total amount, avg employees, avg activities.
    """
    grp = df.groupby("Deal Stage", dropna=False).agg(
        count=("Record ID", "count"),
        avg_amount=("Amount", "mean"),
        total_amount=("Amount", "sum"),
        avg_employees=("Revised number of employees", "mean"),
        avg_activities=("Number of Sales Activities", "mean"),
        pct_missing_next_step=("has_next_step", lambda s: (1.0 - s.astype(bool).mean()) * 100.0),
    )
    grp = grp.reset_index()
    for col in ["avg_amount", "total_amount", "avg_employees", "avg_activities", "pct_missing_next_step"]:
        if col in grp.columns:
            grp[col] = grp[col].round(1)
    return grp.sort_values("count", ascending=False)

