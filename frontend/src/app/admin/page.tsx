"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";

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
  teamALineup?: {
    goalkeeper?: string | Player;
    players?: (string | Player)[];
  };
  teamBLineup?: {
    goalkeeper?: string | Player;
    players?: (string | Player)[];
  };
  substitutions?: Array<{
    team: string | Team;
    playerOut: string | Player;
    playerIn: string | Player;
    minute: number;
  }>;
  isPublished: boolean;
};

type PointsTableEntry = {
  _id: string;
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isPublished: boolean;
};

const DEPARTMENTS = ["CSE", "IT", "ECE", "EE", "CE", "AEIE"];

export default function AdminDashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [pointsTable, setPointsTable] = useState<PointsTableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [matchForLineup, setMatchForLineup] = useState<Match | null>(null);
  const [lineupData, setLineupData] = useState<{
    teamA: { goalkeeper: string; players: string[] };
    teamB: { goalkeeper: string; players: string[] };
  }>({
    teamA: { goalkeeper: "", players: [] },
    teamB: { goalkeeper: "", players: [] },
  });
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
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [substituteForm, setSubstituteForm] = useState({
    team: "",
    playerOut: "",
    playerIn: "",
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
    position: "",
    department: "CSE",
    jerseyNumber: "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [teamsData, matchesData, playersData, pointsData] =
        await Promise.all([
          apiFetch<Team[]>("/teams/all"),
          apiFetch<Match[]>("/matches/all"),
          apiFetch<Player[]>("/players/all"),
          apiFetch<PointsTableEntry[]>("/points/all").catch(() => []), // Points might not exist yet
        ]);
      setTeams(teamsData);
      setMatches(matchesData);
      setPlayers(playersData);
      setPointsTable(pointsData);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  function openScoreEditor(match: Match) {
    // Only allow editing score for live matches
    if (match.status !== "live") {
      setError("You can only update scores and goals for live matches. Please set the match status to 'Live' first.");
      return;
    }
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
    
    // Automatically increase score by 1
    const isTeamA = editingMatch.teamA._id === newGoal.team;
    setScoreForm({
      ...scoreForm,
      goals: [...scoreForm.goals, goal],
      scoreA: isTeamA ? scoreForm.scoreA + 1 : scoreForm.scoreA,
      scoreB: isTeamA ? scoreForm.scoreB : scoreForm.scoreB + 1,
    });
    setNewGoal({ player: "", team: "", minute: "" });
    setShowAddGoal(false);
    setError(null);
  }

  async function makeSubstitution() {
    if (!substituteForm.team || !substituteForm.playerOut || !substituteForm.playerIn) {
      setError("Please select team, player going out, and player coming in.");
      return;
    }
    if (!editingMatch) return;

    try {
      const isTeamA = editingMatch.teamA._id === substituteForm.team;
      const lineupKey = isTeamA ? 'teamALineup' : 'teamBLineup';
      const currentLineup = editingMatch[lineupKey] || { goalkeeper: null, players: [] };
      
      // Get current lineup IDs
      const goalkeeperId = currentLineup.goalkeeper 
        ? (typeof currentLineup.goalkeeper === 'object' 
          ? currentLineup.goalkeeper._id 
          : currentLineup.goalkeeper)
        : null;
      const playerIds = (currentLineup.players || []).map((p: any) => 
        typeof p === 'object' ? p._id : p
      );

      // Remove player going out and add player coming in
      let newGoalkeeper = goalkeeperId;
      let newPlayers = [...playerIds];

      if (goalkeeperId && substituteForm.playerOut === goalkeeperId) {
        // Goalkeeper substitution
        newGoalkeeper = substituteForm.playerIn;
      } else {
        // Field player substitution
        newPlayers = newPlayers.filter((id) => id !== substituteForm.playerOut);
        newPlayers.push(substituteForm.playerIn);
      }

      // Calculate current minute for substitution
      const matchStart = new Date(editingMatch.date);
      const now = new Date();
      const substitutionMinute = Math.floor((now.getTime() - matchStart.getTime()) / (1000 * 60));

      // Get current substitutions
      const currentSubstitutions = editingMatch.substitutions || [];

      // Update the match with new lineup and add substitution record
      await apiFetch(`/matches/${editingMatch._id}`, {
        method: "PUT",
        body: JSON.stringify({
          [lineupKey]: {
            goalkeeper: newGoalkeeper,
            players: newPlayers,
          },
          substitutions: [
            ...currentSubstitutions,
            {
              team: substituteForm.team,
              playerOut: substituteForm.playerOut,
              playerIn: substituteForm.playerIn,
              minute: Math.max(0, Math.min(90, substitutionMinute)),
            },
          ],
        }),
      });

      setSubstituteForm({ team: "", playerOut: "", playerIn: "" });
      setShowSubstitute(false);
      await load();
      setSuccess("Substitution made successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to make substitution");
    }
  }

  // Helper function to get players in current lineup
  function getLineupPlayers(match: Match, teamId: string) {
    const isTeamA = match.teamA._id === teamId;
    const lineup = isTeamA ? match.teamALineup : match.teamBLineup;
    if (!lineup) return [];

    const goalkeeperId = lineup.goalkeeper
      ? (typeof lineup.goalkeeper === 'object' 
        ? lineup.goalkeeper._id 
        : lineup.goalkeeper)
      : null;
    const playerIds = (lineup.players || []).map((p: any) => 
      typeof p === 'object' ? p._id : p
    );

    const allLineupIds = goalkeeperId ? [goalkeeperId, ...playerIds] : playerIds;
    return players.filter((p) => {
      const pTeamId = typeof p.team === 'object' ? p.team._id : p.team;
      return pTeamId === teamId && allLineupIds.includes(p._id);
    });
  }

  // Helper function to get players NOT in current lineup
  function getBenchPlayers(match: Match, teamId: string) {
    const lineupPlayers = getLineupPlayers(match, teamId);
    const lineupPlayerIds = lineupPlayers.map((p) => p._id);
    
    return players.filter((p) => {
      const pTeamId = typeof p.team === 'object' ? p.team._id : p.team;
      return pTeamId === teamId && !lineupPlayerIds.includes(p._id);
    });
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
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to update score");
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/admin/login");
      return;
    }
    if (isAuthenticated && !authLoading) {
      void load();
    }
  }, [isAuthenticated, authLoading, router]);

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
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to create match");
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
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to create team");
    }
  }

  function openPlayerForm(player?: Player) {
    if (player) {
      setEditingPlayer(player);
      const teamId = typeof player.team === "object" ? player.team._id : player.team;
      const selectedTeam = teams.find((t) => t._id === teamId);
      setPlayerForm({
        name: player.name,
        position: player.position,
        department: selectedTeam?.department || player.department,
        jerseyNumber: player.jerseyNumber.toString(),
      });
    } else {
      setEditingPlayer(null);
      setPlayerForm({
        name: "",
        position: "",
        department: "CSE",
        jerseyNumber: "",
      });
    }
    setShowPlayerForm(true);
  }

  async function savePlayer(e: React.FormEvent) {
    e.preventDefault();
    try {
      // Find team by department
      const team = teams.find((t) => t.department === playerForm.department);
      if (!team) {
        setError(`No team found for department ${playerForm.department}. Please create a team for this department first.`);
        return;
      }

      // Validate that team._id exists
      if (!team._id) {
        setError(`Invalid team ID for department ${playerForm.department}. Please check the team configuration.`);
        return;
      }

      // Validate jersey number
      const jerseyNumber = parseInt(playerForm.jerseyNumber);
      if (isNaN(jerseyNumber) || jerseyNumber < 1 || jerseyNumber > 99) {
        setError("Please enter a valid jersey number between 1 and 99");
        return;
      }

      const playerData = {
        name: playerForm.name.trim(),
        position: playerForm.position.trim(),
        department: playerForm.department,
        team: team._id,
        jerseyNumber: jerseyNumber,
      };

      console.log("Creating player with data:", playerData);
      console.log("Selected team:", team);

      if (editingPlayer) {
        await apiFetch(`/players/${editingPlayer._id}`, {
          method: "PUT",
          body: JSON.stringify(playerData),
        });
      } else {
        await apiFetch("/players", {
          method: "POST",
          body: JSON.stringify({
            ...playerData,
            isPublished: false,
          }),
        });
      }
      setShowPlayerForm(false);
      setEditingPlayer(null);
      setPlayerForm({
        name: "",
        position: "",
        department: "CSE",
        jerseyNumber: "",
      });
      await load();
      setSuccess(editingPlayer ? "Player updated successfully!" : "Player created successfully!");
    } catch (err: any) {
      console.error("Error saving player:", err);
      // apiFetch already extracts the error message from the response
      setError(err.message || "Failed to save player");
    }
  }

  async function deletePlayer(playerId: string) {
    if (!confirm("Are you sure you want to delete this player?")) return;
    try {
      await apiFetch(`/players/${playerId}`, { method: "DELETE" });
      await load();
      setSuccess("Player deleted successfully!");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to delete player");
    }
  }

  async function publishPlayer(playerId: string, isPublished: boolean) {
    try {
      await apiFetch(`/players/${playerId}/publish`, {
        method: "POST",
        body: JSON.stringify({ isPublished }),
      });
      await load();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to update publish status");
    }
  }

  function openLineupModal(match: Match) {
    setMatchForLineup(match);
    setLineupData({
      teamA: { goalkeeper: "", players: [] },
      teamB: { goalkeeper: "", players: [] },
    });
    setShowLineupModal(true);
  }

  async function toggleMatchStatus(matchId: string, status: Match["status"], match?: Match) {
    try {
      // If setting to live, show lineup modal first
      if (status === "live" && match) {
        openLineupModal(match);
        return;
      }

      // For other statuses, update directly
      await apiFetch(`/matches/${matchId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to update match status");
    }
  }

  async function confirmLineupAndSetLive() {
    if (!matchForLineup) return;

    // Validate lineups
    if (!lineupData.teamA.goalkeeper || lineupData.teamA.players.length !== 6) {
      setError("Please select 1 goalkeeper and 6 players for Team A");
      return;
    }
    if (!lineupData.teamB.goalkeeper || lineupData.teamB.players.length !== 6) {
      setError("Please select 1 goalkeeper and 6 players for Team B");
      return;
    }

    try {
      setError(null);
      await apiFetch(`/matches/${matchForLineup._id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: "live",
          teamALineup: lineupData.teamA,
          teamBLineup: lineupData.teamB,
        }),
      });
      setShowLineupModal(false);
      setMatchForLineup(null);
      setLineupData({
        teamA: { goalkeeper: "", players: [] },
        teamB: { goalkeeper: "", players: [] },
      });
      await load();
      setSuccess("Match set to live with lineups!");
    } catch (err: any) {
      setError(err.message || "Failed to set match to live");
    }
  }

  async function publishMatch(matchId: string, isPublished: boolean) {
    try {
      await apiFetch(`/matches/${matchId}/publish`, {
        method: "POST",
        body: JSON.stringify({ isPublished }),
      });
      await load();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to update publish status");
    }
  }

  async function publishTeam(teamId: string, isPublished: boolean) {
    try {
      await apiFetch(`/teams/${teamId}/publish`, {
        method: "POST",
        body: JSON.stringify({ isPublished }),
      });
      await load();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to update publish status");
    }
  }

  async function deleteTeam(teamId: string) {
    if (
      !confirm(
        "Are you sure you want to delete this team? This will also delete all players in this team."
      )
    )
      return;
    try {
      await apiFetch(`/teams/${teamId}`, { method: "DELETE" });
      await load();
      setSuccess("Team deleted successfully!");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to delete team");
    }
  }

  async function deleteMatch(matchId: string) {
    if (!confirm("Are you sure you want to delete this match?")) return;
    try {
      await apiFetch(`/matches/${matchId}`, { method: "DELETE" });
      await load();
      setSuccess("Match deleted successfully!");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to delete match");
    }
  }

  async function recalcPoints(publishAfter: boolean) {
    try {
      setError(null);
      setSuccess(null);
      const completedMatches = matches.filter((m) => m.status === "completed");
      if (completedMatches.length === 0) {
        setError(
          "No completed matches found. Mark some matches as 'Completed' first."
        );
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
        setSuccess(
          "Points table recalculated. Click 'Publish' to make it public."
        );
      }
      await load();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to update points table");
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
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to update publish status");
    }
  }

  async function cleanupOrphanedEntries() {
    if (
      !confirm(
        "Are you sure you want to delete all points table entries for teams that no longer exist?"
      )
    )
      return;
    try {
      setError(null);
      setSuccess(null);
      const result = await apiFetch<{ message: string; deletedCount: number }>(
        "/points/cleanup",
        {
          method: "POST",
        }
      );
      setSuccess(
        `Cleaned up ${result.deletedCount} orphaned entries successfully!`
      );
      await load();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "Failed to cleanup orphaned entries");
    }
  }

  if (authLoading) {
    return (
      <div className="stack gap-md">
        <div className="section-header">
          <div>
            <h1 className="section-heading">Admin Dashboard</h1>
            <p className="section-description">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="stack gap-md" style={{ padding: isMobile ? "0 0.75rem" : "0" }}>
      <div className="section-header">
        <div>
          <h1 
            className="section-heading"
            style={{ fontSize: "clamp(0.85rem, 4vw, 0.95rem)" }}
          >
            Admin Dashboard
          </h1>
          <p 
            className="section-description"
            style={{ fontSize: "clamp(0.75rem, 3vw, 0.8rem)" }}
          >
            Manage teams, fixtures, control live status and approve the points table.
          </p>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div
          className="alert"
          style={{ background: "#10b981", color: "white" }}
        >
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
              <div className="admin-section-title" style={{ fontSize: "clamp(0.75rem, 3vw, 0.875rem)" }}>
                Points Table
              </div>
              <button
                className="btn btn-primary"
                onClick={() => recalcPoints(true)}
                disabled={loading}
                style={{
                  width: "100%",
                  fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                  padding: "0.6rem 1rem",
                }}
              >
                Recalculate & Publish
              </button>
              <button
                className="btn"
                onClick={() => recalcPoints(false)}
                disabled={loading}
                style={{
                  width: "100%",
                  fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                  padding: "0.6rem 1rem",
                }}
              >
                Recalculate Only
              </button>
              <button
                className="btn"
                onClick={() => cleanupOrphanedEntries()}
                disabled={loading}
                style={{ 
                  marginTop: "0.5rem",
                  width: "100%",
                  fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                  padding: "0.6rem 1rem",
                }}
              >
                Cleanup Orphaned Entries
              </button>
              {pointsTable.length > 0 && (
                <>
                  <button
                    className="btn"
                    onClick={() => publishPointsTable(true)}
                    disabled={loading}
                    style={{
                      width: "100%",
                      fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                      padding: "0.6rem 1rem",
                    }}
                  >
                    Publish Table
                  </button>
                  <button
                    className="btn"
                    onClick={() => publishPointsTable(false)}
                    disabled={loading}
                    style={{
                      width: "100%",
                      fontSize: "clamp(0.8rem, 3vw, 0.9rem)",
                      padding: "0.6rem 1rem",
                    }}
                  >
                    Hide Table
                  </button>
                </>
              )}
              <p className="muted" style={{ fontSize: "0.75rem" }}>
                {matches.filter((m) => m.status === "completed").length}{" "}
                completed match(es)
              </p>
            </div>
          </div>
        </aside>
        <section 
          className="admin-main"
          style={{
            width: isMobile ? "100%" : "auto",
            order: isMobile ? 1 : 2,
            flex: isMobile ? "none" : 1,
            padding: isMobile ? "1rem 0.75rem" : "1rem 0.9rem",
          }}
        >
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
                          setTeamForm({
                            ...teamForm,
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
                      <label htmlFor="team-coach">Coach Name (optional)</label>
                      <input
                        id="team-coach"
                        className="input"
                        type="text"
                        value={teamForm.coachName}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            coachName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="team-captain">
                        Captain Name (optional)
                      </label>
                      <input
                        id="team-captain"
                        className="input"
                        type="text"
                        value={teamForm.captainName}
                        onChange={(e) =>
                          setTeamForm({
                            ...teamForm,
                            captainName: e.target.value,
                          })
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
                <div
                  className="card"
                  style={{ position: "relative", zIndex: 10 }}
                >
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
                      <div
                        style={{
                          display: "flex",
                          gap: "1rem",
                          alignItems: "center",
                        }}
                      >
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
                        <span
                          style={{ fontSize: "1.5rem", fontWeight: "bold" }}
                        >
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
                          ({editingMatch.teamA.name} : {editingMatch.teamB.name}
                          )
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

                    {/* Action Buttons */}
                    <div className="field">
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setShowAddGoal(!showAddGoal);
                            setShowSubstitute(false);
                          }}
                        >
                          {showAddGoal ? "Cancel" : "Add Goal"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => {
                            setShowSubstitute(!showSubstitute);
                            setShowAddGoal(false);
                          }}
                        >
                          {showSubstitute ? "Cancel" : "Substitute"}
                        </button>
                      </div>
                    </div>

                    {/* Add Goal Section */}
                    {showAddGoal && (
                      <div className="field" style={{ border: "1px solid rgba(148, 163, 184, 0.3)", padding: "1rem", borderRadius: "0.5rem" }}>
                        <label style={{ fontSize: "1rem", marginBottom: "0.75rem", display: "block" }}>
                          Add Goal - Select Team and Scorer
                        </label>
                        <div className="stack gap-md">
                          <select
                            className="input"
                            value={newGoal.team}
                            onChange={(e) => {
                              setNewGoal({ ...newGoal, team: e.target.value, player: "" });
                            }}
                          >
                          <option value="">Select Team *</option>
                          <option value={editingMatch.teamA._id}>
                            {editingMatch.teamA.name}
                          </option>
                          <option value={editingMatch.teamB._id}>
                            {editingMatch.teamB.name}
                          </option>
                        </select>
                        
                        {newGoal.team && (
                          <>
                            <label style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                              Select Scorer (from playing 7):
                            </label>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                                gap: "0.5rem",
                                maxHeight: "200px",
                                overflowY: "auto",
                                padding: "0.5rem",
                                background: "rgba(15, 23, 42, 0.5)",
                                borderRadius: "0.5rem",
                              }}
                            >
                            {getLineupPlayers(editingMatch, newGoal.team).map((p) => {
                              const isSelected = newGoal.player === p._id;
                              const isGoalkeeper = (() => {
                                const isTeamA = editingMatch.teamA._id === newGoal.team;
                                const lineup = isTeamA ? editingMatch.teamALineup : editingMatch.teamBLineup;
                                if (!lineup) return false;
                                const gkId = typeof lineup.goalkeeper === 'object' 
                                  ? lineup.goalkeeper._id 
                                  : lineup.goalkeeper;
                                return p._id === gkId;
                              })();
                  
                              return (
                                <label
                                  key={p._id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem",
                                    background: isSelected ? "rgba(34, 197, 94, 0.2)" : "rgba(15, 23, 42, 0.9)",
                                    border: isSelected ? "1px solid #22c55e" : "1px solid rgba(148, 163, 184, 0.4)",
                                    borderRadius: "0.5rem",
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                <input
                                  type="radio"
                                  name="goal-scorer"
                                  checked={isSelected}
                                  onChange={() => setNewGoal({ ...newGoal, player: p._id })}
                                />
                                <span>
                                  #{p.jerseyNumber} {p.name} - {p.position}
                                  {isGoalkeeper && " (GK)"}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            max="120"
                            placeholder="Minute *"
                            value={newGoal.minute}
                            onChange={(e) =>
                              setNewGoal({ ...newGoal, minute: e.target.value })
                            }
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={addGoal}
                            disabled={!newGoal.team || !newGoal.minute || !newGoal.player}
                          >
                            Add Goal
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Substitute Section */}
                  {showSubstitute && (
                    <div className="field" style={{ border: "1px solid rgba(148, 163, 184, 0.3)", padding: "1rem", borderRadius: "0.5rem" }}>
                      <label style={{ fontSize: "1rem", marginBottom: "0.75rem", display: "block" }}>
                        Make Substitution
                      </label>
                      <div className="stack gap-md">
                        <select
                          className="input"
                          value={substituteForm.team}
                          onChange={(e) => {
                            setSubstituteForm({ ...substituteForm, team: e.target.value, playerOut: "", playerIn: "" });
                          }}
                        >
                          <option value="">Select Team *</option>
                          <option value={editingMatch.teamA._id}>
                            {editingMatch.teamA.name}
                          </option>
                          <option value={editingMatch.teamB._id}>
                            {editingMatch.teamB.name}
                          </option>
                        </select>

                        {substituteForm.team && (
                          <>
                            <div>
                              <label style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>
                                Player Going Out (from playing 7):
                              </label>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                                  gap: "0.5rem",
                                  maxHeight: "200px",
                                  overflowY: "auto",
                                  padding: "0.5rem",
                                  background: "rgba(15, 23, 42, 0.5)",
                                  borderRadius: "0.5rem",
                                }}
                              >
                                {getLineupPlayers(editingMatch, substituteForm.team).map((p) => {
                                  const isSelected = substituteForm.playerOut === p._id;
                                  const isGoalkeeper = (() => {
                                    const isTeamA = editingMatch.teamA._id === substituteForm.team;
                                    const lineup = isTeamA ? editingMatch.teamALineup : editingMatch.teamBLineup;
                                    if (!lineup) return false;
                                    const gkId = typeof lineup.goalkeeper === 'object' 
                                      ? lineup.goalkeeper._id 
                                      : lineup.goalkeeper;
                                    return p._id === gkId;
                                  })();
                                  
                                  return (
                                    <label
                                      key={p._id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        padding: "0.5rem",
                                        background: isSelected ? "rgba(239, 68, 68, 0.2)" : "rgba(15, 23, 42, 0.9)",
                                        border: isSelected ? "1px solid #ef4444" : "1px solid rgba(148, 163, 184, 0.4)",
                                        borderRadius: "0.5rem",
                                        cursor: "pointer",
                                        fontSize: "0.875rem",
                                      }}
                                    >
                                      <input
                                        type="radio"
                                        name="player-out"
                                        checked={isSelected}
                                        onChange={() => setSubstituteForm({ ...substituteForm, playerOut: p._id, playerIn: "" })}
                                      />
                                      <span>
                                        #{p.jerseyNumber} {p.name} - {p.position}
                                        {isGoalkeeper && " (GK)"}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            {substituteForm.playerOut && (
                              <div>
                                <label style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>
                                  Player Coming In (from bench):
                                </label>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                                    gap: "0.5rem",
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    padding: "0.5rem",
                                    background: "rgba(15, 23, 42, 0.5)",
                                    borderRadius: "0.5rem",
                                  }}
                                >
                                  {getBenchPlayers(editingMatch, substituteForm.team).map((p) => {
                                    const isSelected = substituteForm.playerIn === p._id;
                                    return (
                                      <label
                                        key={p._id}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.5rem",
                                          padding: "0.5rem",
                                          background: isSelected ? "rgba(34, 197, 94, 0.2)" : "rgba(15, 23, 42, 0.9)",
                                          border: isSelected ? "1px solid #22c55e" : "1px solid rgba(148, 163, 184, 0.4)",
                                          borderRadius: "0.5rem",
                                          cursor: "pointer",
                                          fontSize: "0.875rem",
                                        }}
                                      >
                                        <input
                                          type="radio"
                                          name="player-in"
                                          checked={isSelected}
                                          onChange={() => setSubstituteForm({ ...substituteForm, playerIn: p._id })}
                                        />
                                        <span>
                                          #{p.jerseyNumber} {p.name} - {p.position}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={makeSubstitution}
                              disabled={!substituteForm.team || !substituteForm.playerOut || !substituteForm.playerIn}
                            >
                              Make Substitution
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div 
                    className="flex-between mt-md"
                    style={{
                      flexDirection: isMobile ? "column" : "row",
                      gap: "0.75rem",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={saveScore}
                      style={{
                        width: isMobile ? "100%" : "auto",
                        order: isMobile ? 2 : 1,
                      }}
                    >
                      Save Score & Goals
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setEditingMatch(null)}
                      style={{
                        width: isMobile ? "100%" : "auto",
                        order: isMobile ? 1 : 2,
                      }}
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
                    <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                      Player will be assigned to the team from this department
                    </p>
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
                  
                  <div 
                    className="flex-between"
                    style={{
                      flexDirection: isMobile ? "column" : "row",
                      gap: "0.75rem",
                    }}
                  >
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{
                        width: isMobile ? "100%" : "auto",
                        order: isMobile ? 2 : 1,
                      }}
                    >
                      {editingPlayer ? "Update Player" : "Create Player"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setShowPlayerForm(false);
                        setEditingPlayer(null);
                      }}
                      style={{
                        width: isMobile ? "100%" : "auto",
                        order: isMobile ? 1 : 2,
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
                          status: e.target.value as
                            | "upcoming"
                            | "live"
                            | "completed",
                        })
                      }
                      required
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div 
                    className="flex-between"
                    style={{
                      flexDirection: isMobile ? "column" : "row",
                      gap: "0.75rem",
                    }}
                  >
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      style={{
                        width: isMobile ? "100%" : "auto",
                        order: isMobile ? 2 : 1,
                      }}
                    >
                      Create Match
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowMatchForm(false)}
                      style={{
                        width: isMobile ? "100%" : "auto",
                        order: isMobile ? 1 : 2,
                      }}
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
                <p className="muted mt-sm">
                  No matches created yet. Create one above.
                </p>
              ) : (
                <div className="scroll-y mt-sm" style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ fontSize: isMobile ? "0.7rem" : "0.78rem" }}>Match</th>
                        <th style={{ fontSize: isMobile ? "0.7rem" : "0.78rem", display: isMobile ? "none" : "table-cell" }}>Kickoff</th>
                        <th style={{ fontSize: isMobile ? "0.7rem" : "0.78rem" }}>Status</th>
                        <th style={{ fontSize: isMobile ? "0.7rem" : "0.78rem" }}>Score</th>
                        <th style={{ fontSize: isMobile ? "0.7rem" : "0.78rem" }}>Publish</th>
                        <th style={{ fontSize: isMobile ? "0.7rem" : "0.78rem" }}>Actions</th>
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
                              {m.venue} · {m.teamA.department} vs{" "}
                              {m.teamB.department}
                            </div>
                          </td>
                          <td 
                            className="muted"
                            style={{ display: isMobile ? "none" : "table-cell" }}
                          >
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
                              style={{ fontSize: isMobile ? "0.65rem" : "0.7rem" }}
                            >
                              {m.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: isMobile ? "0.75rem" : "0.8rem" }}>
                            {m.scoreA} : {m.scoreB}
                          </td>
                          <td>
                            <span className="badge" style={{ fontSize: isMobile ? "0.65rem" : "0.7rem" }}>
                              {m.isPublished ? "Published" : "Hidden"}
                            </span>
                          </td>
                          <td>
                            <div className="stack gap-sm">
                              <div 
                                className="flex-between"
                                style={{
                                  flexDirection: isMobile ? "column" : "row",
                                  gap: "0.5rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  className="btn"
                                  onClick={() =>
                                    toggleMatchStatus(m._id, "upcoming")
                                  }
                                  style={{
                                    fontSize: isMobile ? "0.7rem" : "0.8rem",
                                    padding: isMobile ? "0.4rem 0.6rem" : "0.5rem 0.9rem",
                                    flex: isMobile ? "1 1 auto" : "none",
                                    minWidth: isMobile ? "80px" : "auto",
                                  }}
                                >
                                  Upcoming
                                </button>
                                <button
                                  className="btn"
                                  onClick={() =>
                                    toggleMatchStatus(m._id, "live", m)
                                  }
                                  style={{
                                    fontSize: isMobile ? "0.7rem" : "0.8rem",
                                    padding: isMobile ? "0.4rem 0.6rem" : "0.5rem 0.9rem",
                                    flex: isMobile ? "1 1 auto" : "none",
                                    minWidth: isMobile ? "80px" : "auto",
                                  }}
                                >
                                  Live
                                </button>
                                <button
                                  className="btn"
                                  onClick={() =>
                                    toggleMatchStatus(m._id, "completed")
                                  }
                                  style={{
                                    fontSize: isMobile ? "0.7rem" : "0.8rem",
                                    padding: isMobile ? "0.4rem 0.6rem" : "0.5rem 0.9rem",
                                    flex: isMobile ? "1 1 auto" : "none",
                                    minWidth: isMobile ? "80px" : "auto",
                                  }}
                                >
                                  Completed
                                </button>
                              </div>
                              <div 
                                className="flex-between"
                                style={{
                                  flexDirection: isMobile ? "column" : "row",
                                  gap: "0.5rem",
                                  flexWrap: "wrap",
                                }}
                              >
                                {m.status === "live" ? (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => openScoreEditor(m)}
                                    style={{
                                      fontSize: isMobile ? "0.7rem" : "0.8rem",
                                      padding: isMobile ? "0.4rem 0.6rem" : "0.5rem 0.9rem",
                                      flex: isMobile ? "1 1 auto" : "none",
                                      minWidth: isMobile ? "120px" : "auto",
                                    }}
                                  >
                                    Update Score & Goals
                                  </button>
                                ) : (
                                  <span 
                                    className="muted" 
                                    style={{ 
                                      fontSize: isMobile ? "0.65rem" : "0.75rem",
                                      fontStyle: "italic",
                                      padding: "0.5rem",
                                    }}
                                  >
                                    Set to Live to update scores
                                  </span>
                                )}
                                <button
                                  className="btn"
                                  onClick={() =>
                                    publishMatch(m._id, !m.isPublished)
                                  }
                                  style={{
                                    fontSize: isMobile ? "0.7rem" : "0.8rem",
                                    padding: isMobile ? "0.4rem 0.6rem" : "0.5rem 0.9rem",
                                    flex: isMobile ? "1 1 auto" : "none",
                                    minWidth: isMobile ? "100px" : "auto",
                                  }}
                                >
                                  {m.isPublished
                                    ? "Hide from public"
                                    : "Publish"}
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => deleteMatch(m._id)}
                                  style={{
                                    background: "#ef4444",
                                    color: "white",
                                    fontSize: isMobile ? "0.7rem" : "0.8rem",
                                    padding: isMobile ? "0.4rem 0.6rem" : "0.5rem 0.9rem",
                                    flex: isMobile ? "1 1 auto" : "none",
                                    minWidth: isMobile ? "80px" : "auto",
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
                    ` (${
                      players.filter((p) => p.isPublished).length
                    } published)`}
                </span>
              </div>
              {players.length === 0 ? (
                <p className="muted mt-sm">
                  No players added yet. Click &quot;+ Add Player&quot; to
                  create one.
                </p>
              ) : (
                <div className="scroll-y mt-sm">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(280px, 1fr))",
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
                              <Image
                                src={player.photoUrl}
                                alt={player.name}
                                width={80}
                                height={80}
                                style={{
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  border: "1px solid #ccc",
                                }}
                                onError={() => {
                                  // Image failed to load
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
                              <div
                                className="muted"
                                style={{ fontSize: "0.875rem" }}
                              >
                                #{player.jerseyNumber} · {player.position}
                              </div>
                              <div
                                className="muted"
                                style={{ fontSize: "0.75rem" }}
                              >
                                {team ? team.name : "No team"} ·{" "}
                                {player.department}
                              </div>
                              <div style={{ marginTop: "0.5rem" }}>
                                <span className="badge">
                                  {player.isPublished
                                    ? "Published"
                                    : "Hidden"}
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
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn"
                                  onClick={() =>
                                    publishPlayer(
                                      player._id,
                                      !player.isPublished
                                    )
                                  }
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    fontSize: "0.875rem",
                                  }}
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
                <p className="muted mt-sm">
                  No teams created yet. Create one above.
                </p>
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
                                onClick={() =>
                                  publishTeam(t._id, !t.isPublished)
                                }
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
                    &quot;Recalculate &amp; Publish&quot; to generate the
                    table.
                  </p>
                  <p
                    className="muted"
                    style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}
                  >
                    Completed matches:{" "}
                    {matches.filter((m) => m.status === "completed").length}
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
                              {row.team &&
                              row.team !== null &&
                              typeof row.team === "object"
                                ? row.team.name || "Unknown Team"
                                : "Unknown Team (Deleted)"}
                            </div>
                            <div className="muted text-xs">
                              {row.team &&
                              row.team !== null &&
                              typeof row.team === "object" &&
                              row.team.department
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

    {/* Lineup Selection Modal */}
    {showLineupModal && matchForLineup && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: isMobile ? "1rem" : "2rem",
          overflow: "auto",
        }}
        onClick={() => {
          setShowLineupModal(false);
          setMatchForLineup(null);
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: isMobile ? "100%" : "900px",
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-between mb-md">
            <h2 className="admin-section-title">
              Select Starting Lineup: {matchForLineup.teamA.name} vs {matchForLineup.teamB.name}
            </h2>
            <button
              className="btn"
              onClick={() => {
                setShowLineupModal(false);
                setMatchForLineup(null);
              }}
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

          <div className="stack gap-lg">
            {/* Team A Lineup */}
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: "1rem", color: "#e5e7eb" }}>
                {matchForLineup.teamA.name} - Select 1 Goalkeeper + 6 Players
              </h3>
              <div className="stack gap-md">
                <div>
                  <label style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>
                    Goalkeeper *
                  </label>
                  <select
                    className="input"
                    value={lineupData.teamA.goalkeeper}
                    onChange={(e) => {
                      const newGoalkeeper = e.target.value;
                      setLineupData({
                        ...lineupData,
                        teamA: {
                          ...lineupData.teamA,
                          goalkeeper: newGoalkeeper,
                          players: lineupData.teamA.players.filter((id) => id !== newGoalkeeper),
                        },
                      });
                    }}
                    style={{ width: "100%" }}
                  >
                    <option value="">Select Goalkeeper</option>
                    {players
                      .filter(
                        (p) =>
                          typeof p.team === "object"
                            ? p.team._id === matchForLineup.teamA._id
                            : p.team === matchForLineup.teamA._id
                      )                        .filter((p) => !lineupData.teamA.players.includes(p._id))
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          #{p.jerseyNumber} {p.name} - {p.position}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>
                    Players (Select 6) - {lineupData.teamA.players.length}/6
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                      gap: "0.5rem",
                      maxHeight: "300px",
                      overflowY: "auto",
                      padding: "0.5rem",
                      background: "rgba(15, 23, 42, 0.5)",
                      borderRadius: "0.5rem",
                    }}
                  >
                    {players
                      .filter(
                        (p) =>
                          typeof p.team === "object"
                            ? p.team._id === matchForLineup.teamA._id
                            : p.team === matchForLineup.teamA._id
                      )
                      .filter((p) => p._id !== lineupData.teamA.goalkeeper)
                      .map((p) => {
                        const isSelected = lineupData.teamA.players.includes(p._id);
                        return (
                          <label
                            key={p._id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              background: isSelected ? "rgba(34, 197, 94, 0.2)" : "rgba(15, 23, 42, 0.9)",
                              border: isSelected ? "1px solid #22c55e" : "1px solid rgba(148, 163, 184, 0.4)",
                              borderRadius: "0.5rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (lineupData.teamA.players.length < 6) {
                                    setLineupData({
                                      ...lineupData,
                                      teamA: {
                                        ...lineupData.teamA,
                                        players: [...lineupData.teamA.players, p._id],
                                        goalkeeper: lineupData.teamA.goalkeeper === p._id ? "" : lineupData.teamA.goalkeeper,
                                      },
                                    });
                                  }
                                } else {
                                  setLineupData({
                                    ...lineupData,
                                    teamA: {
                                      ...lineupData.teamA,
                                      players: lineupData.teamA.players.filter((id) => id !== p._id),
                                    },
                                  });
                                }
                              }}
                              disabled={!isSelected && (lineupData.teamA.players.length >= 6 || p._id === lineupData.teamA.goalkeeper)}
                            />
                            <span>
                              #{p.jerseyNumber} {p.name} - {p.position}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Team B Lineup */}
            <div>
              <h3 style={{ fontSize: "1rem", marginBottom: "1rem", color: "#e5e7eb" }}>
                {matchForLineup.teamB.name} - Select 1 Goalkeeper + 6 Players
              </h3>
              <div className="stack gap-md">
                <div>
                  <label style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>
                    Goalkeeper *
                  </label>
                  <select
                    className="input"
                    value={lineupData.teamB.goalkeeper}
                    onChange={(e) => {
                      const newGoalkeeper = e.target.value;
                      setLineupData({
                        ...lineupData,
                        teamB: {
                          ...lineupData.teamB,
                          goalkeeper: newGoalkeeper,
                          players: lineupData.teamB.players.filter((id) => id !== newGoalkeeper),
                        },
                      });
                    }}
                    style={{ width: "100%" }}
                  >
                    <option value="">Select Goalkeeper</option>
                    {players
                      .filter(
                        (p) =>
                          typeof p.team === "object"
                            ? p.team._id === matchForLineup.teamB._id
                            : p.team === matchForLineup.teamB._id
                      )
                      .filter((p) => !lineupData.teamB.players.includes(p._id))
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          #{p.jerseyNumber} {p.name} - {p.position}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>
                    Players (Select 6) - {lineupData.teamB.players.length}/6
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                      gap: "0.5rem",
                      maxHeight: "300px",
                      overflowY: "auto",
                      padding: "0.5rem",
                      background: "rgba(15, 23, 42, 0.5)",
                      borderRadius: "0.5rem",
                    }}
                  >
                    {players
                      .filter(
                        (p) =>
                          typeof p.team === "object"
                            ? p.team._id === matchForLineup.teamB._id
                            : p.team === matchForLineup.teamB._id
                      )
                      .filter((p) => p._id !== lineupData.teamB.goalkeeper)
                      .map((p) => {
                        const isSelected = lineupData.teamB.players.includes(p._id);
                        return (
                          <label
                            key={p._id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.5rem",
                              background: isSelected ? "rgba(34, 197, 94, 0.2)" : "rgba(15, 23, 42, 0.9)",
                              border: isSelected ? "1px solid #22c55e" : "1px solid rgba(148, 163, 184, 0.4)",
                              borderRadius: "0.5rem",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (lineupData.teamB.players.length < 6) {
                                    setLineupData({
                                      ...lineupData,
                                      teamB: {
                                        ...lineupData.teamB,
                                        players: [...lineupData.teamB.players, p._id],
                                        goalkeeper: lineupData.teamB.goalkeeper === p._id ? "" : lineupData.teamB.goalkeeper,
                                      },
                                    });
                                  }
                                } else {
                                  setLineupData({
                                    ...lineupData,
                                    teamB: {
                                      ...lineupData.teamB,
                                      players: lineupData.teamB.players.filter((id) => id !== p._id),
                                    },
                                  });
                                }
                              }}
                              disabled={!isSelected && (lineupData.teamB.players.length >= 6 || p._id === lineupData.teamB.goalkeeper)}
                            />
                            <span>
                              #{p.jerseyNumber} {p.name} - {p.position}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className="flex-between"
              style={{
                flexDirection: isMobile ? "column" : "row",
                gap: "0.75rem",
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              <button
                className="btn"
                onClick={() => {
                  setShowLineupModal(false);
                  setMatchForLineup(null);
                }}
                style={{
                  width: isMobile ? "100%" : "auto",
                  order: isMobile ? 1 : 2,
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmLineupAndSetLive}
                disabled={
                  !lineupData.teamA.goalkeeper ||
                  lineupData.teamA.players.length !== 6 ||
                  !lineupData.teamB.goalkeeper ||
                  lineupData.teamB.players.length !== 6
                }
                style={{
                  width: isMobile ? "100%" : "auto",
                  order: isMobile ? 2 : 1,
                }}
              >
                Confirm Lineup & Set Live
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}