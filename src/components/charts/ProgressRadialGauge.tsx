import React from "react";
export function ProgressRadialGauge({ percent }: { percent: number }) {
  return <div className="text-xl font-black text-indigo-600">{percent}%</div>;
}