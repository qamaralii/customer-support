"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Inbox,
  LayoutDashboard,
  Send,
  AlertTriangle,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FlowViewerModal } from "./flow-viewer-modal";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reviews", label: "Review Queue", icon: Inbox },
  { href: "/reviews?status=SENT", label: "Sent", icon: Send },
  { href: "/reviews?escalation=true", label: "Escalations", icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [showFlow, setShowFlow] = useState(false);

  return (
    <>
      <aside className="flex h-full w-64 flex-col border-r bg-card">
        {/* Logo / Brand */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            FS
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Five Star</p>
            <p className="text-xs text-muted-foreground">Support Centre</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href.split("?")[0]));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <Separator className="my-2" />

          {/* Flow Diagram button */}
          <button
            onClick={() => setShowFlow(true)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Workflow className="h-4 w-4" />
            Flow Diagram
          </button>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">
            NBFC Customer Support v1
          </p>
        </div>
      </aside>

      {/* Flow Diagram Modal */}
      <FlowViewerModal
        isOpen={showFlow}
        onClose={() => setShowFlow(false)}
      />
    </>
  );
}
