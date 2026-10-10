import csv
import io
from fastapi import APIRouter, Depends, Response, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.report import Report
from backend.app.core.auth import require_roles
from backend.app.services.metrics_engine import (
    compute_command_center_metrics,
    compute_kpi_summary,
    compute_analytics_time_series,
    get_activity_feed,
    get_system_notifications,
    global_search,
    get_ward_geojson_aggregates,
    compute_impact_analytics
)

router = APIRouter(prefix="/metrics", tags=["Metrics & Analytics"])

@router.get("/command-center")
def get_command_center(db: Session = Depends(get_db)):
    """Operational metrics aggregated from live database state."""
    return compute_command_center_metrics(db)

@router.get("/kpi-summary")
def get_kpi_summary(db: Session = Depends(get_db)):
    """Top KPI strip metrics with 7-day sparkline history and calculation tooltips."""
    return compute_kpi_summary(db)

@router.get("/analytics-series")
def get_analytics_series(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db)
):
    """Time-series analytical aggregations for municipal trends and charts."""
    return compute_analytics_time_series(db, days=days)

@router.get("/activity-feed")
def get_recent_activity(
    limit: int = Query(25, ge=5, le=100),
    db: Session = Depends(get_db)
):
    """Latest audit activity events from ReportEvent table."""
    return get_activity_feed(db, limit=limit)

@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db)):
    """Active system notifications for overdue SLAs, critical reports, and smart bins."""
    return get_system_notifications(db)

@router.get("/search")
def run_global_search(
    q: str = Query("", min_length=0),
    db: Session = Depends(get_db)
):
    """Global search across reports, wards, and quick actions for Command Palette."""
    return global_search(db, query=q)

@router.get("/wards-geojson")
def get_wards_geojson(db: Session = Depends(get_db)):
    """GeoJSON FeatureCollection with live ward report density and choropleth metrics."""
    return get_ward_geojson_aggregates(db)

@router.get("/impact")
def get_impact(db: Session = Depends(get_db)):
    """Impact and resource conservation analytics with full assumptions panel."""
    return compute_impact_analytics(db)

@router.get("/export-reports-csv")
def export_reports_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("supervisor", "admin"))
):
    """
    Exports full reports dataset as CSV for municipal audit.
    Requires supervisor or administrator privilege.
    """
    reports = db.query(Report).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Ticket Number",
        "Category",
        "Waste Type",
        "Status",
        "Priority Score",
        "Latitude",
        "Longitude",
        "Address",
        "Source",
        "Is Cluster Parent",
        "Duplicate Count",
        "SLA Due At",
        "Seed Demo",
        "Created At"
    ])

    for r in reports:
        writer.writerow([
            r.ticket_number,
            r.category,
            r.waste_type,
            r.status,
            r.priority_score,
            r.lat,
            r.lng,
            r.address_text or "",
            r.source,
            r.is_cluster_parent,
            r.duplicate_count,
            r.sla_due_at.isoformat() if r.sla_due_at else "",
            r.seed_demo,
            r.created_at.isoformat() if r.created_at else ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cleanbharat_reports_export.csv"}
    )

@router.get("/export-chart-csv/{chart_id}")
def export_chart_csv(
    chart_id: str,
    db: Session = Depends(get_db)
):
    """
    Exports individual analytical chart series as CSV.
    """
    series_data = compute_analytics_time_series(db, days=30)
    output = io.StringIO()
    writer = csv.writer(output)

    if chart_id == "created_vs_resolved":
        writer.writerow(["Date", "Reports Created", "Reports Resolved"])
        for row in series_data["daily_created_vs_resolved"]:
            writer.writerow([row["date"], row["created"], row["resolved"]])
    elif chart_id == "categories":
        writer.writerow(["Category", "Count", "Percentage"])
        for row in series_data["category_mix"]:
            writer.writerow([row["category"], row["count"], row["percentage"]])
    elif chart_id == "wards":
        writer.writerow(["Ward", "Total Reports", "Open Reports", "Resolved Reports"])
        for row in series_data["ward_comparison"]:
            writer.writerow([row["ward_name"], row["total"], row["open"], row["resolved"]])
    elif chart_id == "resolution_time":
        writer.writerow(["Duration Bucket", "Count"])
        for row in series_data["resolution_distribution"]:
            writer.writerow([row["bucket"], row["count"]])
    else:
        writer.writerow(["Chart Series", "Value"])
        writer.writerow(["No series found for id", chart_id])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=chart_{chart_id}_export.csv"}
    )
