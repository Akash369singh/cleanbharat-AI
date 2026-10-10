from datetime import datetime
import re
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models.report import Report
from backend.app.models.ward import Ward
from backend.app.models.iot import Bin
from backend.app.config import settings

def handle_assistant_query(query_text: str, db: Session) -> Dict[str, Any]:
    """
    Handles natural language queries from citizens and supervisors.
    Uses deterministic local intent parsing that directly queries the database.
    Honesty Rule: Clearly flags whether deterministic_local_rules or external_llm is active.
    """
    q = (query_text or "").strip().lower()

    mode = "deterministic_local_rules"
    if settings.LLM_API_KEY:
        # If external key is configured, could invoke LLM; default to transparent local handler
        mode = "external_llm_ready"

    # Intent 1: "Why is report ... score ...?" / "Explain score"
    ticket_match = re.search(r"(cb-[a-z0-9]+|#?[0-9]+)", q)
    if any(k in q for k in ["why", "explain", "score", "factor"]) and ticket_match:
        token = ticket_match.group(1).lstrip("#").upper()
        report = db.query(Report).filter(
            (Report.ticket_number == token) | (Report.id == (int(token) if token.isdigit() else -1))
        ).first()

        if report:
            breakdown = report.priority_breakdown or {}
            explanation = (
                f"Report #{report.ticket_number} has an explainable priority score of {report.priority_score}. "
                f"Breakdown: Base severity {breakdown.get('base_severity', 'N/A')} (weighted: {breakdown.get('severity_weighted', 'N/A')}), "
                f"Aging urgency {breakdown.get('age_weighted', 'N/A')} ({breakdown.get('hours_open', 'N/A')} hours open), "
                f"Duplicate reports corroborating: {breakdown.get('duplicate_count', 0)} (weighted: {breakdown.get('duplicate_weighted', 0)}), "
                f"Overflow condition bonus: {breakdown.get('overflow_weighted', 0)}, "
                f"Sensitive landmark proximity bonus: {breakdown.get('location_weighted', 0)}."
            )
            return {
                "query": query_text,
                "intent": "explain_priority_score",
                "mode": mode,
                "answer": explanation,
                "data": {"report_id": report.id, "ticket_number": report.ticket_number, "priority_score": report.priority_score, "breakdown": breakdown}
            }

    # Intent 2: "Overdue" / "SLA"
    if any(k in q for k in ["overdue", "sla", "delayed", "late"]):
        now = datetime.utcnow()
        overdue_reports = db.query(Report).filter(
            Report.status.notin_(["resolved", "rejected"]),
            Report.sla_due_at.isnot(None),
            Report.sla_due_at < now
        ).order_by(Report.sla_due_at.asc()).limit(5).all()

        count = len(overdue_reports)
        if count == 0:
            return {
                "query": query_text,
                "intent": "overdue_reports",
                "mode": mode,
                "answer": "Great news! There are currently 0 overdue reports past their SLA deadline.",
                "data": {"overdue_count": 0, "reports": []}
            }
        else:
            rep_list = [f"#{r.ticket_number} ({r.category}, Ward: {r.ward.name if r.ward else 'General'}, Due: {r.sla_due_at.strftime('%Y-%m-%d %H:%M')})" for r in overdue_reports]
            return {
                "query": query_text,
                "intent": "overdue_reports",
                "mode": mode,
                "answer": f"Found {count} overdue reports past their SLA target. Earliest overdue items: " + "; ".join(rep_list),
                "data": {"overdue_count": count, "reports": [{"id": r.id, "ticket": r.ticket_number, "due": str(r.sla_due_at)} for r in overdue_reports]}
            }

    # Intent 3: "Top priority" / "Highest priority"
    if any(k in q for k in ["top priority", "highest", "critical", "urgent", "pending"]):
        top_reports = db.query(Report).filter(
            Report.status.in_(["submitted", "verified", "assigned"])
        ).order_by(desc(Report.priority_score)).limit(5).all()

        if not top_reports:
            return {
                "query": query_text,
                "intent": "top_priority",
                "mode": mode,
                "answer": "No active pending reports found needing attention.",
                "data": {"reports": []}
            }
        
        rep_list = [f"#{r.ticket_number} [Score: {r.priority_score}] {r.category} at {r.address_text or 'coordinates'}" for r in top_reports]
        return {
            "query": query_text,
            "intent": "top_priority",
            "mode": mode,
            "answer": f"Here are the top {len(top_reports)} urgent issues ranked by our explainable priority formula: " + " | ".join(rep_list),
            "data": {"reports": [{"id": r.id, "ticket": r.ticket_number, "score": r.priority_score, "category": r.category} for r in top_reports]}
        }

    # Intent 4: "Ward summary" / "Wards"
    if any(k in q for k in ["ward", "zone", "locality"]):
        wards = db.query(Ward).all()
        summaries = []
        for w in wards:
            pending = db.query(Report).filter(Report.ward_id == w.id, Report.status.notin_(["resolved", "rejected"])).count()
            summaries.append(f"{w.name} ({pending} active issues)")
        return {
            "query": query_text,
            "intent": "ward_summary",
            "mode": mode,
            "answer": f"Ward overview across {len(wards)} jurisdictions: " + ", ".join(summaries),
            "data": {"wards": summaries}
        }

    # Intent 5: "Counts" / "Total" / "Status"
    if any(k in q for k in ["count", "total", "summary", "stats", "statistics", "how many"]):
        total_rep = db.query(Report).count()
        resolved_rep = db.query(Report).filter(Report.status == "resolved").count()
        total_bins = db.query(Bin).count()
        overflow_bins = db.query(Bin).filter(Bin.status == "overflow").count()
        return {
            "query": query_text,
            "intent": "system_counts",
            "mode": mode,
            "answer": (
                f"Platform Status: {total_rep} total citizen reports ({resolved_rep} resolved, {total_rep - resolved_rep} active). "
                f"{total_bins} municipal smart bins monitored ({overflow_bins} currently near/at overflow)."
            ),
            "data": {"total_reports": total_rep, "resolved": resolved_rep, "bins": total_bins, "overflowing_bins": overflow_bins}
        }

    # Default fallback / Help
    return {
        "query": query_text,
        "intent": "general_help",
        "mode": mode,
        "answer": (
            "I am SmartRoute AI's local operational assistant. You can ask me:\n"
            "• 'How many reports are pending or resolved?'\n"
            "• 'Show top priority urgent reports'\n"
            "• 'Which reports are overdue on SLA?'\n"
            "• 'Explain priority score for CB-xxx'\n"
            "• 'Ward summary'"
        ),
        "data": {}
    }
