import React, { useEffect, useState } from "react";

export default function EvexiaPatientList({ onSelect = () => {} }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/evexia/list-all-patients", {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Error ${res.status}: ${text}`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.patients || data.items || [];
      setPatients(list);
    } catch (err) {
      console.error("Fetch patients failed:", err);
      setError(err.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSelect = (patient) => {
    setSelected(patient.PatientID || patient.patientId);
    onSelect(patient);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Evexia Patients</h2>

      {loading && <p>Loading patients...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={th}>Select</th>
                <th style={th}>Name</th>
                <th style={th}>Patient ID</th>
                <th style={th}>Order ID</th>
                <th style={th}>Email</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => {
                const id = p.PatientID || p.patientId;
                const name = `${p.FirstName || ""} ${p.LastName || ""}`.trim() || "—";
                return (
                  <tr
                    key={i}
                    style={{
                      background: selected === id ? "#e0f2fe" : "transparent",
                      borderTop: "1px solid #eee",
                    }}
                  >
                    <td style={td}>
                      <button onClick={() => handleSelect(p)} style={btn(selected === id)}>
                        {selected === id ? "Selected" : "Select"}
                      </button>
                    </td>
                    <td style={td}>{name}</td>
                    <td style={td}>{id || ""}</td>
                    <td style={td}>{p.PatientOrderID || p.patientOrderId || ""}</td>
                    <td style={td}>{p.EmailAddress || p.email || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Inline minimal styles
const th = {
  padding: "8px 12px",
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  fontWeight: 600,
};
const td = { padding: "8px 12px" };
const btn = (active) => ({
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid",
  background: active ? "#0ea5e9" : "transparent",
  color: active ? "white" : "#0f172a",
  borderColor: active ? "#0ea5e9" : "#cbd5e1",
  cursor: "pointer",
});