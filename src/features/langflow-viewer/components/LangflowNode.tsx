"use client";
import { Position, type NodeProps } from "@xyflow/react";
import { Bot, Box, Braces, Database, GitBranch, Play, Send, Webhook } from "lucide-react";
import { HandleDot } from "./HandleDot";
import type { ViewerField, ViewerNode, ViewerPort } from "../model/viewer-graph";

const icons = { bot: Bot, database: Database, webhook: Webhook, send: Send, play: Play, gitbranch: GitBranch, code2: Braces };

function nodeIcon(icon?: string) {
  const Icon = icons[(icon ?? "").toLowerCase() as keyof typeof icons] ?? Box;
  return <Icon size={16} strokeWidth={1.5} />;
}

export function LangflowNode({ data, selected }: NodeProps) {
  const viewerNode = data as unknown as ViewerNode;
  const visibleFields = viewerNode.fields.filter((field) => !field.advanced);
  return (
    <article className={`langflow-node ${selected ? "is-selected" : ""}`}>
      <header className="langflow-node__header">
        <span className="langflow-node__icon">{nodeIcon(viewerNode.icon)}</span>
        <div className="langflow-node__title">
          <strong>{viewerNode.title}</strong>
          <small>{viewerNode.componentType}</small>
        </div>
      </header>
      <div className="langflow-node__body">
        {visibleFields.map((field) => <FieldRow key={field.id} field={field} />)}
        {visibleFields.length === 0 && <p className="langflow-node__empty">No parameters</p>}
      </div>
      {viewerNode.outputs.length > 0 && (
        <div className="langflow-node__outputs">
          {viewerNode.outputs.map((port) => <OutputPort key={port.id} port={port} />)}
        </div>
      )}
    </article>
  );
}

function FieldRow({ field }: { field: ViewerField }) {
  return (
    <div className={`langflow-field ${field.connectable ? "is-connectable" : ""} ${field.connected ? "is-connected" : ""}`}>
      <label className="langflow-field__label">
        <span>{field.displayName}</span>
        {field.required && <em className="langflow-field__required">required</em>}
      </label>
      <div className="langflow-field__control">
        {field.connectable && (
          <HandleDot
            id={field.id}
            type="target"
            position={Position.Left}
            dataTypes={field.dataTypes}
            connected={field.connected}
            label={field.displayName}
            side="input"
          />
        )}
        <FieldValue field={field} />
      </div>
    </div>
  );
}

function OutputPort({ port }: { port: ViewerPort }) {
  return (
    <div className={`langflow-output ${port.connected ? "is-connected" : ""}`}>
      <span>{port.displayName}</span>
      <HandleDot
        id={port.id}
        type="source"
        position={Position.Right}
        dataTypes={port.dataTypes}
        connected={port.connected}
        label={port.displayName}
        side="output"
      />
    </div>
  );
}

function FieldValue({ field }: { field: ViewerField }) {
  if (field.masked) {
    return <input className="langflow-field__input langflow-field__input--masked" type="password" readOnly value={field.value || "••••••••"} placeholder="Hidden" />;
  }
  switch (field.fieldType) {
    case "bool":
      return <label className="langflow-field__check"><input type="checkbox" disabled checked={field.value === "True"} /><span>{field.value === "True" ? "True" : "False"}</span></label>;
    case "int":
    case "float":
      return <input className="langflow-field__input" type="text" readOnly value={field.value} placeholder="—" />;
    case "dropdown":
    case "select":
      return <select className="langflow-field__input langflow-field__select" disabled value={field.value}><option value={field.value}>{field.value || "—"}</option></select>;
    case "prompt":
    case "textarea":
    case "multiline":
      return <textarea className="langflow-field__input langflow-field__textarea" readOnly value={field.value} placeholder="—" rows={2} />;
    case "code":
      return null;
    case "other":
      if (!field.value && field.connectable) return <span className="langflow-field__placeholder">Connect input</span>;
      return <input className="langflow-field__input" type="text" readOnly value={field.value} placeholder="—" />;
    default:
      return <input className="langflow-field__input" type="text" readOnly value={field.value} placeholder="—" />;
  }
}
