from __future__ import annotations

import io
from pathlib import Path
from typing import Optional, Tuple

import pandas as pd
import plotly.express as px
import streamlit as st

from dashboard.metrics import deals_created_by_month, kpis, stage_distribution, stage_summary
from dashboard.scoring import add_scoring_columns, build_action_queues, default_config


APP_TITLE = "Davyn × Factorial — Pipeline Dashboard"


def _format_money(v: float) -> str:
    try:
        return f"${v:,.0f}"
    except Exception:
        return "$0"


def _load_excel(upload: Optional[io.BytesIO], fallback_path: Optional[Path]) -> Tuple[pd.DataFrame, str]:
    if upload is not None:
        df = pd.read_excel(upload, sheet_name=0)
        return df, "upload"
    if fallback_path and fallback_path.exists():
        df = pd.read_excel(str(fallback_path), sheet_name=0)
        return df, str(fallback_path)
    raise ValueError("No file provided. Upload an .xlsx or place it in the project root.")


def _filters(df: pd.DataFrame) -> pd.DataFrame:
    with st.sidebar:
        st.subheader("Filters")
        stages = sorted(df["Deal Stage"].dropna().astype(str).unique().tolist())
        selected_stages = st.multiselect("Deal stages", options=stages, default=stages)

        min_score, max_score = float(df["priority_score_0_100"].min()), float(df["priority_score_0_100"].max())
        score_range = st.slider("Priority score", min_value=0.0, max_value=100.0, value=(min_score, max_score), step=0.5)

        min_amount = float(df["Amount"].fillna(0).min())
        max_amount = float(df["Amount"].fillna(0).max())
        amount_range = st.slider("Amount (known)", min_value=0.0, max_value=float(max_amount), value=(0.0, float(max_amount)), step=100.0)

        only_missing_next_step = st.checkbox("Only deals missing Next step", value=False)
        only_missing_amount = st.checkbox("Only deals missing Amount", value=False)
        only_stale = st.checkbox("Only stale deals (>= 90 days open)", value=False)

        qA = st.checkbox("Queue: close in 30d", value=False)
        qB = st.checkbox("Queue: unblock high value", value=False)
        qC = st.checkbox("Queue: activate backlog (New Deals, 0 activities)", value=False)

        search = st.text_input("Search deal name contains", value="").strip()

    out = df[df["Deal Stage"].isin(selected_stages)].copy()
    out = out[(out["priority_score_0_100"] >= score_range[0]) & (out["priority_score_0_100"] <= score_range[1])]

    out_amt = out["Amount"].fillna(0.0)
    out = out[(out_amt >= amount_range[0]) & (out_amt <= amount_range[1])]

    if only_missing_next_step:
        out = out[~out["has_next_step"]]
    if only_missing_amount:
        out = out[~out["has_amount"]]
    if only_stale:
        out = out[out["flag_stale"]]

    if qA:
        out = out[out["queue_close_30d"]]
    if qB:
        out = out[out["queue_unblock_high_value"]]
    if qC:
        out = out[out["queue_activate_backlog"]]

    if search:
        out = out[out["Deal Name"].astype(str).str.contains(search, case=False, na=False)]

    return out


