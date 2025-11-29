import { apiFetch } from "@/lib/api";

type Team = {
  _id: string;
  name: string;
  department: string;
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

async function getPoints(): Promise<PointsRow[]> {
  return apiFetch<PointsRow[]>("/points");
}

export default async function PointsPage() {
  const rows = await getPoints();

  return (
    <div className="stack gap-md">
      <div className="section-header">
        <div>
          <h1 className="section-heading">Points Table</h1>
          <p className="section-description">
            Official standings, as published by the tournament organizers.
          </p>
        </div>
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <p className="muted">
            The points table is not published yet. It will appear here once
            enabled by the admin panel.
          </p>
        ) : (
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
              {rows.map((row, index) => (
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
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


