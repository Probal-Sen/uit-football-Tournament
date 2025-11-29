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

async function getPublishedFixtures(): Promise<Match[]> {
  return apiFetch<Match[]>("/matches");
}

export default async function FixturesPage() {
  const fixtures = await getPublishedFixtures();

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
      <div className="card">
        {fixtures.length === 0 ? (
          <p className="muted">
            No fixtures have been published yet. Please check back later.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Department</th>
                <th>Kickoff</th>
                <th>Venue</th>
                <th>Status</th>
                <th className="text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {fixtures.map((m) => (
                <tr key={m._id}>
                  <td>
                    <div>{`${m.teamA.name} vs ${m.teamB.name}`}</div>
                  </td>
                  <td className="muted">
                    {m.teamA.department} · {m.teamB.department}
                  </td>
                  <td className="muted">
                    {new Date(m.date).toLocaleString(undefined, {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="muted">{m.venue}</td>
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
                  <td className="text-right">
                    {m.status === "upcoming" ? (
                      <span className="muted">TBD</span>
                    ) : (
                      `${m.scoreA} : ${m.scoreB}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


