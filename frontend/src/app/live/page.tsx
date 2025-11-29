/* eslint-disable @next/next/no-async-client-component */
"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";
import { apiFetch } from "@/lib/api";

type Team = {
  _id: string;
  name: string;
  department: string;
};

type Goal = {
  player?: {
    _id: string;
    name: string;
  };
  team?: Team;
  minute?: number;
};

type Match = {
  _id: string;
  teamA: Team;
  teamB: Team;
  date: string;
  venue: string;
  status: "upcoming" | "live" | "completed";
  scoreA: number;
  scoreB: number;
  goals: Goal[];
};

const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_BASE || "http://localhost:4000";

async function fetchLiveMatches(): Promise<Match[]> {
  return apiFetch<Match[]>("/matches/live");
}

export default function LivePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Using ReturnType<typeof io> ensures proper TypeScript typing
    let socket: ReturnType<typeof io> | undefined;

    async function init() {
      try {
        const initialMatches = await fetchLiveMatches();
        setMatches(initialMatches);
      } catch (err) {
        console.error("Failed to fetch live matches:", err);
      } finally {
        setLoading(false);
      }

      // Initialize socket
      socket = io(SOCKET_BASE, {
        transports: ["websocket"], // ensures WebSocket transport
       // @ts-ignore
        withCredentials: true,// works if server CORS allows credentials
      });

      // Listen for match updates
      socket.on("matchUpdated", (updated: Match) => {
        setMatches((current) => {
          const exists = current.find((m) => m._id === updated._id);
          if (exists) {
            return current.map((m) => (m._id === updated._id ? updated : m));
          }
          if (updated.status === "live") {
            return [...current, updated];
          }
          return current;
        });
      });
    }

    void init();

    // Cleanup on unmount
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <div className="stack gap-md">
      <div className="section-header">
        <div>
          <h1 className="section-heading">Live Match Center</h1>
          <p className="section-description">
            Real-time scores and goal updates during live fixtures.
          </p>
        </div>
        <span className="badge-live">
          <span className="badge-live-dot" />
          Live via Socket.io
        </span>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading live matches…</p>
        ) : matches.length === 0 ? (
          <p className="muted">
            There are currently no live matches. Check back when a fixture is
            in progress.
          </p>
        ) : (
          <div className="stack gap-md">
            {matches.map((m) => (
              <div key={m._id} className="card">
                <div className="flex-between">
                  <div>
                    <div className="card-title">
                      {m.teamA.name} vs {m.teamB.name}
                    </div>
                    <div className="meta-row">
                      <span className="tag">
                        {m.teamA.department} · {m.teamB.department}
                      </span>
                      <span className="tag">{m.venue}</span>
                      <span className="tag">
                        Kickoff:{" "}
                        {new Date(m.date).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="hero-title">
                      {m.scoreA} : {m.scoreB}
                    </div>
                    <div className="status-pill status-live mt-sm">LIVE</div>
                  </div>
                </div>

                {m.goals && m.goals.length > 0 && (
                  <div className="mt-md">
                    <div className="section-description">Goal scorers</div>
                    <ul className="mt-sm" style={{ listStyle: "none" }}>
                      {m.goals.map((g, idx) => (
                        <li key={idx} className="meta-row">
                          <span className="tag">
                            {g.minute != null ? `${g.minute}'` : "Goal"}
                          </span>
                          <span>
                            {g.player?.name || "Unknown player"} (
                            {g.team?.name || "Team"})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
