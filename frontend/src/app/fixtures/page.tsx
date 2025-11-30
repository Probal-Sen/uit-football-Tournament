"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Team = {
  _id: string;
  name: string;
  department: string;
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
};

type TabType = "live" | "upcoming" | "completed";

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("live");

  useEffect(() => {
    async function loadFixtures() {
      try {
        const data = await apiFetch<Match[]>("/matches");
        setFixtures(data);
      } catch (err) {
        console.error("Failed to load fixtures:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadFixtures();
  }, []);

  // Separate fixtures by status
  const liveMatches = fixtures.filter((m) => m.status === "live");
  const upcomingMatches = fixtures
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const pastMatches = fixtures
    .filter((m) => m.status === "completed")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

  // Get current matches based on active tab
  const getCurrentMatches = () => {
    switch (activeTab) {
      case "live":
        return liveMatches;
      case "upcoming":
        return upcomingMatches;
      case "completed":
        return pastMatches;
      default:
        return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "live":
        return "No live matches at the moment.";
      case "upcoming":
        return "No upcoming matches scheduled.";
      case "completed":
        return "No completed matches yet.";
      default:
        return "";
    }
  };

  const currentMatches = getCurrentMatches();
  const emptyMessage = getEmptyMessage();

  if (loading) {
    return (
      <div className="stack gap-md">
        <div className="section-header">
          <div>
            <h1 className="section-heading">Fixtures & Results</h1>
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
          <h1 className="section-heading">Fixtures & Results</h1>
          <p className="section-description">
            Official match schedule and final results as published by the
            organizers.
          </p>
        </div>
      </div>

      {/* Tab Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => setActiveTab("live")}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "999px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backgroundColor: activeTab === "live" ? "#22c55e" : "#f3f4f6",
            color: activeTab === "live" ? "#ffffff" : "#374151",
          }}
        >
          Live
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "999px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backgroundColor: activeTab === "upcoming" ? "#22c55e" : "#f3f4f6",
            color: activeTab === "upcoming" ? "#ffffff" : "#374151",
          }}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "999px",
            border: "none",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backgroundColor: activeTab === "completed" ? "#22c55e" : "#f3f4f6",
            color: activeTab === "completed" ? "#ffffff" : "#374151",
          }}
        >
          Completed
        </button>
      </div>

      {/* Match Cards */}
      {currentMatches.length === 0 ? (
        <div className="card">
          <p className="muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="stack gap-md">
          {currentMatches.map((m) => {
            const matchDate = new Date(m.date);
            const formattedDate = matchDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "2-digit",
            });
            const formattedTime = matchDate.toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={m._id}
                className="card"
                style={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(148, 163, 184, 0.4)",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                }}
              >
                {/* Tournament Header */}
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      letterSpacing: "0.1em",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      marginBottom: "0.25rem",
                    }}
                  >
                    UNIVERSITY INSTITUTE OF TECHNOLOGY
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: "500",
                      letterSpacing: "0.05em",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    INTER-DEPARTMENT FOOTBALL TOURNAMENT
                  </div>
                </div>

                {/* Match Details Row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {m.venue}, {formattedDate}, {formattedTime}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#e5e7eb",
                        textTransform: "uppercase",
                      }}
                    >
                      League Matches
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        backgroundColor:
                          activeTab === "live"
                            ? "rgba(239, 68, 68, 0.2)"
                            : activeTab === "completed"
                              ? "#1f2937"
                              : "rgba(30, 64, 175, 0.2)",
                        color:
                          activeTab === "live"
                            ? "#fecaca"
                            : activeTab === "completed"
                              ? "#ffffff"
                              : "#bfdbfe",
                      }}
                    >
                      {activeTab === "live"
                        ? "Live"
                        : activeTab === "completed"
                          ? "Past"
                          : "Upcoming"}
                    </span>
                  </div>
                </div>

                {/* Team Scores */}
                <div className="stack gap-md">
                  {/* Team A */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "700",
                        color: "#e5e7eb",
                      }}
                    >
                      {m.teamA.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      {m.status === "upcoming" ? (
                        <span
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: "700",
                            color: "var(--muted)",
                          }}
                        >
                          TBD
                        </span>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: "#22c55e",
                            }}
                          >
                            {m.scoreA}
                          </span>
                          <span
                            style={{
                              fontSize: "1rem",
                              color: "var(--muted)",
                            }}
                          >
                            goals
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Team B */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "700",
                        color: "#e5e7eb",
                      }}
                    >
                      {m.teamB.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      {m.status === "upcoming" ? (
                        <span
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: "700",
                            color: "var(--muted)",
                          }}
                        >
                          TBD
                        </span>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: "1.5rem",
                              fontWeight: "700",
                              color: "#22c55e",
                            }}
                          >
                            {m.scoreB}
                          </span>
                          <span
                            style={{
                              fontSize: "1rem",
                              color: "var(--muted)",
                            }}
                          >
                            goals
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


