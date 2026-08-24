"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Download,
  LayoutTemplate,
  Plus,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AiAssistantPanel } from "@/components/maps/ai-assistant-panel";
import { exportMap } from "@/components/maps/export-map";
import { NODE_ICONS, nodeTypes } from "@/components/maps/topic-node";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NODE_COLORS } from "@/lib/constants";
import { layoutExistingMap } from "@/lib/mind-map";
import { useSaveMindMap } from "@/hooks/use-maps";
import { cn } from "@/lib/utils";
import type { MindMap, MindMapContent } from "@/types";

type HistoryState = { nodes: Node[]; edges: Edge[] };

function EditorCanvas({
  map,
  readOnly,
  remaining,
  limit,
}: {
  map: MindMap;
  readOnly?: boolean;
  remaining: number;
  limit: number;
}) {
  const save = useSaveMindMap();
  const { fitView } = useReactFlow();
  const [title, setTitle] = useState(map.title);
  const [visibility, setVisibility] = useState(map.visibility);
  const [aiOpen, setAiOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState(map.content.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(map.content.edges as Edge[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const history = useRef<HistoryState[]>([]);
  const future = useRef<HistoryState[]>([]);
  const skipHistory = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const selected = nodes.find((node) => node.id === selectedId);

  const pushHistory = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    if (skipHistory.current) return;
    history.current.push({ nodes: nextNodes, edges: nextEdges });
    if (history.current.length > 40) history.current.shift();
    future.current = [];
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => {
        const next = addEdge({ ...connection, type: "smoothstep" }, current);
        pushHistory(nodes, next);
        return next;
      });
    },
    [nodes, pushHistory, setEdges]
  );

  function persist(next?: Partial<{ title: string; visibility: MindMap["visibility"]; content: MindMapContent }>) {
    if (readOnly) return;
    save.mutate({
      id: map.id,
      title: next?.title ?? title,
      visibility: next?.visibility ?? visibility,
      content: next?.content ?? {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data as MindMapContent["nodes"][number]["data"],
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
        })),
      },
    });
  }

  useEffect(() => {
    if (readOnly) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => persist(), 1400);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, title, visibility]);

  function addNode() {
    const id = crypto.randomUUID();
    const next: Node = {
      id,
      type: "topic",
      position: { x: 180 + Math.random() * 240, y: 80 + Math.random() * 220 },
      data: { label: "Novo tópico", color: NODE_COLORS[nodes.length % NODE_COLORS.length], icon: "lightbulb" },
    };
    const nextNodes = [...nodes, next];
    if (selectedId) {
      const nextEdges = [...edges, { id: `${selectedId}-${id}`, source: selectedId, target: id, type: "smoothstep" }];
      setEdges(nextEdges);
      pushHistory(nextNodes, nextEdges);
    } else {
      pushHistory(nextNodes, edges);
    }
    setNodes(nextNodes);
    setSelectedId(id);
  }

  function deleteSelected() {
    if (!selectedId || selectedId === "root") return;
    const nextNodes = nodes.filter((node) => node.id !== selectedId);
    const nextEdges = edges.filter((edge) => edge.source !== selectedId && edge.target !== selectedId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    pushHistory(nextNodes, nextEdges);
    setSelectedId(null);
  }

  function applyContent(content: MindMapContent, nextTitle?: string) {
    skipHistory.current = true;
    setNodes(content.nodes as Node[]);
    setEdges(content.edges as Edge[]);
    if (nextTitle) setTitle(nextTitle);
    skipHistory.current = false;
    pushHistory(content.nodes as Node[], content.edges as Edge[]);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }

  function autoLayout() {
    const laid = layoutExistingMap({
      nodes: nodes as MindMapContent["nodes"],
      edges: edges as MindMapContent["edges"],
    });
    applyContent(laid);
  }

  function undo() {
    const previous = history.current.pop();
    if (!previous) return;
    future.current.push({ nodes, edges });
    skipHistory.current = true;
    setNodes(previous.nodes);
    setEdges(previous.edges);
    skipHistory.current = false;
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    history.current.push({ nodes, edges });
    skipHistory.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    skipHistory.current = false;
  }

  async function onExport(format: "png" | "svg" | "pdf" | "json") {
    try {
      await exportMap(format, title, nodes, edges, {
        nodes: nodes as MindMapContent["nodes"],
        edges: edges as MindMapContent["edges"],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar.");
    }
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const content = (parsed.content ?? parsed) as MindMapContent;
        if (!content.nodes) throw new Error("JSON inválido.");
        applyContent(content, parsed.title);
        toast.success("Mapa importado.");
      } catch {
        toast.error("Não foi possível ler este JSON.");
      }
    };
    reader.readAsText(file);
  }

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/s/${map.share_token}`;
  }, [map.share_token]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-card/80 px-3 py-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="h-9 max-w-xs border-none bg-transparent text-base font-semibold shadow-none"
          readOnly={readOnly}
        />
        {!readOnly && (
          <Select value={visibility} onValueChange={(value: MindMap["visibility"]) => setVisibility(value)}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Privado</SelectItem>
              <SelectItem value="unlisted">Somente com link</SelectItem>
              <SelectItem value="public">Público</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {!readOnly && (
            <>
              <Button size="sm" variant="outline" onClick={addNode}>
                <Plus className="h-4 w-4" /> Nó
              </Button>
              <Button size="sm" variant="ghost" onClick={autoLayout}>
                <LayoutTemplate className="h-4 w-4" /> Organizar
              </Button>
              <Button size="icon" variant="ghost" onClick={undo}>
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={redo}>
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <label className="inline-flex h-9 cursor-pointer items-center rounded-md px-2 text-sm hover:bg-muted">
                <Upload className="mr-1 h-4 w-4" /> JSON
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(event) => event.target.files?.[0] && importJson(event.target.files[0])}
                />
              </label>
              <Button size="sm" variant={aiOpen ? "default" : "outline"} onClick={() => setAiOpen((value) => !value)}>
                <Sparkles className="h-4 w-4" /> IA
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onExport("png")}>PNG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("svg")}>SVG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("json")}>JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {visibility !== "private" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Link copiado.");
              }}
            >
              Copiar link
            </Button>
          )}
        </div>
      </div>

      {selected && !readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
          <Input
            value={String(selected.data.label ?? "")}
            className="h-8 max-w-xs"
            onChange={(event) =>
              setNodes((current) =>
                current.map((node) =>
                  node.id === selected.id ? { ...node, data: { ...node.data, label: event.target.value } } : node
                )
              )
            }
          />
          <div className="flex gap-1">
            {NODE_COLORS.map((color) => (
              <button
                key={color}
                className={cn("h-5 w-5 rounded-full border", selected.data.color === color && "ring-2 ring-ring")}
                style={{ backgroundColor: color }}
                onClick={() =>
                  setNodes((current) =>
                    current.map((node) =>
                      node.id === selected.id ? { ...node, data: { ...node.data, color } } : node
                    )
                  )
                }
              />
            ))}
          </div>
          <Select
            value={String(selected.data.icon ?? "sparkles")}
            onValueChange={(icon) =>
              setNodes((current) =>
                current.map((node) =>
                  node.id === selected.id ? { ...node, data: { ...node.data, icon } } : node
                )
              )
            }
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NODE_ICONS.map((icon) => (
                <SelectItem key={icon} value={icon}>
                  {icon}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="map-canvas relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            nodeTypes={nodeTypes}
            fitView
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>
        {aiOpen && !readOnly && (
          <AiAssistantPanel
            remaining={remaining}
            limit={limit}
            onApply={(content, nextTitle) => applyContent(content, nextTitle)}
          />
        )}
      </div>
    </div>
  );
}

export function MindMapEditor(props: {
  map: MindMap;
  readOnly?: boolean;
  remaining: number;
  limit: number;
}) {
  return (
    <ReactFlowProvider>
      <EditorCanvas {...props} />
    </ReactFlowProvider>
  );
}
