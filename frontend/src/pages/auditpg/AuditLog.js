import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';




export default function AuditLog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userTimeZone, setUserTimeZone] = useState('');

  useEffect(() => {
    const detectedTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimeZone(detectedTZ);

    if (!user || !['admin', 'superadmin'].includes(user.role.toLowerCase())) {
      alert('Access denied: Admins only');
      navigate('/dashboard');
      return;
    }

    fetch('/api/auth/audit-log', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // 'X-Client-Timezone': detectedTZ,
        // 'X-Client-Time': new Date().toISOString()
      }
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Unauthorized');
          } else {
            throw new Error(`Error ${res.status}`);
          }
        }
        return res.json();
      })
      .then((data) => setLogs(Array.isArray(data.logs) ? data.logs : []))
      .catch((err) => {
        console.error(err);
        alert('Failed to load audit logs.');
      })
      .finally(() => setLoading(false));
  }, [user, navigate]);

  return (
    <div className="audit-log-page">
      <h2>Audit Log</h2>

      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p>No audit entries found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Description</th>
              <th>IP Address</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.action}</td>
                <td>{log.description}</td>
                <td>{log.ip_address}</td>
                <td>{log.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
