// ══════════════════════════════════════════════════════════════════════════════
// Shared types between Frontend and Backend
// ══════════════════════════════════════════════════════════════════════════════

// ── Roles ────────────────────────────────────────────────────────────────────
export type Role =
  | "admin"
  | "site_admin"
  | "user"
  | "member"
  | "instructor"
  | "mentor"
  | "content_manager"
  | "support";

// ── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: Role | null;
  secondaryRole: Role | null;
  image: string | null;
  university: string | null;
  major: string | null;
  createdAt: string;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface OtpSendRequest {
  email: string;
}

export interface OtpVerifyRequest {
  email: string;
  code: string;
}

// ── Content ──────────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  accent: string;
  order: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  instructorId: string;
  summary: string;
  description: string;
  price: number;
  published: boolean;
  featured: boolean;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  body: string;
  authorName: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
