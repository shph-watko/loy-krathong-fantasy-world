"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type RemotePlayer = {
  userId: string;
  displayName: string;
  outfitColor: string;
  x: number;
  z: number;
};

type PresencePayload = {
  userId: string;
  displayName: string;
  outfitColor: string;
  x: number;
  z: number;
};

export type RoomPresenceConnection = {
  publishPosition: (position: { x: number; z: number }) => void;
  close: () => void;
};

export function subscribeToRoomPresence(
  roomId: string,
  user: { id: string; displayName: string; outfitColor: string },
  onPlayers: (players: RemotePlayer[]) => void
): RoomPresenceConnection | null {
  const client = createClient();
  if (!client) return null;

  const channel: RealtimeChannel = client.channel(`room:${roomId}`, {
    config: {
      private: true,
      presence: { key: user.id },
      broadcast: { self: false }
    }
  });

  const members = new Map<string, RemotePlayer>();
  const publishPlayers = () => {
    onPlayers(Array.from(members.values()).filter((player) => player.userId !== user.id));
  };

  channel
    .on("presence", { event: "sync" }, () => {
      members.clear();
      const presence = channel.presenceState<PresencePayload>();
      Object.values(presence).flat().forEach((player) => {
        members.set(player.userId, player);
      });
      publishPlayers();
    })
    .on("broadcast", { event: "avatar-position" }, ({ payload }) => {
      const player = payload as RemotePlayer;
      if (!player?.userId || player.userId === user.id) return;
      members.set(player.userId, player);
      publishPlayers();
    });

  void channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({
        userId: user.id,
        displayName: user.displayName,
        outfitColor: user.outfitColor,
        x: 0,
        z: 2.6
      });
    }
  });

  return {
    publishPosition(position) {
      void channel.send({
        type: "broadcast",
        event: "avatar-position",
        payload: {
          userId: user.id,
          displayName: user.displayName,
          outfitColor: user.outfitColor,
          x: position.x,
          z: position.z
        }
      });
    },
    close() {
      void client.removeChannel(channel);
    }
  };
}
