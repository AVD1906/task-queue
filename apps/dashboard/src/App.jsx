import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const socket = io(API_URL, {
  reconnectionAttempts: 5,
  timeout: 5000,
  transports: ['websocket', 'polling']
});

const STATUS_COLORS = {
  waiting:   { bg: "#F1EFE8", text: "#5F5E5A" },
  active:    { bg: "#E6F1FB", text: "#185FA5" },
  completed: { bg: "#EAF3DE", text: "#3B6D11" },
  failed:    { bg: "#FCEBEB", text: "#A32D2D" },
};

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "2px 10px", borderRadius: 99,
      fontSize: 12, fontWeight: 500
    }}>
      {status}
    </span>
  );
}

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState([]);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/jobs`)
      .then(r => r.json())
      .then(data => setJobs(Array.isArray(data) ? data : []))
      .catch(() => setJobs([]));

    fetch(`${API_URL}/jobs/stats`)
      .then(r => r.json())
      .then(data => setStats(Array.isArray(data) ? data : []))
      .catch(() => setStats([]));
  }, []);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));

    const handleEvent = (eventName) => (data) => {
      setEvents(prev => [{ eventName, ...data }, ...prev].slice(0, 20));

      fetch(`${API_URL}/jobs`)
        .then(r => r.json())
        .then(data => setJobs(Array.isArray(data) ? data : []))
        .catch(() => {});

      fetch(`${API_URL}/jobs/stats`)
        .then(r => r.json())
        .then(data => setStats(Array.isArray(data) ? data : []))
        .catch(() => {});
    };

    socket.on("job:active",    handleEvent("job:active"));
    socket.on("job:completed", handleEvent("job:completed"));
    socket.on("job:failed",    handleEvent("job:failed"));
    socket.on("job:retry",     handleEvent("job:retry"));

    return () => {
      socket.off("job:active");
      socket.off("job:completed");
      socket.off("job:failed");
      socket.off("job:retry");
    };
  }, []);

  const chartData = ["email", "image", "report"].map(queue => {
    const queueStats = (stats || []).filter(s => s.queue === queue);
    return {
      queue,
      completed: parseInt(queueStats.find(s => s.status === "completed")?.count || 0),
      failed:    parseInt(queueStats.find(s => s.status === "failed")?.count || 0),
      waiting:   parseInt(queueStats.find(s => s.status === "waiting")?.count || 0),
    };
  });

  const safeJobs = jobs || [];
  const totalJobs     = safeJobs.length;
  const activeJobs    = safeJobs.filter(j => j.status === "active").length;
  const completedJobs = safeJobs.filter(j => j.status === "completed").length;
  const failedJobs    = safeJobs.filter(j => j.status === "failed").length;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Task Queue Monitor</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connected ? "#1D9E75" : "#E24B4A",
            animation: connected ? "pulse 1.5s infinite" : "none"
          }}/>
          <span style={{ fontSize: 13, color: connected ? "#0F6E56" : "#A32D2D" }}>
            {connected ? "live" : "disconnected"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total jobs",  value: totalJobs,     color: "#111" },
          { label: "Active",      value: activeJobs,    color: "#185FA5" },
          { label: "Completed",   value: completedJobs, color: "#3B6D11" },
          { label: "Failed",      value: failedJobs,    color: "#A32D2D" },
        ].map(m => (
          <div key={m.label} style={{
            background: "#fff", border: "1px solid #E8E8E5",
            borderRadius: 12, padding: "14px 16px"
          }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", border: "1px solid #E8E8E5", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Jobs by queue</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis dataKey="queue" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="completed" fill="#639922" radius={[4,4,0,0]} />
              <Bar dataKey="failed"    fill="#E24B4A" radius={[4,4,0,0]} />
              <Bar dataKey="waiting"   fill="#BAB8B0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E8E8E5", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Live events</div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {events.length === 0 && (
              <div style={{ fontSize: 13, color: "#aaa" }}>Waiting for events...</div>
            )}
            {events.map((e, i) => (
              <div key={i} style={{
                fontSize: 12, padding: "4px 0",
                borderBottom: "1px solid #F1EFE8",
                display: "flex", gap: 8, alignItems: "center"
              }}>
                <StatusPill status={e.eventName.split(":")[1]} />
                <span style={{ color: "#888", fontFamily: "monospace" }}>{e.jobId?.slice(0, 8)}...</span>
                <span style={{ color: "#aaa" }}>{e.queue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8E8E5", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent jobs</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Job ID", "Queue", "Status", "Attempts", "Created"].map(h => (
                <th key={h} style={{ fontSize: 11, color: "#aaa", textAlign: "left", paddingBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeJobs.map(job => (
              <tr key={job.id}>
                <td style={{ fontSize: 12, fontFamily: "monospace", padding: "6px 0", borderTop: "1px solid #F1EFE8", color: "#666" }}>{job.id.slice(0, 8)}...</td>
                <td style={{ fontSize: 13, padding: "6px 0", borderTop: "1px solid #F1EFE8" }}>{job.queue}</td>
                <td style={{ padding: "6px 0", borderTop: "1px solid #F1EFE8" }}><StatusPill status={job.status} /></td>
                <td style={{ fontSize: 13, padding: "6px 0", borderTop: "1px solid #F1EFE8" }}>{job.attempts}/{job.max_attempts}</td>
                <td style={{ fontSize: 12, color: "#aaa", padding: "6px 0", borderTop: "1px solid #F1EFE8" }}>{new Date(job.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}