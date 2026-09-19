"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Create a Context to share active tab state without cloneElement
const TabsContext = React.createContext<{
  activeTab: string;
  setActiveTab: (value: string) => void;
} | null>(null);

export function Tabs({ 
  defaultValue, 
  children, 
  className 
}: { 
  defaultValue: string; 
  children: React.ReactNode; 
  className?: string 
}) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex bg-slate-100 p-1 rounded-xl", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ 
  value, 
  children, 
  className 
}: { 
  value: string; 
  children: React.ReactNode; 
  className?: string 
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within a Tabs component");

  const isActive = context.activeTab === value;

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "flex-1 py-2 text-xs font-bold rounded-lg transition", 
        isActive ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900", 
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ 
  value, 
  children, 
  className 
}: { 
  value: string; 
  children: React.ReactNode; 
  className?: string 
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within a Tabs component");

  if (context.activeTab !== value) return null;

  return (
    <div className={cn("pt-4 animate-in fade-in", className)}>
      {children}
    </div>
  );
}