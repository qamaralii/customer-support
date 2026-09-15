"use client";
import { useReactFlow } from "@xyflow/react";
import { Maximize2, Minus, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface ViewerToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onFit: () => void;
}

export function ViewerToolbar({ query, onQueryChange, onFit }: ViewerToolbarProps) {
  const { zoomIn, zoomOut } = useReactFlow();
  const [zoomPercent, setZoomPercent] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
      if (viewport) {
        const transform = viewport.style.transform;
        const match = /scale\(([^)]+)\)/.exec(transform);
        if (match) setZoomPercent(Math.round(parseFloat(match[1]) * 100));
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return <div className="viewer-toolbar">
    <label className="viewer-search"><Search size={15} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search components or ports" /></label>
    <div className="viewer-zoom">
      <button type="button" onClick={() => zoomOut({ duration: 200 })} aria-label="Zoom out"><Minus size={15} /></button>
      <span className="viewer-zoom__readout">{zoomPercent}%</span>
      <button type="button" onClick={() => zoomIn({ duration: 200 })} aria-label="Zoom in"><Plus size={15} /></button>
      <button type="button" className="viewer-zoom__fit" onClick={onFit} aria-label="Fit graph to view"><Maximize2 size={14} /> Fit</button>
    </div>
  </div>;
}
