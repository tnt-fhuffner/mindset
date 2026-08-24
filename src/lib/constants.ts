export const MASTER_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL ?? "felipeqh.1991@gmail.com";

export const AI_MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT ?? 15);
export const UPLOAD_MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);

export const ALLOWED_UPLOAD_MIME = [
  "application/pdf",
  "application/epub+zip",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export const NODE_COLORS = [
  "#4f46e5",
  "#0f766e",
  "#c2410c",
  "#a21caf",
  "#1d4ed8",
  "#15803d",
  "#b45309",
  "#334155",
] as const;

export const POST_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "ebook", label: "E-book" },
  { value: "article", label: "Artigo" },
  { value: "link", label: "Link" },
  { value: "image", label: "Imagem" },
  { value: "map", label: "Mapa mental" },
] as const;

export type PostType = (typeof POST_TYPES)[number]["value"];
export type Visibility = "private" | "public" | "unlisted";
export type UserRole = "admin" | "user";
