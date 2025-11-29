"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Team = {
  _id: string;
  name: string;
  department: string;
  isPublished: boolean;
};

type Player = {
  _id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  department: string;
  team: string | Team;
  photoUrl?: string;
  isPublished: boolean;
};

type Goal = {
  player?: Player;
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
  isPublished: boolean;
};

const DEPARTMENTS = ["CSE", "IT", "ECE", "EE", "CE", "AEIE"];

export default function AdminDashboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pointsTable, setPointsTable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [scoreForm, setScoreForm] = useState({
    scoreA: 0,
    scoreB: 0,
    goals: [] as Goal[],
  });
  const [newGoal, setNewGoal] = useState({
    player: "",
    team: "",
    minute: "",
  });

  // Match form state
  const [matchForm, setMatchForm] = useState({
    teamA: "",
    teamB: "",
    date: "",
    venue: "",
    status: "upcoming" as "upcoming" | "live" | "completed",
  });

  // Team form state
  const [teamForm, setTeamForm] = useState({
    name: "",
    department: "CSE",
    logoUrl: "",
    coachName: "",
    captainName: "",
  });

  // Player form state
  const [playerForm, setPlayerForm] = useState({
    name: "",
    jerseyNumber: "",
    position: "",
    department: "CSE",
    team: "",
    photoUrl: "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [teamsData, matchesData, playersData, pointsData] = await Promise.all([
        apiFetch<Team[]>("/teams/all"),
        apiFetch<Match[]>("/matches/all"),
        apiFetch<Player[]>("/players/all"),
        apiFetch<any[]>("/points/all").catch(() => []), // Points might not exist yet
      ]);
      setTeams(teamsData);
      setMatches(matchesData);
      setPlayers(playersData);
      setPointsTable(pointsData);
    } catch (err: any) {
      setError(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  function openScoreEditor(match: Match) {
    setEditingMatch(match);
    setScoreForm({
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      goals: match.goals || [],
    });
    setNewGoal({ player: "", team: "", minute: "" });
  }

  function addGoal() {
    if (!newGoal.team || !newGoal.minute || !newGoal.player) {
      setError("Please select team, player, and enter minute for the goal.");
      return;
    }
    if (!editingMatch) return;
    
    const teamObj =
      editingMatch.teamA._id === newGoal.team
        ? editingMatch.teamA
        : editingMatch.teamB;
    
    const playerObj = players.find((p) => p._id === newGoal.player);
    if (!playerObj) {
      setError("Selected player not found.");
      return;
    }
    
    const goal: Goal = {
      team: teamObj,
      player: playerObj,
      minute: parseInt(newGoal.minute),
    };
    
    setScoreForm({
      ...scoreForm,
      goals: [...scoreForm.goals, goal],
    });
    setNewGoal({ player: "", team: "", minute: "" });
    setError(null);
  }

  function removeGoal(index: number) {
    setScoreForm({
      ...scoreForm,
      goals: scoreForm.goals.filter((_, i) => i !== index),
    });
  }

  async function saveScore() {
    if (!editingMatch) return;
    try {
      await apiFetch(`/matches/${editingMatch._id}/score`, {
        method: "POST",
        body: JSON.stringify({
          scoreA: scoreForm.scoreA,
          scoreB: scoreForm.scoreB,
          goals: scoreForm.goals.map((g) => ({
            player: typeof g.player === "object" ? g.player._id : g.player,
            team: typeof g.team === "object" ? g.team._id : g.team,
            minute: g.minute,
          })),
        }),
      });
      setEditingMatch(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update score");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/matches", {
        method: "POST",
        body: JSON.stringify({
          teamA: matchForm.teamA,
          teamB: matchForm.teamB,
          date: new Date(matchForm.date).toISOString(),
          venue: matchForm.venue,
          status: matchForm.status,
          scoreA: 0,
          scoreB: 0,
          goals: [],
        }),
      });
      setShowMatchForm(false);
      setMatchForm({
        teamA: "",
        teamB: "",
        date: "",
        venue: "",
        status: "upcoming",
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create match");
    }
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/teams", {
        method: "POST",
        body: JSON.stringify({
          name: teamForm.name,
          department: teamForm.department,
          logoUrl: teamForm.logoUrl || undefined,
          coachName: teamForm.coachName || undefined,
          captainName: teamForm.captainName || undefined,
          isPublished: false,
        }),
      });
      setShowTeamForm(false);
      setTeamForm({
        name: "",
        department: "CSE",
        logoUrl: "",
        coachName: "",
        captainName: "",
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to create team");
    }
  }

  function openPlayerForm(player?: Player) {
    if (player) {
      setEditingPlayer(player);
      setPlayerForm({
        name: player.name,
        jerseyNumber: player.jerseyNumber.toString(),
        position: player.position,
        department: player.department,
        team: typeof player.team === "object" ? player.team._id : player.team,
        photoUrl: player.photoUrl || "",
      });
    } else {
      setEditingPlayer(null);
      setPlayerForm({
        name: "",
        jerseyNumber: "",
        position: "",
        department: "CSE",
        team: "",
        photoUrl: "",
      });
    }
    setShowPlayerForm(true);
  }

  async function savePlayer(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingPlayer) {
        await apiFetch(`/players/${editingPlayer._id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: playerForm.name,
            jerseyNumber: parseInt(playerForm.jerseyNumber),
            position: playerForm.position,
            department: playerForm.department,
            team: playerForm.team,
            photoUrl: playerForm.photoUrl || undefined,
          }),
        });
      } else {
        await apiFetch("/players", {
          method: "POST",
          body: JSON.stringify({
            name: playerForm.name,
            jerseyNumber: parseInt(playerForm.jerseyNumber),
            position: playerForm.position,
            department: playerForm.department,
            team: playerForm.team,
            photoUrl: playerForm.photoUrl || undefined,
            isPublished: false,
          }),
        });
      }
      setShowPlayerForm(false);
      setEditingPlayer(null);
      setPlayerForm({
        name: "",
        jerseyNumber: "",
        position: "",
        department: "CSE",
        team: "",
        photoUrl: "",
      });
      await load();
      setSuccess(editingPlayer ? "Player updated successfully!" : "Player created successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to save player");
    }
  }

  async function deletePlayer(playerId: string) {
    if (!confirm("Are you sure you want to delete this player?")) return;
    try {
      await apiFetch(`/players/${playerId}`, { method: "DELETE" });
      await load();
      setSuccess("Player deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete player");
    }
  }

  async function publishPlayer(playerId: string, isPublished: boolean) {
    try {
      await apiFetch(`/players/${playerId}/publish`, {
        method: "POST",
        body: JSON.stringify({ isPublished }),
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update publish status");
    }
  }

  async function toggleMatchStatus(matchId: string, status: Match["status"]) {
    try {
      await apiFetch(`/matches/${matchId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update match status");
    }
  }

  async function publishMatch(matchId: string, isPublished: boolean) {
    try {
      await apiFetch(`/matches/${matchId}/publish`, {
        method: "POST",
        body: JSON.stringify({ isPublished }),
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update publish status");
    }
  }

  async function publishTeam(teamId: string, isPublished: boolean) {
    try {
      await apiFetch(`/teams/${teamId}/publish`, {
        method: "POST",
        body: JSON.stringify({ isPublished }),
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update publish status");
    }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("Are you sure you want to delete this team? This will also delete all players in this team.")) return;
    try {
      await apiFetch(`/teams/${teamId}`, { method: "DELETE" });
      await load();
      setSuccess("Team deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete team");
    }
  }

  async function deleteMatch(matchId: string) {
    if (!confirm("Are you sure you want to delete this match?")) return;
    try {
      await apiFetch(`/matches/${matchId}`, { method: "DELETE" });
      await load();
      setSuccess("Match deleted successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to delete match");
    }
  }

  async function recalcPoints(publishAfter: boolean) {
    try {
      setError(null);
      setSuccess(null);
      const completedMatches = matches.filter((m) => m.status === "completed");
      if (completedMatches.length === 0) {
        setError("No completed matches found. Mark some matches as 'Completed' first.");
        return;
      }
      await apiFetch("/points/recalculate", { method: "POST" });
      if (publishAfter) {
        await apiFetch("/points/publish", {
          method: "POST",
          body: JSON.stringify({ isPublished: true }),
        });
        setSuccess("Points table recalculated and published successfully!");
      } else {
        setSuccess("Points table recalculated. Click 'Publish' to make it public.");
      }
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update points table");
    }
  }

  async function publishPointsTable(isPublished: boolean) {
    try {
      setError(null);
      setSuccess(null);
      await apiFetch("/points/publish", {
        method: "POST",
        body: JSON.stringify({ isPublished }),
      });
      setSuccess(
        isPublished
          ? "Points table published successfully!"
          : "Points table hidden from public view."
      );
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update publish status");
    }
  }

  async function cleanupOrphanedEntries() {
    if (!confirm("Are you sure you want to delete all points table entries for teams that no longer exist?")) return;
    try {
      setError(null);
      setSuccess(null);
      const result = await apiFetch<{ message: string; deletedCount: number }>("/points/cleanup", {
        method: "POST",
      });
      setSuccess(`Cleaned up ${result.deletedCount} orphaned entries successfully!`);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to cleanup orphaned entries");
    }
  }

  return (
    <div className="stack gap-md">
      <div className="section-header">
        <div>
          <h1 className="section-heading">Admin Dashboard</h1>
          <p className="section-description">
            Manage teams, fixtures, control live status and approve the points table.
          </p>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert" style={{ background: "#10b981", color: "white" }}>
          {success}
        </div>
      )}
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="stack gap-md">
            <div>
              <div className="admin-section-title">Quick Actions</div>
            </div>
            <div className="stack gap-sm">
              <button
                className="btn btn-primary"
                onClick={() => setShowTeamForm(!showTeamForm)}
              >
                {showTeamForm ? "Cancel" : "+ Add Team"}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => openPlayerForm()}
                disabled={teams.length === 0}
              >
                + Add Player
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowMatchForm(!showMatchForm)}
                disabled={teams.length < 2}
              >
                {showMatchForm ? "Cancel" : "+ Add Match"}
              </button>
              {teams.length < 2 && (
                <p className="muted" style={{ fontSize: "0.875rem" }}>
                  Need at least 2 teams to create a match
                </p>
              )}
              {teams.length === 0 && (
                <p className="muted" style={{ fontSize: "0.875rem" }}>
                  Create a team first to add players
                </p>
              )}
            </div>
            <div className="stack gap-sm">
              <div className="admin-section-title" style={{ fontSize: "0.875rem" }}>
                Points Table
              </div>
              <button
                className="btn btn-primary"
                onClick={() => recalcPoints(true)}
                disabled={loading}
              >
                Recalculate & Publish
              </button>
              <button
                className="btn"
                onClick={() => recalcPoints(false)}
                disabled={loading}
              >
                Recalculate Only
              </button>
              <button
                className="btn"
                onClick={() => cleanupOrphanedEntries()}
                disabled={loading}
                style={{ marginTop: "0.5rem" }}
              >
                Cleanup Orphaned Entries
              </button>
              {pointsTable.length > 0 && (
                <>
                  <button
                    className="btn"
                    onClick={() => publishPointsTable(true)}
                    disabled={loading}
                  >
                    Publish Table
                  </button>
                  <button
                    className="btn"
                    onClick={() => publishPointsTable(false)}
                    disabled={loading}
                  >
                    Hide Table
                  </button>
                </>
              )}
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {matches.filter((m) => m.status === "completed").length} completed
                match(es)
              </p>
            </div>
          </div>
        </aside>
        <section className="admin-main">
          {loading ? (
            <p className="muted">Loading data…</p>
          ) : (
            <div className="stack gap-md">
              {showTeamForm && (
                <div className="card">
                  <h2 className="admin-section-title">Create New Team</h2>
                  <form onSubmit={createTeam} className="form">
                    <div className="field">
                      <label htmlFor="team-name">Team Name *</label>
                      <input
                        id="team-name"
                        className="input"
                        type="text"
                        value={teamForm.name}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="team-department">Department *</label>
                      <select
                        id="team-department"
                        className="input"
                        value={teamForm.department}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, department: e.target.value })
                        }
                        required
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="team-coach">Coach Name (optional)</label>
                      <input
                        id="team-coach"
                        className="input"
                        type="text"
                        value={teamForm.coachName}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, coachName: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="team-captain">Captain Name (optional)</label>
                      <input
                        id="team-captain"
                        className="input"
                        type="text"
                        value={teamForm.captainName}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, captainName: e.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="team-logo">Logo URL (optional)</label>
                      <input
                        id="team-logo"
                        className="input"
                        type="url"
                        value={teamForm.logoUrl}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, logoUrl: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex-between">
                      <button type="submit" className="btn btn-primary">
                        Create Team
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setShowTeamForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {editingMatch && (
                <div className="card" style={{ position: "relative", zIndex: 10 }}>
                  <div className="flex-between mb-md">
                    <h2 className="admin-section-title">
                      Update Score & Goals: {editingMatch.teamA.name} vs{" "}
                      {editingMatch.teamB.name}
                    </h2>
                    <button
                      className="btn"
                      onClick={() => setEditingMatch(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="form">
                    <div className="field">
                      <label>Score</label>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={scoreForm.scoreA}
                          onChange={(e) =>
                            setScoreForm({
                              ...scoreForm,
                              scoreA: parseInt(e.target.value) || 0,
                            })
                          }
                          style={{ width: "80px" }}
                        />
                        <span style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                          :
                        </span>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={scoreForm.scoreB}
                          onChange={(e) =>
                            setScoreForm({
                              ...scoreForm,
                              scoreB: parseInt(e.target.value) || 0,
                            })
                          }
                          style={{ width: "80px" }}
                        />
                        <span className="muted">
                          ({editingMatch.teamA.name} : {editingMatch.teamB.name})
                        </span>
                      </div>
                    </div>

                    <div className="field">
                      <label>Goals ({scoreForm.goals.length})</label>
                      {scoreForm.goals.length > 0 && (
                        <div className="stack gap-sm mt-sm">
                          {scoreForm.goals.map((goal, idx) => (
                            <div
                              key={idx}
                              className="card"
                              style={{
                                padding: "0.75rem",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <strong>
                                  {typeof goal.player === "object"
                                    ? goal.player.name
                                    : "Unknown Player"}
                                </strong>
                                {" - "}
                                {typeof goal.team === "object"
                                  ? goal.team.name
                                  : "Unknown Team"}
                                {goal.minute && ` (${goal.minute}' minute)`}
                              </div>
                              <button
                                className="btn"
                                onClick={() => removeGoal(idx)}
                                style={{ padding: "0.25rem 0.5rem" }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="field">
                      <label>Add New Goal</label>
                      <div className="stack gap-sm">
                        <select
                          className="input"
                          value={newGoal.team}
                          onChange={(e) =>
                            setNewGoal({ ...newGoal, team: e.target.value })
                          }
                        >
                          <option value="">Select Team</option>
                          <option value={editingMatch.teamA._id}>
                            {editingMatch.teamA.name}
                          </option>
                          <option value={editingMatch.teamB._id}>
                            {editingMatch.teamB.name}
                          </option>
                        </select>
                        {newGoal.team && (
                          <select
                            className="input"
                            value={newGoal.player}
                            onChange={(e) =>
                              setNewGoal({ ...newGoal, player: e.target.value })
                            }
                            required
                          >
                            <option value="">Select Player *</option>
                            {players
                              .filter((p) => {
                                const teamId =
                                  typeof p.team === "object" ? p.team._id : p.team;
                                return teamId === newGoal.team;
                              })
                              .map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.name} (#{p.jerseyNumber}) - {p.position}
                                </option>
                              ))}
                          </select>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            max="120"
                            placeholder="Minute"
                            value={newGoal.minute}
                            onChange={(e) =>
                              setNewGoal({ ...newGoal, minute: e.target.value })
                            }
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn"
                            onClick={addGoal}
                            disabled={!newGoal.team || !newGoal.minute || !newGoal.player}
                          >
                            Add Goal
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex-between mt-md">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={saveScore}
                      >
                        Save Score & Goals
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setEditingMatch(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showPlayerForm && (
                <div className="card">
                  <div className="flex-between mb-md">
                    <h2 className="admin-section-title">
                      {editingPlayer ? "Edit Player" : "Create New Player"}
                    </h2>
                    <button
                      className="btn"
                      onClick={() => {
                        setShowPlayerForm(false);
                        setEditingPlayer(null);
                      }}
                    >
                      Close
                    </button>
                  </div>
                  <form onSubmit={savePlayer} className="form">
                    <div className="field">
                      <label htmlFor="player-name">Player Name *</label>
                      <input
                        id="player-name"
                        className="input"
                        type="text"
                        value={playerForm.name}
                        onChange={(e) =>
                          setPlayerForm({ ...playerForm, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="field">
                        <label htmlFor="player-jersey">Jersey Number *</label>
                        <input
                          id="player-jersey"
                          className="input"
                          type="number"
                          min="1"
                          max="99"
                          value={playerForm.jerseyNumber}
                          onChange={(e) =>
                            setPlayerForm({
                              ...playerForm,
                              jerseyNumber: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="player-position">Position *</label>
                        <input
                          id="player-position"
                          className="input"
                          type="text"
                          placeholder="e.g., Forward, Midfielder, Defender, Goalkeeper"
                          value={playerForm.position}
                          onChange={(e) =>
                            setPlayerForm({
                              ...playerForm,
                              position: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="field">
                        <label htmlFor="player-department">Department *</label>
                        <select
                          id="player-department"
                          className="input"
                          value={playerForm.department}
                          onChange={(e) =>
                            setPlayerForm({
                              ...playerForm,
                              department: e.target.value,
                            })
                          }
                          required
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="player-team">Team *</label>
                        <select
                          id="player-team"
                          className="input"
                          value={playerForm.team}
                          onChange={(e) =>
                            setPlayerForm({ ...playerForm, team: e.target.value })
                          }
                          required
                        >
                          <option value="">Select Team</option>
                          {teams.map((team) => (
                            <option key={team._id} value={team._id}>
                              {team.name} ({team.department})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="player-photo">Photo URL (optional)</label>
                      <input
                        id="player-photo"
                        className="input"
                        type="url"
                        placeholder="https://example.com/photo.jpg"
                        value={playerForm.photoUrl}
                        onChange={(e) =>
                          setPlayerForm({ ...playerForm, photoUrl: e.target.value })
                        }
                      />
                      {playerForm.photoUrl && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <img
                            src={playerForm.photoUrl}
                            alt="Player preview"
                            style={{
                              maxWidth: "150px",
                              maxHeight: "150px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: "1px solid #ccc",
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-between">
                      <button type="submit" className="btn btn-primary">
                        {editingPlayer ? "Update Player" : "Create Player"}
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setShowPlayerForm(false);
                          setEditingPlayer(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {showMatchForm && (
                <div className="card">
                  <h2 className="admin-section-title">Create New Match</h2>
                  <form onSubmit={createMatch} className="form">
                    <div className="field">
                      <label htmlFor="match-teamA">Team A *</label>
                      <select
                        id="match-teamA"
                        className="input"
                        value={matchForm.teamA}
                        onChange={(e) =>
                          setMatchForm({ ...matchForm, teamA: e.target.value })
                        }
                        required
                      >
                        <option value="">Select Team A</option>
                        {teams.map((team) => (
                          <option key={team._id} value={team._id}>
                            {team.name} ({team.department})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="match-teamB">Team B *</label>
                      <select
                        id="match-teamB"
                        className="input"
                        value={matchForm.teamB}
                        onChange={(e) =>
                          setMatchForm({ ...matchForm, teamB: e.target.value })
                        }
                        required
                      >
                        <option value="">Select Team B</option>
                        {teams
                          .filter((team) => team._id !== matchForm.teamA)
                          .map((team) => (
                            <option key={team._id} value={team._id}>
                              {team.name} ({team.department})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="match-date">Date & Time *</label>
                      <input
                        id="match-date"
                        className="input"
                        type="datetime-local"
                        value={matchForm.date}
                        onChange={(e) =>
                          setMatchForm({ ...matchForm, date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="match-venue">Venue *</label>
                      <input
                        id="match-venue"
                        className="input"
                        type="text"
                        value={matchForm.venue}
                        onChange={(e) =>
                          setMatchForm({ ...matchForm, venue: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="match-status">Initial Status *</label>
                      <select
                        id="match-status"
                        className="input"
                        value={matchForm.status}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            status: e.target.value as "upcoming" | "live" | "completed",
                          })
                        }
                        required
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div className="flex-between">
                      <button type="submit" className="btn btn-primary">
                        Create Match
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setShowMatchForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div>
                <div className="flex-between">
                  <h2 className="admin-section-title">Matches</h2>
                  <span className="pill-small">
                    {matches.length} configured fixtures
                  </span>
                </div>
                {matches.length === 0 ? (
                  <p className="muted mt-sm">No matches created yet. Create one above.</p>
                ) : (
                  <div className="scroll-y mt-sm">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Match</th>
                          <th>Kickoff</th>
                          <th>Status</th>
                          <th>Score</th>
                          <th>Publish</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matches.map((m) => (
                          <tr key={m._id}>
                            <td>
                              <div className="card-title">
                                {m.teamA.name} vs {m.teamB.name}
                              </div>
                              <div className="muted">
                                {m.venue} ·{" "}
                                {m.teamA.department} vs {m.teamB.department}
                              </div>
                            </td>
                            <td className="muted">
                              {new Date(m.date).toLocaleString()}
                            </td>
                            <td>
                              <span
                                className={`status-pill ${
                                  m.status === "live"
                                    ? "status-live"
                                    : m.status === "completed"
                                      ? "status-completed"
                                      : "status-upcoming"
                                }`}
                              >
                                {m.status.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              {m.scoreA} : {m.scoreB}
                            </td>
                            <td>
                              <span className="badge">
                                {m.isPublished ? "Published" : "Hidden"}
                              </span>
                            </td>
                            <td>
                              <div className="stack gap-sm">
                                <div className="flex-between">
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      toggleMatchStatus(m._id, "upcoming")
                                    }
                                  >
                                    Upcoming
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      toggleMatchStatus(m._id, "live")
                                    }
                                  >
                                    Live
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      toggleMatchStatus(m._id, "completed")
                                    }
                                  >
                                    Completed
                                  </button>
                                </div>
                                <div className="flex-between">
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => openScoreEditor(m)}
                                  >
                                    Update Score & Goals
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() =>
                                      publishMatch(m._id, !m.isPublished)
                                    }
                                  >
                                    {m.isPublished ? "Hide from public" : "Publish"}
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() => deleteMatch(m._id)}
                                    style={{
                                      background: "#ef4444",
                                      color: "white",
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div>
                <div className="flex-between mt-md">
                  <h2 className="admin-section-title">Players</h2>
                  <span className="pill-small">
                    {players.length} players
                    {players.filter((p) => p.isPublished).length > 0 &&
                      ` (${players.filter((p) => p.isPublished).length} published)`}
                  </span>
                </div>
                {players.length === 0 ? (
                  <p className="muted mt-sm">
                    No players added yet. Click "+ Add Player" to create one.
                  </p>
                ) : (
                  <div className="scroll-y mt-sm">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      {players.map((player) => {
                        const team =
                          typeof player.team === "object" ? player.team : null;
                        return (
                          <div key={player._id} className="card">
                            <div style={{ display: "flex", gap: "1rem" }}>
                              {player.photoUrl ? (
                                <img
                                  src={player.photoUrl}
                                  alt={player.name}
                                  style={{
                                    width: "80px",
                                    height: "80px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    border: "1px solid #ccc",
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
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
                                  #{player.jerseyNumber}
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div className="card-title">{player.name}</div>
                                <div className="muted" style={{ fontSize: "0.875rem" }}>
                                  #{player.jerseyNumber} · {player.position}
                                </div>
                                <div className="muted" style={{ fontSize: "0.75rem" }}>
                                  {team ? team.name : "No team"} · {player.department}
                                </div>
                                <div style={{ marginTop: "0.5rem" }}>
                                  <span className="badge">
                                    {player.isPublished ? "Published" : "Hidden"}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.5rem",
                                    marginTop: "0.5rem",
                                  }}
                                >
                                  <button
                                    className="btn"
                                    onClick={() => openPlayerForm(player)}
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() => publishPlayer(player._id, !player.isPublished)}
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.875rem" }}
                                  >
                                    {player.isPublished ? "Hide" : "Publish"}
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() => deletePlayer(player._id)}
                                    style={{
                                      padding: "0.25rem 0.5rem",
                                      fontSize: "0.875rem",
                                      background: "#ef4444",
                                      color: "white",
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex-between mt-md">
                  <h2 className="admin-section-title">Teams overview</h2>
                  <span className="pill-small">{teams.length} teams</span>
                </div>
                {teams.length === 0 ? (
                  <p className="muted mt-sm">No teams created yet. Create one above.</p>
                ) : (
                  <div className="scroll-y mt-sm">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Team</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((t) => (
                          <tr key={t._id}>
                            <td>{t.name}</td>
                            <td className="muted">{t.department}</td>
                            <td>
                              <span className="badge">
                                {t.isPublished ? "Published" : "Hidden"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  className="btn"
                                  onClick={() => publishTeam(t._id, !t.isPublished)}
                                >
                                  {t.isPublished ? "Hide" : "Publish"}
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => deleteTeam(t._id)}
                                  style={{
                                    background: "#ef4444",
                                    color: "white",
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <div className="flex-between mt-md">
                  <h2 className="admin-section-title">Points Table</h2>
                  <span className="pill-small">
                    {pointsTable.length} teams
                    {pointsTable.some((p) => p.isPublished) && " (Published)"}
                  </span>
                </div>
                {pointsTable.length === 0 ? (
                  <div className="card mt-sm">
                    <p className="muted">
                      Points table is empty. Complete some matches and click
                      "Recalculate & Publish" to generate the table.
                    </p>
                    <p className="muted" style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                      Completed matches: {matches.filter((m) => m.status === "completed").length}
                    </p>
                  </div>
                ) : (
                  <div className="scroll-y mt-sm">
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
                          <th>Status</th>
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
                            <td>
                              <span className="badge">
                                {row.isPublished ? "Published" : "Hidden"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
