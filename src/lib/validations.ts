import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres"),
});

export const profileSchema = z.object({
  display_name: z.string().min(2).max(80),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _"),
  bio: z.string().max(280).optional().nullable(),
});

export const postSchema = z.object({
  type: z.enum(["pdf", "ebook", "article", "link", "image", "map"]),
  title: z.string().min(3).max(140),
  description: z.string().max(2000).optional().nullable(),
  link_url: z.string().url().optional().nullable(),
  mind_map_id: z.string().uuid().optional().nullable(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(4000),
  parent_id: z.string().uuid().optional().nullable(),
});

export const mapSchema = z.object({
  title: z.string().min(1).max(120),
  visibility: z.enum(["private", "public", "unlisted"]),
  folder_id: z.string().uuid().optional().nullable(),
});
