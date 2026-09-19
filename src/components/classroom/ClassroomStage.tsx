"use client";

import React, { useState, useEffect } from "react";
import { useParticipants } from "@livekit/components-react";
import { SuperWhiteboard } from "@/components/classroom/SuperWhiteboard";
import { PodVideoTile } from "@/components/classroom/PodVideoTile";

export function ClassroomStage({ 
  sessionId, 
  isTeacher = false, 
  participantName 
}: { 
  sessionId: string; 
  isTeacher?: boolean; 
  participantName: string;
}) {
  const participants = useParticipants();

  // Separate local or remote participants cleanly
  const teacher = participants.find((p) => p.identity.startsWith("teacher_")) || participants[0];
  const activeStudents = participants.filter((p) => p !== teacher);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-112px)] bg-slate-900 overflow-hidden relative">
      
      {/* 1. MAIN TEACHING CANVAS (Fills available height) */}
      <div className="flex-1 p-2.5 pb-1 overflow-hidden flex">
        <SuperWhiteboard isTeacher={isTeacher} />
      </div>

      {/* 2. BOTTOM HORIZONTAL VIDEO STRIP (Only shows actively connected users, Max 5 students) */}
      <div className="h-24 bg-slate-950 border-t border-slate-800 px-4 py-1.5 flex items-center gap-3 overflow-x-auto shrink-0 z-20">
        
        {/* Teacher Tile */}
        <div className="w-36 h-full shrink-0">
          <PodVideoTile participant={teacher} label="Mentor" isSpotlight={true} />
        </div>

        <div className="w-px h-10 bg-slate-800 mx-1" />

        {/* Dynamically render ONLY the students who have actually joined */}
        {activeStudents.map((student) => (
          <div key={student.identity} className="w-32 h-full shrink-0">
            <PodVideoTile participant={student} label="Student" />
          </div>
        ))}

        {/* If fewer than 5 students have joined, show clean open seat indicators */}
        {Array.from({ length: Math.max(0, 5 - activeStudents.length) }).map((_, idx) => (
          <div key={`empty-${idx}`} className="w-32 h-full shrink-0 hidden sm:block">
            <PodVideoTile label={`Seat ${activeStudents.length + idx + 1} Open`} />
          </div>
        ))}
      </div>

    </div>
  );
}