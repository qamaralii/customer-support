export interface ViewerWarning {
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface ViewerPort {
  id: string;
  name: string;
  displayName: string;
  dataTypes: string[];
  connected: boolean;
  inferred?: boolean;
}

export interface ViewerField {
  id: string;
  name: string;
  displayName: string;
  dataTypes: string[];
  connected: boolean;
  inferred?: boolean;
  connectable: boolean;
  value: string;
  masked: boolean;
  fieldType: string;
  required: boolean;
  advanced: boolean;
  options?: string[];
}

export interface SafeConfigurationField {
  name: string;
  displayName: string;
  value: string;
  masked: boolean;
}

export interface ViewerNode {
  id: string;
  componentType: string;
  title: string;
  description?: string;
  icon?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  fields: ViewerField[];
  outputs: ViewerPort[];
}

export interface ViewerEdge {
  id: string;
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
}

export interface ViewerGraph {
  metadata: { id?: string; name?: string; description?: string; langflowVersion?: string };
  viewport?: { x: number; y: number; zoom: number };
  nodes: ViewerNode[];
  edges: ViewerEdge[];
  warnings: ViewerWarning[];
}

export interface LangflowViewerProps {
  flow: unknown;
  className?: string;
  height?: string | number;
  showMinimap?: boolean;
  showDetails?: boolean;
  initialView?: "fit" | "exported";
  theme?: "light" | "dark" | "auto";
  onError?: (errors: ViewerWarning[]) => void;
  onNodeSelect?: (node: ViewerNode | null) => void;
}
