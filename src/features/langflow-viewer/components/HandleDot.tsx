"use client";
import { Handle, Position, type HandleProps } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { portColorVar } from "../lib/port-colors";

interface HandleDotProps {
  id: string;
  type: HandleProps["type"];
  position: Position;
  dataTypes: string[];
  connected: boolean;
  label: string;
  side: "input" | "output";
}

export function HandleDot({ id, type, position, dataTypes, connected, label, side }: HandleDotProps) {
  const color = portColorVar(dataTypes);
  const [hovered, setHovered] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHover = () => {
    setHovered(true);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setTooltipVisible(true), 1000);
  };
  const endHover = () => {
    setHovered(false);
    setTooltipVisible(false);
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  };

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const isLeft = side === "input";

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      isConnectable={false}
      className={`langflow-handle ${hovered ? "is-hovered" : ""} ${connected ? "is-connected" : ""}`}
      onMouseEnter={startHover}
      onMouseLeave={endHover}
      style={{
        background: color,
        "--glow-color": color,
        boxShadow: hovered ? undefined : `0 0 0 3px var(--handle-ring)`,
      } as React.CSSProperties}
    >
      {tooltipVisible && (
        <div className={`langflow-handle__tooltip ${isLeft ? "is-left" : "is-right"}`}>
          <strong>{isLeft ? "Input type(s):" : "Output type(s):"}</strong>
          <div className="langflow-handle__tooltip-types">
            {(dataTypes.length ? dataTypes : ["Any"]).map((dt) => (
              <span key={dt} className="langflow-handle__tooltip-badge" style={{ background: portColorVar([dt]) }}>{dt}</span>
            ))}
          </div>
          <small>{label}</small>
        </div>
      )}
    </Handle>
  );
}
