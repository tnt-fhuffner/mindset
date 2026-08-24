import { ALLOWED_UPLOAD_MIME, UPLOAD_MAX_BYTES } from "@/lib/constants";

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function bytesMatchAscii(bytes: Uint8Array, offset: number, ascii: string) {
  return ascii.split("").every((char, index) => bytes[offset + index] === char.charCodeAt(0));
}

export type FileValidation = {
  ok: boolean;
  mime?: string;
  error?: string;
};

export function validateUpload(file: File, buffer: ArrayBuffer): FileValidation {
  if (file.size > UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: `Arquivo acima do limite de ${(UPLOAD_MAX_BYTES / (1024 * 1024)).toFixed(0)} MB.`,
    };
  }

  const bytes = new Uint8Array(buffer.slice(0, 16));
  let mime: string | undefined;

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) {
    mime = "application/pdf";
  } else if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    mime = "image/png";
  } else if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    mime = "image/jpeg";
  } else if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    mime = "image/gif";
  } else if (bytesMatchAscii(bytes, 0, "RIFF") && bytesMatchAscii(bytes, 8, "WEBP")) {
    mime = "image/webp";
  } else if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".epub") || file.type === "application/epub+zip") {
      mime = "application/epub+zip";
    }
  }

  if (!mime || !ALLOWED_UPLOAD_MIME.includes(mime as (typeof ALLOWED_UPLOAD_MIME)[number])) {
    return {
      ok: false,
      error: "Tipo de arquivo não permitido. Envie PDF, EPUB, PNG, JPG, GIF ou WEBP.",
    };
  }

  return { ok: true, mime };
}
