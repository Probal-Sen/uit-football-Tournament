"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import io, { Socket } from "socket.io-client";

type Team = {
  _id: string;
  name: string;
  department: string;
  logoUrl?: string;
  coachName?: string;
  captainName?: string;
};

type Player = {
  _id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  photoUrl?: string;
  team: Team;
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
  goals?: Goal[];
};

type PointsRow = {
  _id: string;
  team: Team | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type TopScorer = {
  playerId: string;
  playerName: string;
  teamName: string;
  goals: number;
};

const SOCKET_BASE =
  process.env.NEXT_PUBLIC_SOCKET_BASE || "http://localhost:4000";

export default function Home() {
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [pointsTable, setPointsTable] = useState<PointsRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<Record<string, Player[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  async function getTopScorers(): Promise<TopScorer[]> {
    try {
      return await apiFetch<TopScorer[]>("/points/top-scorers");
    } catch (err) {
      console.error("Failed to fetch top scorers:", err);
      return [];
    }
  }
  
  async function loadData() {
    try {
      const [matchesData, pointsData, teamsData, scorersData] = await Promise.all([
        apiFetch<Match[]>("/matches/live").catch(() => []),
        apiFetch<PointsRow[]>("/points").catch(() => []),
        apiFetch<Team[]>("/teams").catch(() => []),
        getTopScorers(),
      ]);

      setLiveMatches(matchesData);
      setPointsTable(pointsData);
      setTeams(teamsData);
      setTopScorers(scorersData);

      // Load players for each team
      const playersMap: Record<string, Player[]> = {};
      for (const team of teamsData) {
        try {
          const players = await apiFetch<Player[]>(`/players?teamId=${team._id}`);
          playersMap[team._id] = players;
        } catch {
          playersMap[team._id] = [];
        }
      }
      setTeamPlayers(playersMap);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();

    // Set up Socket.io for real-time updates
    const socket = io(SOCKET_BASE, {
      transports: ["websocket", "polling"],
    });

    socket.on("matchUpdated", (match: Match) => {
      if (match.status === "live") {
        setLiveMatches((prev) => {
          const existing = prev.findIndex((m) => m._id === match._id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = match;
            return updated;
          } else {
            return [...prev, match];
          }
        });
      } else {
        // Remove if no longer live
        setLiveMatches((prev) => prev.filter((m) => m._id !== match._id));
      }
      // Reload points table and top scorers when match is completed
      if (match.status === "completed") {
        void apiFetch<PointsRow[]>("/points")
          .then(setPointsTable)
          .catch(() => {});
        void getTopScorers().then(setTopScorers).catch(() => {});
      }
      // Reload top scorers when goals are updated
      if (match.goals && match.goals.length > 0) {
        void getTopScorers().then(setTopScorers).catch(() => {});
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="stack gap-md">
        <div className="section-header">
          <div>
            <h1 className="section-heading">
              UIT Burdwan University Inter-Department Football Tournament
            </h1>
            <p className="section-description">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack gap-md">
      <div className="section-header">
        <div>
          <h1 className="section-heading">
            UIT Burdwan University Inter-Department Football Tournament
          </h1>
          <p className="section-description">
            Live updates, standings, and registered teams.
          </p>
        </div>
      </div>

      {/* Live Matches Section */}
      <div>
        <h2 className="section-heading" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Live Matches
        </h2>
        {liveMatches.length === 0 ? (
          <div className="card">
            <p className="muted">No live matches at the moment.</p>
            <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
              Check the <a href="/fixtures">Fixtures</a> page for upcoming matches.
            </p>
          </div>
        ) : (
          <div className="stack gap-md">
            {liveMatches.map((match) => (
              <div key={match._id} className="card">
                <div className="flex-between mb-md">
                  <div>
                    <div className="card-title">
                      {match.teamA.name} vs {match.teamB.name}
                    </div>
                    <div className="muted">
                      {match.venue} · {new Date(match.date).toLocaleString()}
                    </div>
                  </div>
                  <span
                    className="status-pill status-live"
                    style={{ fontSize: "0.875rem" }}
                  >
                    LIVE
                  </span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "bold", textAlign: "center" }}>
                  {match.scoreA} : {match.scoreB}
                </div>
                {match.goals && match.goals.length > 0 && (
                  <div style={{ marginTop: "1rem" }}>
                    <div className="muted" style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      Goals:
                    </div>
                    <div className="stack gap-sm">
                      {match.goals.map((goal, idx) => (
                        <div key={idx} className="muted" style={{ fontSize: "0.875rem" }}>
                          {goal.minute}' -{" "}
                          {goal.player ? goal.player.name : "Unknown"} (
                          {typeof goal.team === "object" ? goal.team.name : "Unknown Team"})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Goal Scorers Section */}
      {topScorers.length > 0 && (
        <div>
          <h2 className="section-heading" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Top Goal Scorers
          </h2>
          <div className="card">
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Goals</th>
                  </tr>
                </thead>
                <tbody>
                  {topScorers.map((scorer, index) => (
                    <tr key={scorer.playerId}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{scorer.playerName}</strong>
                      </td>
                      <td className="muted">{scorer.teamName}</td>
                      <td>
                        <strong style={{ fontSize: "1.25rem", color: "#3b82f6" }}>
                          {scorer.goals}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Points Table Section */}
      <div>
        <h2 className="section-heading" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Points Table
        </h2>
        {pointsTable.length === 0 ? (
          <div className="card">
            <p className="muted">
              The points table is not published yet. It will appear here once enabled by
              the admin panel.
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="scroll-x">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>GD</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTable.map((row, index) => (
                    <tr key={row._id}>
                      <td>{index + 1}</td>
                      <td>
                        <div>
                          {row.team && row.team !== null && typeof row.team === "object"
                            ? row.team.name || "Unknown Team"
                            : "Unknown Team (Deleted)"}
                        </div>
                        <div className="muted text-xs">
                          {row.team && row.team !== null && typeof row.team === "object" && row.team.department
                            ? `${row.team.department} Department`
                            : ""}
                        </div>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.wins}</td>
                      <td>{row.draws}</td>
                      <td>{row.losses}</td>
                      <td>{row.goalsFor}</td>
                      <td>{row.goalsAgainst}</td>
                      <td>{row.goalDifference}</td>
                      <td>
                        <strong>{row.points}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Registered Teams Section */}
      <div>
        <h2 className="section-heading" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          Registered Teams
        </h2>
        {teams.length === 0 ? (
          <div className="card">
            <p className="muted">No teams have been published yet.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {teams.map((team) => {
              const players = teamPlayers[team._id] || [];

              return (
                <div
                  key={team._id}
                  className="card"
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onClick={() => setSelectedTeam(team)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
                        style={{
                          width: "60px",
                          height: "60px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #ccc",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          background: "#e5e7eb",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                          fontWeight: "bold",
                          color: "#6b7280",
                        }}
                      >
                        {team.department}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="card-title" style={{ fontSize: "1.125rem" }}>
                        {team.name}
                      </div>
                      <div className="muted" style={{ fontSize: "0.875rem" }}>
                        {team.department} Department
                      </div>
                      {team.coachName && (
                        <div className="muted" style={{ fontSize: "0.75rem" }}>
                          Coach: {team.coachName}
                        </div>
                      )}
                      {team.captainName && (
                        <div className="muted" style={{ fontSize: "0.75rem" }}>
                          Captain: {team.captainName}
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.875rem",
                          color: "#3b82f6",
                          fontWeight: "500",
                        }}
                      >
                        {players.length} Players · Click to view
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team Players Modal */}
      {selectedTeam && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-between mb-md">
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                {selectedTeam.logoUrl ? (
                  <img
                    src={selectedTeam.logoUrl}
                    alt={selectedTeam.name}
                    style={{
                      width: "80px",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #ccc",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      background: "#e5e7eb",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#6b7280",
                    }}
                  >
                    {selectedTeam.department}
                  </div>
                )}
                <div>
                  <h2 className="card-title" style={{ fontSize: "1.5rem" }}>
                    {selectedTeam.name}
                  </h2>
                  <div className="muted">{selectedTeam.department} Department</div>
                  {selectedTeam.coachName && (
                    <div className="muted" style={{ fontSize: "0.875rem" }}>
                      Coach: {selectedTeam.coachName}
                    </div>
                  )}
                  {selectedTeam.captainName && (
                    <div className="muted" style={{ fontSize: "0.875rem" }}>
                      Captain: {selectedTeam.captainName}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "0.5rem",
                }}
              >
                ×
              </button>
            </div>

            <div>
              <h3 className="section-heading" style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
                Squad Players ({teamPlayers[selectedTeam._id]?.length || 0})
              </h3>
              {teamPlayers[selectedTeam._id] && teamPlayers[selectedTeam._id].length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {teamPlayers[selectedTeam._id].map((player) => (
                    <div
                      key={player._id}
                      className="card"
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                      }}
                    >
                      {player.photoUrl ? (
                        <img
                          src={player.photoUrl}
                          alt={player.name}
                          style={{
                            width: "100%",
                            maxWidth: "120px",
                            height: "120px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            border: "1px solid #ccc",
                            margin: "0 auto 0.5rem",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            maxWidth: "120px",
                            height: "120px",
                            background: "#e5e7eb",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2rem",
                            fontWeight: "bold",
                            color: "#6b7280",
                            margin: "0 auto 0.5rem",
                          }}
                        >
                          #{player.jerseyNumber}
                        </div>
                      )}
                      <div className="card-title" style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>
                        {player.name}
                      </div>
                      <div className="muted" style={{ fontSize: "0.875rem" }}>
                        #{player.jerseyNumber}
                      </div>
                      <div className="muted" style={{ fontSize: "0.75rem" }}>
                        {player.position}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No players have been added to this team yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
