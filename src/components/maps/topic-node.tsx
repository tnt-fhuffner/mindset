"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BookOpen, Flag, Lightbulb, Sparkles, Target, Users } from "lucide-react";
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

function TopicNodeComponent({ data, selected }: NodeProps<TopicFlowNode>) {
  const Icon = ICONS[(data.icon as keyof typeof ICONS) ?? "sparkles"] ?? Sparkles;
  return (
    <div
      className={cn(
        "min-w-[180px] max-w-[280px] rounded-2xl border-2 bg-card px-3 py-2 shadow-sm",
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
        <div>
          <p className="text-sm font-semibold leading-tight">{data.label}</p>
          {data.notes && (
            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground line-clamp-4">{data.notes}</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5" />
    </div>
  );
}

export const TopicNode = memo(TopicNodeComponent);
export const nodeTypes = { topic: TopicNode };
export const NODE_ICONS = Object.keys(ICONS);
