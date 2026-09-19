"use client";

import React from "react";
import { useParticipants } from "@livekit/components-react";
import { PodVideoTile } from "@/components/classroom/PodVideoTile";

export function VideoGrid1to5() {
  const participants = useParticipants();
  const teacher = participants.find((p) => p.identity.startsWith("teacher_"));
  const students = participants.filter((p) => !p.identity.startsWith("teacher_")).slice(0, 5);

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-80px)] gap-4 p-4 bg-slate-950 text-white">
      {/* Teacher Spotlight */}
      <div className="flex-1 h-full">
        <PodVideoTile participant={teacher} label="Connecting Mentor..." isSpotlight={true} />
      </div>

      {/* 5-Student Right Sidebar */}
      <div className="w-full lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 min-w-[140px] lg:min-w-0">
            <PodVideoTile participant={students[index]} label={`Seat ${index + 1} Open`} />
          </div>
        ))}
      </div>
    </div>
  );
}