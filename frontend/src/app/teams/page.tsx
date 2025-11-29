import { apiFetch } from "@/lib/api";

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
  department: string;
  photoUrl?: string;
  team: Team;
};

async function getTeams(): Promise<Team[]> {
  return apiFetch<Team[]>("/teams");
}

async function getPlayers(teamId: string): Promise<Player[]> {
  return apiFetch<Player[]>(`/players?teamId=${teamId}`);
}

export default async function TeamsPage() {
  const teams = await getTeams();

  return (
    <div className="stack gap-md">
      <div className="section-header">
        <div>
          <h1 className="section-heading">Registered Teams</h1>
          <p className="section-description">
            View all participating teams and their squad members.
          </p>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="card">
          <p className="muted">No teams have been published yet.</p>
        </div>
      ) : (
        <div className="stack gap-lg">
          {teams.map(async (team) => {
            const players = await getPlayers(team._id);

            return (
              <div key={team._id} className="card">
                <div className="flex-between mb-md">
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.name}
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
                        {team.department}
                      </div>
                    )}
                    <div>
                      <h2 className="card-title">{team.name}</h2>
                      <div className="muted">{team.department} Department</div>
                      {team.coachName && (
                        <div className="muted" style={{ fontSize: "0.875rem" }}>
                          Coach: {team.coachName}
                        </div>
                      )}
                      {team.captainName && (
                        <div className="muted" style={{ fontSize: "0.875rem" }}>
                          Captain: {team.captainName}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="badge">{players.length} Players</div>
                </div>

                {players.length === 0 ? (
                  <p className="muted">No players have been added to this team yet.</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "1rem",
                      marginTop: "1rem",
                    }}
                  >
                    {players.map((player) => (
                      <div
                        key={player._id}
                        className="card"
                        style={{ padding: "1rem", textAlign: "center" }}
                      >
                        {player.photoUrl ? (
                          <img
                            src={player.photoUrl}
                            alt={player.name}
                            style={{
                              width: "100%",
                              maxWidth: "150px",
                              height: "150px",
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
                              maxWidth: "150px",
                              height: "150px",
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
                        <div className="card-title" style={{ fontSize: "1rem" }}>
                          {player.name}
                        </div>
                        <div className="muted" style={{ fontSize: "0.875rem" }}>
                          #{player.jerseyNumber} · {player.position}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

