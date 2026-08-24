import {
  getNodesBounds,
  getViewportForBounds,
  type Edge,
  type Node,
} from "@xyflow/react";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { downloadBlob, downloadJson, slugifyFilename } from "@/lib/utils";
import type { MindMapContent } from "@/types";

const WIDTH = 1920;
const HEIGHT = 1080;

function viewportEl() {
  const el = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!el) throw new Error("Canvas do mapa não encontrado.");
  return el;
}

async function capture(nodes: Node[], format: "png" | "svg") {
  const bounds = getNodesBounds(nodes);
  const viewport = getViewportForBounds(bounds, WIDTH, HEIGHT, 0.4, 2, 48);
  const options = {
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background")
      ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background")})`
      : "#fff",
    width: WIDTH,
    height: HEIGHT,
    style: {
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  };
  if (format === "svg") return toSvg(viewportEl(), options);
  return toPng(viewportEl(), options);
}

export async function exportMap(
  format: "png" | "svg" | "pdf" | "json",
  title: string,
  nodes: Node[],
  edges: Edge[],
  content: MindMapContent
) {
  const name = slugifyFilename(title);
  if (format === "json") {
    downloadJson(`${name}.json`, { title, content: { ...content, nodes, edges } });
    return;
  }
  const dataUrl = await capture(nodes, format === "svg" ? "svg" : "png");
  if (format === "svg") {
    const blob = await (await fetch(dataUrl)).blob();
    downloadBlob(`${name}.svg`, blob);
    return;
  }
  if (format === "png") {
    const blob = await (await fetch(dataUrl)).blob();
    downloadBlob(`${name}.png`, blob);
    return;
  }
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [WIDTH, HEIGHT] });
  pdf.addImage(dataUrl, "PNG", 0, 0, WIDTH, HEIGHT);
  pdf.save(`${name}.pdf`);
}
