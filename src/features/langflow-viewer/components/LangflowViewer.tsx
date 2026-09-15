"use client";
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, type Edge, type Node, type NodeChange } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, Network } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { normalizeLangflowFlow } from "../lib/normalize-flow";
import { useResolvedTheme } from "../lib/theme";
import type { LangflowViewerProps, ViewerGraph, ViewerNode } from "../model/viewer-graph";
import { LangflowNode } from "./LangflowNode";
import { NodeDetailsPanel } from "./NodeDetailsPanel";
import { ViewerToolbar } from "./ViewerToolbar";

const nodeTypes = { langflow: LangflowNode };

interface CanvasProps {
  graph: ViewerGraph;
  initialView: "fit" | "exported";
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (node: ViewerNode | null) => void;
  showMinimap: boolean;
}

function toFlowNodes(graph: ViewerGraph, normalizedQuery: string): Node[] {
  return graph.nodes.map((node) => {
    const searchable = [node.title, node.componentType, ...node.fields.map((field) => field.displayName), ...node.outputs.map((port) => port.displayName)].join(" ").toLowerCase();
    return {
      id: node.id,
      type: "langflow",
      position: node.position,
      data: node as unknown as Record<string, unknown>,
      style: normalizedQuery && !searchable.includes(normalizedQuery) ? { opacity: 0.25 } : undefined,
    };
  });
}

function toFlowEdges(graph: ViewerGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: `output:${edge.sourcePort}`,
    targetHandle: `input:${edge.targetPort}`,
    type: "default",
  }));
}

function FlowCanvas({ graph, initialView, query, onQueryChange, onSelect, showMinimap }: CanvasProps) {
  const { fitView, setViewport } = useReactFlow();
  const normalizedQuery = query.trim().toLowerCase();

  // Local state lets React Flow update node positions during drag without
  // ever mutating the read-only `flow` prop. Structure stays locked because
  // nodesConnectable/edgesReconnectable are false and no edge change handler exists.
  const [nodes, setNodes] = useState<Node[]>(() => toFlowNodes(graph, normalizedQuery));
  const [edges] = useState<Edge[]>(() => toFlowEdges(graph));

  useEffect(() => {
    setNodes(toFlowNodes(graph, normalizedQuery));
    // Re-seed local positions only when the source flow identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  useEffect(() => {
    setNodes((current) => current.map((node) => {
      const viewerNode = node.data as unknown as ViewerNode;
      const searchable = [viewerNode.title, viewerNode.componentType, ...viewerNode.fields.map((f) => f.displayName), ...viewerNode.outputs.map((p) => p.displayName)].join(" ").toLowerCase();
      const dimmed = normalizedQuery && !searchable.includes(normalizedQuery);
      return { ...node, style: dimmed ? { opacity: 0.25 } : undefined };
    }));
  }, [normalizedQuery]);

  const onNodesChange = (changes: NodeChange[]) => {
    // Only apply position/dimension/selection changes; never remove nodes.
    const safe = changes.filter((change) => change.type !== "remove");
    setNodes((current) => applyNodeChanges(safe, current));
  };

  // Fit/set viewport after nodes have been measured by React Flow.
  // A short timeout ensures the DOM is painted before computing bounds.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (initialView === "exported" && graph.viewport) setViewport(graph.viewport, { duration: 0 });
      else fitView({ padding: 0.22, duration: 0 });
    }, 50);
    return () => clearTimeout(timer);
  }, [fitView, graph, initialView, setViewport]);

  return <>
    <ViewerToolbar query={query} onQueryChange={onQueryChange} onFit={() => fitView({ padding: 0.22, duration: 250 })} />
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      nodesDraggable
      nodesConnectable={false}
      edgesReconnectable={false}
      deleteKeyCode={null}
      onNodeClick={(_, node) => onSelect(node.data as unknown as ViewerNode)}
      onPaneClick={() => onSelect(null)}
      minZoom={0.05}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={2} color="var(--canvas-dot)" />
      <Controls showInteractive={false} />
      {showMinimap && <MiniMap nodeStrokeWidth={2} zoomable pannable maskColor="var(--minimap-mask)" nodeColor="var(--minimap-node)" nodeStrokeColor="var(--minimap-node-stroke)" />}
    </ReactFlow>
  </>;
}

export function LangflowViewer({ flow, className, height = "100%", showMinimap = true, showDetails = true, initialView = "fit", theme = "auto", onError, onNodeSelect }: LangflowViewerProps) {
  const resolvedTheme = useResolvedTheme(theme);
  const result = useMemo(() => {
    try { return { graph: normalizeLangflowFlow(flow), error: null as string | null }; }
    catch (error) { return { graph: null, error: error instanceof Error ? error.message : "Unable to read flow." }; }
  }, [flow]);
  const [query, setQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<ViewerNode | null>(null);

  useEffect(() => { setQuery(""); setSelectedNode(null); }, [flow]);
  useEffect(() => { if (result.graph?.warnings.length) onError?.(result.graph.warnings); }, [onError, result.graph]);

  const selectNode = (node: ViewerNode | null) => { setSelectedNode(node); onNodeSelect?.(node); };
  if (result.error || !result.graph) return <section className={`langflow-viewer langflow-viewer--error ${className ?? ""}`} data-theme={resolvedTheme} style={{ height }}><AlertTriangle size={24} /><h2>Unable to render this flow</h2><p>{result.error}</p></section>;
  const graph = result.graph;
  return <section className={`langflow-viewer ${className ?? ""}`} data-theme={resolvedTheme} style={{ height }}>
    <header className="langflow-viewer__header">
      <div><span className="langflow-viewer__eyebrow"><Network size={14} /> Read-only flow</span><h1>{graph.metadata.name || "Untitled Langflow export"}</h1>{graph.metadata.description && <p>{graph.metadata.description}</p>}</div>
      <div className="langflow-viewer__stats"><span>{graph.nodes.length} nodes</span><span>{graph.edges.length} edges</span></div>
    </header>
    <div className="langflow-viewer__canvas">
      <ReactFlowProvider><FlowCanvas graph={graph} initialView={initialView} query={query} onQueryChange={setQuery} onSelect={selectNode} showMinimap={showMinimap} /></ReactFlowProvider>
      {graph.warnings.length > 0 && <div className="flow-warning"><AlertTriangle size={15} /> {graph.warnings.length} graph issue{graph.warnings.length === 1 ? "" : "s"} ignored</div>}
      {showDetails && <NodeDetailsPanel node={selectedNode} onClose={() => selectNode(null)} />}
    </div>
  </section>;
}
