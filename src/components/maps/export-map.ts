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
const EDGE_STROKE = "#64748b";

function viewportEl() {
  const el = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!el) throw new Error("Canvas do mapa não encontrado.");
  return el;
}

function inlineSvgStrokes(root: HTMLElement) {
  root.querySelectorAll("path, line, polyline").forEach((node) => {
    const el = node as SVGGraphicsElement;
    const computed = getComputedStyle(el);
    const stroke =
      computed.stroke && computed.stroke !== "none" && computed.stroke !== "rgba(0, 0, 0, 0)"
        ? computed.stroke
        : EDGE_STROKE;
    el.setAttribute("stroke", stroke);
    el.setAttribute("fill", computed.fill === "rgb(0, 0, 0)" ? "none" : computed.fill || "none");
    const width = computed.strokeWidth && computed.strokeWidth !== "0px" ? computed.strokeWidth : "2px";
    el.setAttribute("stroke-width", width);
    el.style.stroke = stroke;
    el.style.fill = "none";
    el.style.strokeWidth = width;
  });
}

async function capture(nodes: Node[], format: "png" | "svg") {
  const bounds = getNodesBounds(nodes);
  const viewport = getViewportForBounds(bounds, WIDTH, HEIGHT, 0.4, 2, 64);
  const el = viewportEl();
  inlineSvgStrokes(el);

  const options = {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    width: WIDTH,
    height: HEIGHT,
    filter: (node: HTMLElement) => {
      const className = typeof node.className === "string" ? node.className : "";
      if (className.includes("react-flow__minimap")) return false;
      if (className.includes("react-flow__controls")) return false;
      if (className.includes("react-flow__panel")) return false;
      if (className.includes("react-flow__attribution")) return false;
      return true;
    },
    style: {
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  };

  if (format === "svg") return toSvg(el, options);
  return toPng(el, options);
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
    downloadJson(`${name}.json`, { title, content });
    return;
  }
  const visible = nodes.filter((node) => !node.hidden);
  const dataUrl = await capture(visible.length ? visible : nodes, format === "svg" ? "svg" : "png");
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