def main() -> None:
    st.set_page_config(page_title=APP_TITLE, layout="wide")
    st.title(APP_TITLE)

    with st.sidebar:
        st.subheader("Data source")
        upload = st.file_uploader("Upload HubSpot export (.xlsx)", type=["xlsx"])
        st.caption("Or keep the export file in the project root and reload.")

        fallback = Path(__file__).resolve().parents[1] / "hubspot-crm-exports-davyn-2026-06-02.xlsx"
        use_fallback = st.checkbox(
            f"Use local file: {fallback.name}",
            value=upload is None and fallback.exists(),
            disabled=upload is not None,
        )

        today = st.date_input("Today (for days_open)", value=pd.Timestamp.today().date())

    df_raw, source = _load_excel(upload, fallback if use_fallback else None)

    cfg = default_config(today=pd.Timestamp(today))
    df = add_scoring_columns(df_raw, cfg=cfg)
    df_f = _filters(df)

    tab_overview, tab_priority, tab_queues, tab_quality = st.tabs(
        ["Overview", "Priority", "Action Queues", "Data Quality"]
    )

    with tab_overview:
        st.caption(f"Source: `{source}` • Deals: {len(df)} (after filters: {len(df_f)})")
        k = kpis(df)

        c1, c2, c3, c4, c5 = st.columns(5)
        c1.metric("Deals total", f"{k['deals_total']}")
        c2.metric("Pipeline (known)", _format_money(k["pipeline_known"]))
        c3.metric("Weighted pipeline", _format_money(k["pipeline_weighted"]))
        c4.metric("Missing Next step", f"{k['pct_missing_next_step']:.0f}%")
        c5.metric("New Deals activation", f"{k['activation_rate_new_deals']:.0f}%")

        left, right = st.columns([1, 1])
        with left:
            dist = stage_distribution(df)
            fig = px.bar(dist, x="Deal Stage", y="count", text="pct", title="Deals by stage")
            fig.update_traces(texttemplate="%{text}%", textposition="outside")
            fig.update_layout(xaxis_title="", yaxis_title="Deals", height=380)
            st.plotly_chart(fig, use_container_width=True)

        with right:
            created = deals_created_by_month(df)
            if created.empty or "month" not in created.columns or "deals_created" not in created.columns:
                st.info("Não foi possível montar o gráfico por mês (faltando/invalidando 'Create Date').")
            else:
                fig2 = px.line(created, x="month", y="deals_created", markers=True, title="Deals created by month")
                fig2.update_layout(xaxis_title="", yaxis_title="Deals", height=380)
                st.plotly_chart(fig2, use_container_width=True)

        st.subheader("Stage summary")
        st.dataframe(stage_summary(df), use_container_width=True, hide_index=True)

    with tab_priority:
        st.subheader("Top deals by priority score")
        show_cols = [
            "Deal Name",
            "Deal Stage",
            "priority_score_0_100",
            "Amount",
            "weighted_amount",
            "Revised number of employees",
            "Number of Sales Activities",
            "days_open",
            "has_next_step",
            "flag_stale",
            "flag_risky_next_step",
            "Next step",
            "Record ID",
        ]
        table = df_f.sort_values(["priority_score_0_100", "Amount"], ascending=[False, False]).copy()
        st.dataframe(
            table[[c for c in show_cols if c in table.columns]],
            use_container_width=True,
            hide_index=True,
        )

        st.download_button(
            "Download filtered deals (CSV)",
            data=table.to_csv(index=False).encode("utf-8"),
            file_name="davyn_pipeline_filtered.csv",
            mime="text/csv",
        )

    with tab_queues:
        st.subheader("Action queues (unfiltered, based on rules)")
        queues = build_action_queues(df)
        qtabs = st.tabs(["Close in 30d", "Unblock high value", "Activate backlog"])

        with qtabs[0]:
            st.caption("Demo Booked + On Hold with near-close language in Next step.")
            st.dataframe(queues["close_30d"], use_container_width=True, hide_index=True)
            st.download_button(
                "Download Close in 30d (CSV)",
                data=queues["close_30d"].to_csv(index=False).encode("utf-8"),
                file_name="davyn_queue_close_30d.csv",
                mime="text/csv",
            )

        with qtabs[1]:
            st.caption("Alignment/Economical/Demo with Amount >= $5k and >= 90 days open.")
            st.dataframe(queues["unblock_high_value"], use_container_width=True, hide_index=True)
            st.download_button(
                "Download Unblock high value (CSV)",
                data=queues["unblock_high_value"].to_csv(index=False).encode("utf-8"),
                file_name="davyn_queue_unblock_high_value.csv",
                mime="text/csv",
            )

        with qtabs[2]:
            st.caption("New Deals with 0 sales activities, ordered by employees.")
            st.dataframe(queues["activate_backlog"], use_container_width=True, hide_index=True)
            st.download_button(
                "Download Activate backlog (CSV)",
                data=queues["activate_backlog"].to_csv(index=False).encode("utf-8"),
                file_name="davyn_queue_activate_backlog.csv",
                mime="text/csv",
            )

    with tab_quality:
        st.subheader("Data quality issues")
        c1, c2, c3 = st.columns(3)
        c1.metric("Deals missing Amount", f"{int((~df['has_amount']).sum())}")
        c2.metric("Deals missing Next step", f"{int((~df['has_next_step']).sum())}")
        c3.metric("Very stale deals (>=180d)", f"{int(df['flag_very_stale'].sum())}")

        st.markdown("#### Missing Amount")
        miss_amt = df[~df["has_amount"]].sort_values(["Deal Stage", "Revised number of employees"], ascending=[True, False])
        st.dataframe(
            miss_amt[["Deal Name", "Deal Stage", "Revised number of employees", "Number of Sales Activities", "days_open", "Record ID"]],
            use_container_width=True,
            hide_index=True,
        )

        st.markdown("#### Missing Next step")
        miss_ns = df[~df["has_next_step"]].sort_values(["Deal Stage", "priority_score_0_100"], ascending=[True, False])
        st.dataframe(
            miss_ns[
                [
                    "Deal Name",
                    "Deal Stage",
                    "priority_score_0_100",
                    "Amount",
                    "Number of Sales Activities",
                    "days_open",
                    "Record ID",
                ]
            ],
            use_container_width=True,
            hide_index=True,
        )

        st.markdown("#### Risky Next step text (TBD / cold / unclear)")
        risky = df[df["flag_risky_next_step"]].sort_values(["priority_score_0_100"], ascending=False)
        st.dataframe(
            risky[["Deal Name", "Deal Stage", "priority_score_0_100", "Amount", "days_open", "Next step", "Record ID"]],
            use_container_width=True,
            hide_index=True,
        )


if __name__ == "__main__":
    main()

