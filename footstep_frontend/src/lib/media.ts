/**
 * Prefix a media URL with the backend host if it's a relative path.
 * In production, images come from S3 with full URLs (https://...).
 * In development, they come as relative paths (/media/...) served by Django.
 */
const BACKEND_URL = import.meta.env.PUBLIC_API_BASE
  ? import.meta.env.PUBLIC_API_BASE.replace("/api/v1", "")
  : "http://localhost:8000";

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  // Already a full URL (S3, CDN, etc.)
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Relative path — prefix with backend host
  return `${BACKEND_URL}${path}`;
}
