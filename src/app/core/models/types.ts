export type UserRole = 'citizen' | 'dept_admin' | 'admin';

export type RequestStatus =
  | 'pending'
  | 'routed'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'closed';

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
  routed: 'Routed',
  in_progress: 'Work In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
  closed: 'Closed',
};

export const DEPT_REJECTION_REASONS = [
  { value: 'wrong_department', label: 'Wrong Department', reroutes: true },
  { value: 'duplicate_request', label: 'Duplicate Request', reroutes: false },
  { value: 'insufficient_information', label: 'Insufficient Information', reroutes: false },
  { value: 'not_actionable', label: 'Not Actionable', reroutes: false },
  { value: 'other', label: 'Other', reroutes: false },
] as const;

// Slug values that are safe to translate via the i18n 'rejection.*' namespace.
// Legacy rows may contain free-text or English labels; in that case we fall
// back to displaying the stored value verbatim.
const REJECTION_SLUGS = new Set<string>(
  DEPT_REJECTION_REASONS.filter(r => r.value !== 'other').map(r => r.value)
);

const LEGACY_LABEL_TO_SLUG: Record<string, string> = DEPT_REJECTION_REASONS
  .filter(r => r.value !== 'other')
  .reduce((acc, r) => { acc[r.label] = r.value; return acc; }, {} as Record<string, string>);

/**
 * Maps a stored rejection_reason value to an i18n key (or null if it should be
 * displayed as raw free text). Handles both new slug-based values and legacy
 * English label values from before the migration to slugs.
 */
export function rejectionReasonI18nKey(value: string | null | undefined): string | null {
  if (!value) return null;
  if (REJECTION_SLUGS.has(value)) return `rejection.${value}`;
  const legacySlug = LEGACY_LABEL_TO_SLUG[value.trim()];
  if (legacySlug) return `rejection.${legacySlug}`;
  return null;
}

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

export type NewsPostType = 'news' | 'announcement';

export type NewsPostStatus = 'pending' | 'approved' | 'rejected';

export type NewsCategory =
  | 'generic'
  | 'electricity'
  | 'municipality'
  | 'road_and_transportation'
  | 'water'
  | 'traffic';

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  generic: 'Generic',
  electricity: 'Electricity',
  municipality: 'Municipality',
  road_and_transportation: 'Road & Transportation',
  water: 'Water',
  traffic: 'Traffic',
};

export const NEWS_TYPE_LABELS: Record<NewsPostType, string> = {
  news: 'News',
  announcement: 'Announcement',
};

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  author_id: string;
  published: boolean;
  post_type: NewsPostType;
  category: NewsCategory;
  status: NewsPostStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  start_date: string | null;
  end_date: string | null;
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
