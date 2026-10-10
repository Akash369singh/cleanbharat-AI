export type UserRole = 'citizen' | 'worker' | 'supervisor' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  ward_id?: number;
  points_balance: number;
  is_active: boolean;
  seed_demo: boolean;
}

export interface Ward {
  id: number;
  name: string;
  code: string;
  zone?: string;
  population?: number;
  area_sq_km?: number;
  center_lat: number;
  center_lng: number;
  contact_officer?: string;
  contact_phone?: string;
}

export type ReportCategory =
  | 'garbage_dump'
  | 'overflowing_bin'
  | 'drain_clog'
  | 'plastic_waste'
  | 'dead_animal'
  | 'hazardous_waste'
  | 'other';

export type ReportStatus =
  | 'submitted'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'rejected';

export interface PriorityBreakdown {
  base_severity: number;
  severity_weighted: number;
  hours_open: number;
  age_weighted: number;
  overflow_weighted: number;
  drain_weighted: number;
  duplicate_count: number;
  duplicate_weighted: number;
  sensitive_location_detected: boolean;
  location_weighted: number;
  weights_used: Record<string, number>;
}

export interface Report {
  id: number;
  ticket_number: string;
  category: ReportCategory;
  waste_type: string;
  description: string;
  lat: number;
  lng: number;
  address_text?: string;
  photo_path?: string;
  status: ReportStatus;
  priority_score: number;
  priority_breakdown?: PriorityBreakdown;
  ai_result?: {
    waste_type: string;
    is_overflow: boolean;
    is_drain_obstruction: boolean;
    is_large_pile: boolean;
    confidence: number;
    source: string;
    limitations: string;
    recommended_action: string;
  };
  cluster_id?: number;
  is_cluster_parent: boolean;
  duplicate_count: number;
  sla_due_at?: string;
  source: 'model' | 'rules_fallback' | 'simulated' | 'seed_demo';
  seed_demo: boolean;
  citizen_id?: number;
  ward_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ReportEvent {
  id: number;
  event_type: string;
  old_status?: string;
  new_status?: string;
  comment?: string;
  metadata_json?: Record<string, any>;
  created_at: string;
}

export interface Depot {
  id: number;
  name: string;
  code: string;
  lat: number;
  lng: number;
  capacity_vehicles: number;
}

export interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: string;
  capacity_kg: number;
  status: string;
  fuel_type: string;
  driver_name: string;
}

export interface RouteStop {
  id: number;
  stop_order: number;
  report_id?: number;
  stop_type: string;
  lat: number;
  lng: number;
  estimated_waste_kg: number;
  status: string;
}

export interface Route {
  id: number;
  route_code: string;
  vehicle_id: number;
  depot_id: number;
  date: string;
  status: string;
  total_distance_meters: number;
  total_duration_seconds: number;
  baseline_distance_meters: number;
  baseline_duration_seconds: number;
  routing_source: 'osrm' | 'haversine_fallback';
  solver_used: 'ortools' | '2opt_fallback';
  created_at: string;
  stops: RouteStop[];
}

export interface ResolutionEvidence {
  id: number;
  report_id: number;
  before_photo_path?: string;
  after_photo_path: string;
  worker_id: number;
  reviewer_id?: number;
  decision: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface Bin {
  id: number;
  bin_code: string;
  ward_id?: number;
  lat: number;
  lng: number;
  bin_type: string;
  capacity_liters: number;
  fill_level_percent: number;
  battery_level_percent: number;
  sensor_health: string;
  status: 'normal' | 'near_full' | 'overflow';
  simulated: boolean;
  last_reading_at?: string;
}

export interface RecyclableListing {
  id: number;
  citizen_id: number;
  material_type: string;
  estimated_weight_kg: number;
  description?: string;
  address_text?: string;
  lat: number;
  lng: number;
  status: string;
  created_at: string;
}

export interface PickupRequest {
  id: number;
  listing_id: number;
  recycler_id: number;
  scheduled_date: string;
  time_slot: string;
  status: string;
  offered_price_inr: number;
  price_label: string;
  notes?: string;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  category: string;
  question_text: string;
  options: string[];
  difficulty: string;
  points: number;
}

export interface CleanupEvent {
  id: number;
  title: string;
  description: string;
  location_name: string;
  lat: number;
  lng: number;
  ward_id?: number;
  scheduled_date: string;
  max_volunteers: number;
  status: string;
  tasks: Array<{
    id: number;
    title: string;
    description: string;
    safety_instructions: string;
    is_hazardous: boolean;
    points_reward: number;
  }>;
}

export interface CommandCenterMetrics {
  reports: {
    total: number;
    by_status: Record<string, number>;
    sla_overdue: number;
    mean_resolution_hours: number;
  };
  routing: {
    total_routes_planned: number;
    total_optimised_km: number;
    total_baseline_km: number;
    km_saved: number;
  };
  recycling: {
    total_listings: number;
    completed_pickups: number;
    total_material_recycled_kg: number;
    total_citizen_payout_inr: number;
  };
  wards: Array<{
    ward_id: number;
    ward_name: string;
    ward_code: string;
    total_reports: number;
    pending_reports: number;
    smart_bins: number;
  }>;
  seed_transparency: {
    total_reports: number;
    seed_demo_reports: number;
    authentic_user_reports: number;
    is_seed_dominated: boolean;
  };
}
