"use client";

import { memo, type MouseEvent } from "react";
import { Handle, Position, useReactFlow, useStore, type Node, type NodeProps } from "@xyflow/react";
import { BookOpen, Flag, Lightbulb, Sparkles, Target, Users } from "lucide-react";
import { descendantIds } from "@/lib/mind-map";
import { cn } from "@/lib/utils";
import type { MapNodeData } from "@/types";

const ICONS = {
  sparkles: Sparkles,
  book: BookOpen,
  lightbulb: Lightbulb,
  target: Target,
  users: Users,
  flag: Flag,
};

export type TopicFlowNode = Node<MapNodeData, "topic">;

function TopicNodeComponent({ id, data, selected }: NodeProps<TopicFlowNode>) {
  const { setNodes } = useReactFlow();
  const foldedCount = useStore((state) => descendantIds(id, state.edges).size);
  const Icon = ICONS[(data.icon as keyof typeof ICONS) ?? "sparkles"] ?? Sparkles;
  const collapsed = Boolean(data.collapsed);

  function toggleCollapse(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    setNodes((current) =>
      current.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, collapsed: !Boolean((node.data as MapNodeData).collapsed) } }
          : node
      )
    );
  }

  return (
    <div
      className={cn(
        "relative min-w-[180px] max-w-[280px] rounded-2xl border-2 bg-card px-3 py-2 shadow-sm",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
      style={{ borderColor: data.color }}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5" />
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: data.color }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{data.label}</p>
          {data.notes && (
            <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">{data.notes}</p>
          )}
        </div>
        {foldedCount > 0 && (
          <button
            type="button"
            className="nodrag nopan mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border bg-background px-1.5 text-[11px] font-semibold leading-none"
            style={{ borderColor: data.color, color: data.color }}
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expandir ${foldedCount} tópicos` : `Recolher ${foldedCount} tópicos`}
            title={collapsed ? `Expandir ${foldedCount}` : "Recolher ramificação"}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={toggleCollapse}
          >
            {collapsed ? `+${foldedCount}` : "−"}
          </button>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5" />
    </div>
  );
}

export const TopicNode = memo(TopicNodeComponent);
export const nodeTypes = { topic: TopicNode };
export const NODE_ICONS = Object.keys(ICONS);
