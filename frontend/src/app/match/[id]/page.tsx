"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import io, { Socket } from "socket.io-client";
import Link from "next/link";

type Team = {
  _id: string;
  name: string;
  department: string;
  logoUrl?: string;
};

type Player = {
  _id: string;
  name: string;
  position: string;
  team: Team | string;
};

type Goal = {
  player?: Player | string;
  team?: Team | string;
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
  goals?: Goal[];
  teamALineup?: {
    goalkeeper?: Player | string | null;
    players?: (Player | string)[];
  };
  teamBLineup?: {
    goalkeeper?: Player | string | null;
    players?: (Player | string)[];
  };
  substitutions?: Array<{
    team: string | Team;
    playerOut: string | Player;
    playerIn: string | Player;
    minute: number;
  }>;
};

type Substitution = {
  playerOut: string;
  playerIn: string;
  minute: number;
  team: string;
};

const SOCKET_BASE = process.env.NEXT_PUBLIC_SOCKET_BASE || "http://localhost:4000";

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lineups">("lineups");
  const [currentMinute, setCurrentMinute] = useState(0);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function loadMatch() {
      try {
        const [matchesData, playersData] = await Promise.all([
          apiFetch<Match[]>(`/matches/all`),
          apiFetch<Player[]>("/players/all").catch(() => []),
        ]);
        
        const matchData = matchesData.find((m: Match) => m._id === matchId);
        
        if (!matchData) {
          router.push("/");
          return;
        }
        
        setMatch(matchData);
        setPlayers(playersData);
        
        // Calculate current minute based on match start time
        const matchStart = new Date(matchData.date);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - matchStart.getTime()) / (1000 * 60));
        setCurrentMinute(Math.max(0, Math.min(90, diffMinutes)));
      } catch (err) {
        console.error("Failed to load match:", err);
        router.push("/");
      } finally {
        setLoading(false);
      }
    }

    void loadMatch();

    // Set up Socket.io for real-time updates
    const socket = io(SOCKET_BASE, {
      transports: ["websocket", "polling"],
    });

    socket.on("matchUpdated", (updatedMatch: Match) => {
      if (updatedMatch._id === matchId) {
        setMatch(updatedMatch);
        // Update current minute
        const matchStart = new Date(updatedMatch.date);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - matchStart.getTime()) / (1000 * 60));
        setCurrentMinute(Math.max(0, Math.min(90, diffMinutes)));
      }
    });

    // Update minute every minute
    const minuteInterval = setInterval(() => {
      if (match) {
        const matchStart = new Date(match.date);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - matchStart.getTime()) / (1000 * 60));
        setCurrentMinute(Math.max(0, Math.min(90, diffMinutes)));
      }
    }, 60000);

    return () => {
      socket.disconnect();
      clearInterval(minuteInterval);
    };
  }, [matchId, router, match]);

  // Helper to get player name
  function getPlayerName(playerId: string | Player | undefined): string {
    if (!playerId) return "Unknown";
    if (typeof playerId === "string") {
      const player = players.find((p) => p._id === playerId);
      return player?.name || "Unknown";
    }
    return playerId.name || "Unknown";
  }

  // Helper to get team name
  function getTeamName(teamId: string | Team | undefined): string {
    if (!teamId) return "Unknown";
    if (typeof teamId === "string") {
      if (match) {
        if (match.teamA._id === teamId) return match.teamA.name;
        if (match.teamB._id === teamId) return match.teamB.name;
      }
      return "Unknown";
    }
    return teamId.name || "Unknown";
  }

  // Get lineup players
  function getLineupPlayers(teamLineup: Match["teamALineup"] | undefined): Player[] {
    if (!teamLineup) return [];
    
    const goalkeeperId = teamLineup.goalkeeper
      ? (typeof teamLineup.goalkeeper === "object" ? teamLineup.goalkeeper._id : teamLineup.goalkeeper)
      : null;
    const playerIds = (teamLineup.players || []).map((p) =>
      typeof p === "object" ? p._id : p
    );
    
    const allIds = goalkeeperId ? [goalkeeperId, ...playerIds] : playerIds;
    return players.filter((p) => allIds.includes(p._id));
  }

  // Get bench players (not in lineup)
  function getBenchPlayers(teamId: string, teamLineup: Match["teamALineup"] | undefined): Player[] {
    const lineupPlayers = getLineupPlayers(teamLineup);
    const lineupIds = lineupPlayers.map((p) => p._id);
    
    return players.filter((p) => {
      const pTeamId = typeof p.team === "object" ? p.team._id : p.team;
      return pTeamId === teamId && !lineupIds.includes(p._id);
    });
  }

  // Check if player is goalkeeper
  function isGoalkeeper(playerId: string, teamLineup: Match["teamALineup"] | undefined): boolean {
    if (!teamLineup || !teamLineup.goalkeeper) return false;
    const gkId = typeof teamLineup.goalkeeper === "object" 
      ? teamLineup.goalkeeper._id 
      : teamLineup.goalkeeper;
    return playerId === gkId;
  }

  if (loading) {
    return (
      <div className="stack gap-md">
        <p className="muted">Loading match details...</p>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="stack gap-md">
        <p className="muted">Match not found.</p>
        <Link href="/" className="btn">
          Go Home
        </Link>
      </div>
    );
  }

  const teamALineupPlayers = getLineupPlayers(match.teamALineup);
  const teamBLineupPlayers = getLineupPlayers(match.teamBLineup);
  const teamABench = getBenchPlayers(match.teamA._id, match.teamALineup);
  const teamBBench = getBenchPlayers(match.teamB._id, match.teamBLineup);

  // Get goals sorted by minute
  const sortedGoals = [...(match.goals || [])].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  // Get substitutions sorted by minute
  const sortedSubstitutions = [...(match.substitutions || [])].sort((a, b) => a.minute - b.minute);

  // Get substitutions for a team
  function getTeamSubstitutions(teamId: string) {
    return sortedSubstitutions.filter((sub) => {
      const subTeamId = typeof sub.team === "object" ? sub.team._id : sub.team;
      return subTeamId === teamId;
    });
  }

  return (
    <div className="stack gap-md">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <Link href="/" className="btn" style={{ fontSize: "0.875rem" }}>
          ← Back
        </Link>
        <div style={{ flex: 1 }}>
          <h1 className="section-heading" style={{ fontSize: "clamp(1rem, 4vw, 1.25rem)" }}>
            Match Details
          </h1>
        </div>
        {match.status === "live" && (
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: "600",
              backgroundColor: "rgba(239, 68, 68, 0.2)",
              color: "#fecaca",
            }}
          >
            LIVE {currentMinute}'
          </span>
        )}
      </div>

      {/* Match Score Card */}
      <div
        className="card"
        style={{
          background: "rgba(15, 23, 42, 0.9)",
          border: "1px solid rgba(148, 163, 184, 0.4)",
          borderRadius: "1rem",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: "0.5rem",
            }}
          >
            UNIVERSITY INSTITUTE OF TECHNOLOGY
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: "700",
              color: "#e5e7eb",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
            }}
          >
            INTER-DEPARTMENT FOOTBALL TOURNAMENT
          </div>
        </div>

        {/* Score Display */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto 1fr",
            gap: "2rem",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          {/* Team A */}
          <div style={{ textAlign: isMobile ? "center" : "right" }}>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "#e5e7eb",
                marginBottom: "0.5rem",
              }}
            >
              {match.teamA.name}
            </div>
            <div style={{ fontSize: "3rem", fontWeight: "700", color: "#22c55e" }}>
              {match.scoreA}
            </div>
            {/* Scorers for Team A */}
            {sortedGoals
              .filter((g) => {
                const teamId = typeof g.team === "object" ? g.team._id : g.team;
                return teamId === match.teamA._id;
              })
              .map((goal, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  {getPlayerName(goal.player)} {goal.minute}'
                </div>
              ))}
          </div>

          {/* Separator */}
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              color: "#e5e7eb",
              textAlign: "center",
            }}
          >
            :
          </div>

          {/* Team B */}
          <div style={{ textAlign: isMobile ? "center" : "left" }}>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "#e5e7eb",
                marginBottom: "0.5rem",
              }}
            >
              {match.teamB.name}
            </div>
            <div style={{ fontSize: "3rem", fontWeight: "700", color: "#22c55e" }}>
              {match.scoreB}
            </div>
            {/* Scorers for Team B */}
            {sortedGoals
              .filter((g) => {
                const teamId = typeof g.team === "object" ? g.team._id : g.team;
                return teamId === match.teamB._id;
              })
              .map((goal, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  {getPlayerName(goal.player)} {goal.minute}'
                </div>
              ))}
          </div>
        </div>

        {/* Match Info */}
        <div
          style={{
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--muted)",
            paddingTop: "1rem",
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
          }}
        >
          {match.venue} · {new Date(match.date).toLocaleDateString()} ·{" "}
          {new Date(match.date).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={() => setActiveTab("lineups")}
          style={{
            padding: "0.75rem 1.5rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "lineups" ? "2px solid #22c55e" : "2px solid transparent",
            color: activeTab === "lineups" ? "#22c55e" : "var(--muted)",
            fontWeight: activeTab === "lineups" ? "600" : "400",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          LINEUPS
        </button>
      </div>

      {/* Lineups Tab */}
      {activeTab === "lineups" && (
        <div className="stack gap-lg">
          {/* Team A Lineup */}
          <div className="card">
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                marginBottom: "1rem",
                color: "#e5e7eb",
              }}
            >
              {match.teamA.name}
            </h3>

            {/* Playing 7 */}
            <div style={{ marginBottom: "2rem" }}>
              <h4
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--muted)",
                  marginBottom: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Playing 7
              </h4>
              <div className="stack gap-sm">
                {teamALineupPlayers.map((player) => {
                  const isGK = isGoalkeeper(player._id, match.teamALineup);
                  return (
                    <div
                      key={player._id}
                      style={{
                        padding: "0.75rem",
                        background: "rgba(15, 23, 42, 0.5)",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: "600", color: "#e5e7eb" }}>
                          {player.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                            marginLeft: "0.5rem",
                          }}
                        >
                          {player.position}
                        </span>
                        {isGK && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "#22c55e",
                              marginLeft: "0.5rem",
                              fontWeight: "600",
                            }}
                          >
                            (GK)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Substitutes */}
            {teamABench.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "var(--muted)",
                    marginBottom: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Substitutes
                </h4>
                <div className="stack gap-sm">
                  {teamABench.map((player) => (
                    <div
                      key={player._id}
                      style={{
                        padding: "0.75rem",
                        background: "rgba(15, 23, 42, 0.3)",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(148, 163, 184, 0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: "500", color: "#e5e7eb" }}>
                          {player.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                            marginLeft: "0.5rem",
                          }}
                        >
                          {player.position}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Team B Lineup */}
          <div className="card">
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                marginBottom: "1rem",
                color: "#e5e7eb",
              }}
            >
              {match.teamB.name}
            </h3>

            {/* Playing 7 */}
            <div style={{ marginBottom: "2rem" }}>
              <h4
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--muted)",
                  marginBottom: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Playing 7
              </h4>
              <div className="stack gap-sm">
                {teamBLineupPlayers.map((player) => {
                  const isGK = isGoalkeeper(player._id, match.teamBLineup);
                  return (
                    <div
                      key={player._id}
                      style={{
                        padding: "0.75rem",
                        background: "rgba(15, 23, 42, 0.5)",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: "600", color: "#e5e7eb" }}>
                          {player.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                            marginLeft: "0.5rem",
                          }}
                        >
                          {player.position}
                        </span>
                        {isGK && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "#22c55e",
                              marginLeft: "0.5rem",
                              fontWeight: "600",
                            }}
                          >
                            (GK)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Substitutes */}
            <div>
              <h4
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--muted)",
                  marginBottom: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Substitutes
              </h4>
              {teamBBench.length > 0 ? (
                <div className="stack gap-sm">
                  {teamBBench.map((player) => {
                    // Check if this player came in as a substitute
                    const substitution = sortedSubstitutions.find((sub) => {
                      const playerInId = typeof sub.playerIn === "object" ? sub.playerIn._id : sub.playerIn;
                      return playerInId === player._id && 
                        (typeof sub.team === "object" ? sub.team._id : sub.team) === match.teamB._id;
                    });
                    
                    return (
                      <div
                        key={player._id}
                        style={{
                          padding: "0.75rem",
                          background: substitution ? "rgba(34, 197, 94, 0.1)" : "rgba(15, 23, 42, 0.3)",
                          borderRadius: "0.5rem",
                          border: substitution ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(148, 163, 184, 0.1)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: "500", color: "#e5e7eb" }}>
                            {player.name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--muted)",
                              marginLeft: "0.5rem",
                            }}
                          >
                            {player.position}
                          </span>
                          {substitution && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "#22c55e",
                                marginLeft: "0.5rem",
                                fontWeight: "600",
                              }}
                            >
                              IN {substitution.minute}'
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted" style={{ fontSize: "0.875rem" }}>
                  No substitutes available
                </p>
              )}
              
              {/* Show players who were substituted out */}
              {getTeamSubstitutions(match.teamB._id).length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h5
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      color: "var(--muted)",
                      marginBottom: "0.5rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Substitution History
                  </h5>
                  <div className="stack gap-sm">
                    {getTeamSubstitutions(match.teamB._id).map((sub, idx) => {
                      const playerOutName = getPlayerName(sub.playerOut);
                      const playerInName = getPlayerName(sub.playerIn);
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "0.5rem",
                            background: "rgba(239, 68, 68, 0.1)",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            color: "var(--muted)",
                          }}
                        >
                          <span style={{ color: "#ef4444" }}>{playerOutName}</span>
                          {" OUT "}
                          <span style={{ color: "#22c55e" }}>{playerInName}</span>
                          {" IN "}
                          {sub.minute}'
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

