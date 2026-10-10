# Judge & Evaluator Demo Walkthrough (2–3 Minutes)
**SmartRoute AI — Clean Bharat Intelligence Platform**  
*AI First Product Builder Hackathon 2026*

This guide walks an evaluator through the fully functional platform step-by-step. All data displayed is backed by real SQLite/PostgreSQL tables, genuine OR-Tools and 2-Opt solvers, and strict transparency labeling.

---

## 0. Quick Start Services

```bash
# Terminal 1: Launch Backend API (FastAPI)
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Launch Frontend Application (Vite + React)
npm --prefix frontend run dev
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Interactive Swagger API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **Health & Transparency Endpoint**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 1. Demo Credentials & One-Click Role Switcher

In the top navigation bar, use the **"Demo Role"** switcher to instantly toggle between user personas without retyping passwords:

| Persona | Email | Password | Primary Mission |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@cleanbharat.gov.in` | `Password123!` | File reports, take segregation quiz, circular scrap pickup |
| **Field Worker** | `worker@cleanbharat.gov.in` | `Password123!` | Receive assigned stops, mark in-progress, upload after-proof |
| **Supervisor** | `supervisor@cleanbharat.gov.in` | `Password123!` | Plan fleet routes (CVRP), audit before/after photos, DrainGuard |
| **Admin** | `admin@cleanbharat.gov.in` | `Password123!` | Command centre SQL metrics, CSV exports, weight sliders, safe reset |

---

## 2. Walkthrough Steps

### Step 1: Citizen Reports Waste & Automated AI Intelligence
1. Switch role to **Citizen**.
2. Click **"Report Waste"**.
3. Select `Garbage Dump / Pile`, enter a description:  
   *"Massive pile of rotting vegetables, packaging cartons, and plastic bottles dumped near Ajmal Khan market."*
4. Click **"Detect My Location"** (or use default coordinates).
5. Choose an image (or take a photo). Notice that client validates format and server automatically strips all private EXIF GPS metadata.
6. Click **"Submit Citizen Report"**.
7. **Notice**:
   - Ticket generated: `CB-XXXX`
   - AI waste intelligence: `waste_type: organic/plastic`, labeled `source: "rules_fallback"`
   - Explainable Priority Score calculated with factor breakdown (severity, aging, overflow, sensitive location).

### Step 2: Duplicate Spatial Clustering
1. Submit a second report within 50 meters of the first location with the same category.
2. **Observe**: The platform identifies the geodesic proximity via Haversine formula and links it as a corroborating duplicate (`is_cluster_parent: true`, `duplicate_count: +1`), boosting the parent report's priority score without cluttering the map.

### Step 3: Interactive Civic Map & Accessible Fallback
1. Click **"Civic Map"**.
2. View real OpenStreetMap tiles with legal attribution.
3. Observe color-coded circles: red (critical/drain clogs), amber (pending), blue (on route), green (resolved), and smart bins.
4. Toggle **"Table Fallback"** at the top right to verify keyboard-navigable accessibility when map rendering is not desired.

### Step 4: Supervisor Fleet Route Optimisation (CVRP)
1. Switch role to **Supervisor**.
2. Click **"Route Optimiser"**.
3. Select `Central Sanitation Depot & Garage` and vehicle `DL-1AA-1001 (Electric Tipper Truck, Capacity 1500 kg)`.
4. Select verified reports from the list and click **"Solve & Optimise Route"**.
5. **Inspect the Results Panel**:
   - **Baseline Distance** (sequential unoptimised traversal) vs **Optimised Distance** (OR-Tools / 2-Opt TSP solver).
   - Real mileage saved (km), turnaround time saved (min), and fuel efficiency gain (%).
   - Honest solver disclosure (`solver: ortools` or `2opt_fallback`, `matrix: osrm` or `haversine_fallback`).
   - Selected reports automatically transition to `assigned`.

### Step 5: Worker Field Execution & Evidence Proof
1. Switch role to **Field Worker**.
2. Click **"Field Tasks"**.
3. Find the assigned report and click **"Start Work (Mark In Progress)"**.
4. Click **"Upload Clearance Proof"**, choose a cleared site photo, enter notes (*"Area cleaned, 350 kg waste loaded, bleached"*), and submit.
5. Report status moves to `in_progress` with `ResolutionEvidence` queued for supervisor sign-off.

### Step 6: Human Supervisor Review & Points Crediting
1. Switch role back to **Supervisor**.
2. Click **"Verification Queue"**.
3. Compare the **Before: Incident Photo** and **After: Field Worker Clearance Photo** side-by-side.
4. Click **"Approve Closure"**.
5. **Verify**:
   - Report status moves to `resolved`.
   - Citizen reporting reward (+25 pts) is credited via idempotent ledger entry in `PointsLedger`.

### Step 7: Circular Economy (RecycleConnect) & Gamification
1. Switch role to **Citizen**.
2. Click **"RecycleConnect"**:
   - Inspect indicative price card (labeled *"indicative, not market data"*).
   - Publish a new recyclable listing (e.g. 15 kg corrugated boxes) for doorstep pickup.
3. Click **"Segregation Quiz"**:
   - Answer interactive questions evaluated server-side.
   - Earn points subject to the anti-gaming daily cap (max 50 pts/day).

### Step 8: DrainGuard Hotspot Intelligence
1. Switch role to **Supervisor** or **Admin** and click **"DrainGuard"**.
2. Inspect repeat drain clog clusters identifying structural silt bottlenecks.
3. **Verify Honesty Protocol**: Rainfall feed clearly shows `"not configured"` unless a real weather key is present, and flood risk is labeled strictly as an estimate.

### Step 9: Natural Language Operational Assistant
1. Click the green **"AI Assistant"** button in the header.
2. Click quick prompts or type:
   - *"How many reports are pending or resolved?"*
   - *"Show top priority urgent reports"*
   - *"Explain priority score for CB-1001"*
3. Notice deterministic local SQL answers querying the live database.

### Step 10: Command Centre & Role-Protected CSV Export
1. Switch role to **Admin** and click **"Command Centre"**.
2. Review aggregated SQL KPIs, SLA overdue counts, and ward summaries.
3. Inspect **Seed Transparency**: exact ratio of seed demo records vs authentic live citizen reports.
4. Click **"Export CSV Audit"** to download the municipal audit spreadsheet.
5. Go to **"Impact Analytics"** to view avoided CO₂ and fuel savings with the transparent Assumptions Panel.
