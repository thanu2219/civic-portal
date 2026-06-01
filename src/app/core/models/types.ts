export type UserRole = 'citizen' | 'dept_admin' | 'admin';

export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'closed';

export type RequestCategory =
  | 'electricity'
  | 'municipality'
  | 'road_and_transportation'
  | 'water'
  | 'traffic';

export const CATEGORY_LABELS: Record<RequestCategory, string> = {
  electricity: 'Electricity',
  municipality: 'Municipality',
  road_and_transportation: 'Road & Transportation',
  water: 'Water',
  traffic: 'Traffic',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Pending',
  in_progress: 'Work In Progress',
  completed: 'Completed',
  closed: 'Closed',
};

export const DEPT_REJECTION_REASONS = [
  { value: 'wrong_department', label: 'Wrong Department', reroutes: true },
  { value: 'duplicate_request', label: 'Duplicate Request', reroutes: false },
  { value: 'insufficient_information', label: 'Insufficient Information', reroutes: false },
  { value: 'not_actionable', label: 'Not Actionable', reroutes: false },
  { value: 'other', label: 'Other', reroutes: false },
] as const;

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
}

export interface DepartmentStaff {
  user_id: string;
  department_id: string;
}

export interface ServiceRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: RequestCategory;
  location: string;
  status: RequestStatus;
  department_id: string | null;
  assigned_to: string | null;
  resolution: string | null;
  resolution_photo: string | null;
  rejection_reason: string | null;
  merged_into: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  department?: Department;
}

export interface RequestEvent {
  id: string;
  request_id: string;
  actor_id: string;
  action: string;
  notes: string | null;
  created_at: string;
  actor?: Profile;
}

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  author_id: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
  comment_count?: number;
}

export interface NewsComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}
