import type { ViewerEdge, ViewerField, ViewerGraph, ViewerNode, ViewerPort, ViewerWarning } from "../model/viewer-graph";

type RecordValue = Record<string, unknown>;

const SECRET_FIELD = /key|secret|token|password|credential|authorization/i;
const OMITTED_FIELD = /^(code|_type|_frontend_)/i;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function valueSummary(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  return "Object";
}

function fallbackPosition(index: number) {
  return { x: (index % 5) * 420, y: Math.floor(index / 5) * 340 };
}

function templateFields(template: RecordValue): ViewerField[] {
  return Object.entries(template)
    .filter(([name, field]) => !OMITTED_FIELD.test(name) && isRecord(field))
    .map(([name, field]) => {
      const objectField = isRecord(field) ? field : {};
      const displayName = stringValue(objectField.display_name, name);
      const fieldType = stringValue(objectField.type, "str").toLowerCase();
      const inputTypes = stringArray(objectField.input_types);
      const connectable = inputTypes.length > 0;
      const masked = objectField.password === true || SECRET_FIELD.test(name) || SECRET_FIELD.test(displayName);
      const options = stringArray(objectField.options);
      return {
        id: `input:${name}`,
        name,
        displayName,
        dataTypes: inputTypes,
        connected: false,
        connectable,
        value: masked ? "" : valueSummary(objectField.value),
        masked,
        fieldType: masked ? "secret" : fieldType,
        required: objectField.required === true,
        advanced: objectField.advanced === true,
        options: options.length > 0 ? options : undefined,
      };
    });
}

function outputPorts(outputs: unknown): ViewerPort[] {
  if (!Array.isArray(outputs)) return [];
  return outputs.filter(isRecord).map((output, index) => {
    const name = stringValue(output.name, `output-${index + 1}`);
    return {
      id: `output:${name}`,
      name,
      displayName: stringValue(output.display_name, name),
      dataTypes: stringArray(output.types),
      connected: false,
    };
  });
}

function extractGraph(flow: unknown): { root: RecordValue; graph: RecordValue } | null {
  if (!isRecord(flow)) return null;
  if (isRecord(flow.data) && Array.isArray(flow.data.nodes) && Array.isArray(flow.data.edges)) return { root: flow, graph: flow.data };
  if (Array.isArray(flow.nodes) && Array.isArray(flow.edges)) return { root: flow, graph: flow };
  return null;
}

function ensureField(fields: ViewerField[], name: string, types: string[]) {
  const id = `input:${name}`;
  let field = fields.find((item) => item.id === id);
  if (!field) {
    field = {
      id,
      name,
      displayName: name,
      dataTypes: types,
      connected: true,
      inferred: true,
      connectable: true,
      value: "",
      masked: false,
      fieldType: "other",
      required: false,
      advanced: false,
    };
    fields.push(field);
  }
  field.connected = true;
}

export function normalizeLangflowFlow(flow: unknown): ViewerGraph {
  const source = typeof flow === "string" ? safeParse(flow) : flow;
  const extracted = extractGraph(source);
  if (!extracted) throw new Error("Expected a Langflow export with data.nodes and data.edges.");

  const { root, graph } = extracted;
  const warnings: ViewerWarning[] = [];
  const rawNodes = graph.nodes as unknown[];
  const nodes: ViewerNode[] = rawNodes.filter(isRecord).map((rawNode, index) => {
    const data = isRecord(rawNode.data) ? rawNode.data : {};
    const component = isRecord(data.node) ? data.node : {};
    const template = isRecord(component.template) ? component.template : {};
    const rawPosition = isRecord(rawNode.position) ? rawNode.position : {};
    const measured = isRecord(rawNode.measured) ? rawNode.measured : {};
    const id = stringValue(rawNode.id, `node-${index + 1}`);
    const componentType = stringValue(data.type, stringValue(component.name, "Unknown"));
    return {
      id,
      componentType,
      title: stringValue(component.display_name, componentType || id),
      description: stringValue(component.description) || undefined,
      icon: stringValue(component.icon) || undefined,
      position: {
        x: typeof rawPosition.x === "number" ? rawPosition.x : fallbackPosition(index).x,
        y: typeof rawPosition.y === "number" ? rawPosition.y : fallbackPosition(index).y,
      },
      width: typeof measured.width === "number" ? measured.width : undefined,
      height: typeof measured.height === "number" ? measured.height : undefined,
      fields: templateFields(template),
      outputs: outputPorts(component.outputs),
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: ViewerEdge[] = [];

  (graph.edges as unknown[]).filter(isRecord).forEach((rawEdge, index) => {
    const sourceId = stringValue(rawEdge.source);
    const targetId = stringValue(rawEdge.target);
    const edgeData = isRecord(rawEdge.data) ? rawEdge.data : {};
    const sourceHandle = isRecord(edgeData.sourceHandle) ? edgeData.sourceHandle : {};
    const targetHandle = isRecord(edgeData.targetHandle) ? edgeData.targetHandle : {};
    const sourcePort = stringValue(sourceHandle.name, "output");
    const targetPort = stringValue(targetHandle.fieldName, "input");
    const source = nodeById.get(sourceId);
    const target = nodeById.get(targetId);
    if (!source || !target) {
      warnings.push({ message: "Skipped an edge that references a missing node.", edgeId: stringValue(rawEdge.id, `edge-${index + 1}`) });
      return;
    }
    ensureOutput(source.outputs, sourcePort, stringArray(sourceHandle.output_types));
    ensureField(target.fields, targetPort, stringArray(targetHandle.inputTypes));
    edges.push({ id: stringValue(rawEdge.id, `edge-${index + 1}`), source: sourceId, target: targetId, sourcePort, targetPort });
  });

  const rawViewport = isRecord(graph.viewport) ? graph.viewport : undefined;
  return {
    metadata: {
      id: stringValue(root.id) || undefined,
      name: stringValue(root.name) || undefined,
      description: stringValue(root.description) || undefined,
      langflowVersion: stringValue(root.last_tested_version) || undefined,
    },
    viewport: rawViewport && typeof rawViewport.x === "number" && typeof rawViewport.y === "number" && typeof rawViewport.zoom === "number"
      ? { x: rawViewport.x, y: rawViewport.y, zoom: rawViewport.zoom }
      : undefined,
    nodes,
    edges,
    warnings,
  };
}

function ensureOutput(ports: ViewerPort[], name: string, types: string[]) {
  const id = `output:${name}`;
  if (!ports.some((port) => port.id === id)) {
    ports.push({ id, name, displayName: name, dataTypes: types, connected: true, inferred: true });
  }
  const port = ports.find((item) => item.id === id);
  if (port) port.connected = true;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("The supplied flow is not valid JSON.");
  }
}
