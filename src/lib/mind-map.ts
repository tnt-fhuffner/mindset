import { NODE_COLORS } from "@/lib/constants";
import type { MindMapContent } from "@/types";

export function emptyMindMap(label = "Ideia central"): MindMapContent {
  return {
    nodes: [
      {
        id: "root",
        type: "topic",
        position: { x: 0, y: 0 },
        data: { label, color: NODE_COLORS[0], icon: "sparkles" },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export type LayoutNode = {
  id: string;
  label: string;
  parentId?: string | null;
  color?: string;
  icon?: string;
  notes?: string;
  collapsed?: boolean;
};

export function descendantIds(rootId: string, edges: Array<{ source: string; target: string }>) {
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    const list = children.get(edge.source) ?? [];
    list.push(edge.target);
    children.set(edge.source, list);
  }
  const out = new Set<string>();
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

export function hiddenNodeIds(
  nodes: Array<{ id: string; data?: { collapsed?: boolean } }>,
  edges: Array<{ source: string; target: string }>
) {
  const hidden = new Set<string>();
  for (const node of nodes) {
    if (!node.data?.collapsed) continue;
    descendantIds(node.id, edges).forEach((id) => hidden.add(id));
  }
  return hidden;
}

export function buildMindMapFromOutline(
  title: string,
  outline: LayoutNode[]
): MindMapContent {
  const children = new Map<string | null, LayoutNode[]>();
  for (const node of outline) {
    const parent = node.parentId ?? null;
    const list = children.get(parent) ?? [];
    list.push(node);
    children.set(parent, list);
  }

  const roots = children.get(null) ?? [];
  if (roots.length === 0 && outline.length > 0) {
    roots.push(outline[0]);
  }
  if (roots.length === 0) {
    return emptyMindMap(title);
  }

  const positioned: MindMapContent["nodes"] = [];
  const edges: MindMapContent["edges"] = [];
  let colorIndex = 0;

  const walk = (node: LayoutNode, depth: number, index: number, siblings: number) => {
    const x = depth * 280;
    const spread = Math.max(siblings, 1);
    const y = (index - (spread - 1) / 2) * Math.max(110, 280 - depth * 30);
    const color = node.color ?? NODE_COLORS[colorIndex % NODE_COLORS.length];
    colorIndex += 1;
    positioned.push({
      id: node.id,
      type: "topic",
      position: { x, y },
      data: {
        label: node.label,
        color,
        icon: node.icon,
        notes: node.notes,
        collapsed: node.collapsed,
      },
    });
    const kids = children.get(node.id) ?? [];
    kids.forEach((child, childIndex) => {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: "smoothstep",
      });
      walk(child, depth + 1, childIndex, kids.length);
    });
  };

  roots.forEach((root, index) => walk(root, 0, index, roots.length));
  if (positioned[0]) {
    positioned[0].data.label = positioned[0].data.label || title;
  }

  return { nodes: positioned, edges, viewport: { x: 80, y: 80, zoom: 0.85 } };
}

export function layoutExistingMap(content: MindMapContent): MindMapContent {
  const parentOf = new Map<string, string>();
  content.edges.forEach((edge) => parentOf.set(edge.target, edge.source));
  const outline = content.nodes.map((node) => ({
    id: node.id,
    label: node.data.label,
    parentId: parentOf.get(node.id) ?? null,
    color: node.data.color,
    icon: node.data.icon,
    notes: node.data.notes,
    collapsed: node.data.collapsed,
  }));
  const laidOut = buildMindMapFromOutline(
    content.nodes[0]?.data.label ?? "Mapa",
    outline
  );
  return { ...laidOut, viewport: content.viewport };
}
