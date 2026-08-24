function drawCover(title: string, kind: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas indisponível."));

  const gradient = ctx.createLinearGradient(0, 0, 960, 540);
  gradient.addColorStop(0, "#312e81");
  gradient.addColorStop(1, "#0f766e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 960, 540);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(48, 48, 864, 444);

  ctx.fillStyle = "#c7d2fe";
  ctx.font = "700 28px system-ui, sans-serif";
  ctx.fillText(kind, 80, 130);

  ctx.fillStyle = "#ffffff";
  ctx.font = "600 42px system-ui, sans-serif";
  const words = title.trim() || "Publicação";
  wrapText(ctx, words, 80, 220, 800, 52);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar capa."))), "image/jpeg", 0.86);
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/);
  let line = "";
  let row = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight);
      line = word;
      row += 1;
      if (row >= 4) {
        ctx.fillText(`${word.slice(0, 18)}…`, x, y + row * lineHeight);
        return;
      }
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y + row * lineHeight);
}

async function pdfFirstPage(file: File): Promise<Blob> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const doc = await loadingTask.promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvas, viewport }).promise;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Falha ao gerar capa do PDF."))), "image/jpeg", 0.84);
  });
  await loadingTask.destroy();
  return blob;
}

export async function makePostThumbnail(input: {
  title: string;
  type: string;
  file?: File | null;
}): Promise<Blob> {
  const { title, type, file } = input;
  if (file?.type.startsWith("image/")) return file;
  if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
    try {
      return await pdfFirstPage(file);
    } catch {
      return drawCover(title, "PDF");
    }
  }
  const labels: Record<string, string> = {
    pdf: "PDF",
    ebook: "E-BOOK",
    article: "ARTIGO",
    link: "LINK",
    image: "IMAGEM",
    map: "MAPA MENTAL",
  };
  return drawCover(title, labels[type] ?? "POST");
}
