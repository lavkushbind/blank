"use client";

import { useState, useEffect } from "react";
import { Room, RoomEvent, ConnectionState } from "livekit-client";

export function useLiveKitRoom(token: string, serverUrl?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);

  useEffect(() => {
    if (!token) return;

    const currentRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    currentRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
      setConnectionState(state);
    });

    const connectToRoom = async () => {
      try {
        const url = serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://blanklearn-live.livekit.cloud";
        await currentRoom.connect(url, token);
        setRoom(currentRoom);
      } catch (error) {
        console.error("LiveKit connection failure:", error);
      }
    };

    connectToRoom();

    return () => {
      currentRoom.disconnect();
    };
  }, [token, serverUrl]);

  return { room, connectionState, isConnected: connectionState === ConnectionState.Connected };
}