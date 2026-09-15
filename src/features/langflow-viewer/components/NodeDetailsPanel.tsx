"use client";
import { X } from "lucide-react";
import { portColorVar } from "../lib/port-colors";
import type { ViewerField, ViewerNode, ViewerPort } from "../model/viewer-graph";

interface NodeDetailsPanelProps {
  node: ViewerNode | null;
  onClose: () => void;
}

export function NodeDetailsPanel({ node, onClose }: NodeDetailsPanelProps) {
  if (!node) return null;
  const connectable = node.fields.filter((field) => field.connectable);
  const advanced = node.fields.filter((field) => field.advanced);
  return (
    <aside className="node-details" aria-label="Node details">
      <header className="node-details__header">
        <div><span>{node.componentType}</span><h2>{node.title}</h2></div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close node details"><X size={18} /></button>
      </header>
      {node.description && <p className="node-details__description">{node.description}</p>}
      <section>
        <h3>Inputs</h3>
        <FieldList fields={connectable} />
      </section>
      <section>
        <h3>Outputs</h3>
        <PortList ports={node.outputs} />
      </section>
      {node.fields.length > 0 && <section>
        <h3>Parameters</h3>
        <dl className="config-list">
          {node.fields.map((field) => <div key={field.id}><dt>{field.displayName}{field.advanced && <em> · advanced</em>}</dt><dd className={field.masked ? "is-masked" : ""}>{field.masked ? "Hidden" : (field.value || "—")}</dd></div>)}
        </dl>
      </section>}
      {advanced.length > 0 && <section>
        <h3>Advanced ({advanced.length})</h3>
        <p className="node-details__empty">Hidden in node card — shown above under Parameters.</p>
      </section>}
    </aside>
  );
}

function FieldList({ fields }: { fields: ViewerField[] }) {
  if (fields.length === 0) return <p className="node-details__empty">None declared</p>;
  return <ul className="port-list">{fields.map((field) => <li key={field.id}><span className="port-list__dot" style={{ background: portColorVar(field.dataTypes) }} /><span className="port-list__name">{field.displayName}</span><small>{field.dataTypes.join(" | ") || "Any"}{field.inferred ? " · inferred" : ""}{field.required ? " · required" : ""}</small></li>)}</ul>;
}

function PortList({ ports }: { ports: ViewerPort[] }) {
  if (ports.length === 0) return <p className="node-details__empty">None declared</p>;
  return <ul className="port-list">{ports.map((port) => <li key={port.id}><span className="port-list__dot" style={{ background: portColorVar(port.dataTypes) }} /><span className="port-list__name">{port.displayName}</span><small>{port.dataTypes.join(" | ") || "Any"}{port.inferred ? " · inferred" : ""}</small></li>)}</ul>;
}
