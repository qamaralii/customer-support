"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { LangflowViewer } from "@/features/langflow-viewer";
import flowData from "@/flows/five-star-email-hitl.json";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function FlowViewerModal({ isOpen, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Flow Diagram"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative flex flex-col w-full h-full">
        {/* Flow viewer — full screen */}
        <LangflowViewer
          flow={flowData}
          height="100vh"
          theme="light"
          showMinimap={true}
          showDetails={true}
          initialView="fit"
        />

        {/* Floating close pill — always visible at bottom-centre */}
        <button
          onClick={onClose}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-900 shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Close flow diagram"
        >
          <X className="h-4 w-4" />
          Close Flow
        </button>
      </div>
    </div>
  );
}
