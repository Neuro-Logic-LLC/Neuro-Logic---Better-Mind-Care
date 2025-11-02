import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function UserList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // form matches backend keys
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'Patient', // send role name; backend will resolve to UUID
    gender: ''
  });

  useEffect(() => {
    if (!user || !['admin', 'superadmin'].includes(user.role?.toLowerCase())) {
      alert('Access denied: Admins or SuperAdmins only');
      navigate('/dashboard');
      return;
    }
    refetchUsers().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const refetchUsers = async () => {
    const res = await fetch('/api/auth/users', { credentials: 'include' });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
  };

  const resetForm = () => {
    setForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: 'Patient',
      gender: ''
    });
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleCreateUser = async () => {
    // minimal guard
    const required = ['email', 'password', 'phone', 'role'];
    for (const k of required) {
      if (!form[k]) {
        alert('Missing required user fields');
        return;
      }
    }
    const payload = {
      email: form.email,
      password: form.password,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      gender: form.gender,
      // send role name, not role_id (backend resolves):
      role_name: form.role
    };

    const res = await fetch('/api/auth/admin-create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('✅ User created');
      resetForm();
      await refetchUsers();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`❌ Failed: ${err?.error || 'Unknown error'}`);
    }
  };

  const handleResetPassword = async (userId) => {
    const res = await fetch('/api/auth/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, newPassword: resetPassword })
    });
    if (res.ok) {
      alert('✅ Password reset');
      setResetTarget(null);
      setResetPassword('');
      await refetchUsers();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`❌ Failed: ${err?.error || 'Unknown error'}`);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    await fetch(`/api/auth/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    await refetchUsers();
  };

  const handleReactivate = async (userId) => {
    const res = await fetch('/api/auth/users/reactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId })
    });
    if (res.ok) {
      alert('✅ User reactivated');
      await refetchUsers();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(`❌ Failed: ${err?.error || 'Unknown error'}`);
    }
  };

  return (
    <div className="user-list-page">
      <h2>All Users</h2>

      <form
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateUser();
        }}
        style={{
          display: 'grid',
          gap: '0.5rem',
          maxWidth: '520px',
          marginBottom: '2rem'
        }}
      >
        <h3>Create New User</h3>

        <input
          name="first_name"
          placeholder="First name"
          value={form.first_name}
          onChange={handleInput}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />
        <input
          name="last_name"
          placeholder="Last name"
          value={form.last_name}
          onChange={handleInput}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleInput}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />
        <input
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleInput}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        />

        {/* Role by name, not UUID */}
        <select
          name="role"
          value={form.role}
          onChange={handleInput}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        >
          <option>SuperAdmin</option>
          <option>Admin</option>
          <option>Patient</option>
        </select>

        <select
          name="gender"
          value={form.gender}
          onChange={handleInput}
          style={{ padding: '0.5rem', fontSize: '1rem' }}
        >
          <option value="">Select gender (optional)</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        <div style={{ position: 'relative' }}>
          <input
            autoComplete="new-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={handleInput}
            style={{
              width: '100%',
              paddingRight: '2.5rem',
              padding: '0.5rem',
              fontSize: '1rem'
            }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              top: '50%',
              right: '0.75rem',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
            title={showPassword ? 'Hide Password' : 'Show Password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </span>
        </div>

        <button
          type="submit"
          style={{
            padding: '0.5rem',
            fontSize: '1rem',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          ➕ Create User
        </button>
      </form>

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <ul>
          {users.map((u) => {
            if (u.id === user.id) return null;
            return (
              <li key={u.id} style={{ marginBottom: '1rem' }}>
                ({u.email}) – {u.role_name}
                <br />
                <small>
                  Status:{' '}
                  {u.is_deleted
                    ? '❌ Deleted'
                    : u.is_active
                      ? '✅ Active'
                      : '⚠️ Inactive'}
                </small>
                <br />
                {u.is_active && !u.is_deleted && (
                  <>
                    {user.role?.toLowerCase() === 'superadmin' ? (
                      <button
                        style={{ color: 'red' }}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              '🚨 Hard delete this user? This action is permanent.'
                            )
                          )
                            return;
                          const res = await fetch(
                            `/api/auth/admin/user/hard-delete/${u.id}`,
                            {
                              method: 'DELETE',
                              credentials: 'include'
                            }
                          );
                          if (res.ok) {
                            alert('✅ User permanently deleted');
                            await refetchUsers();
                          } else {
                            const err = await res.json().catch(() => ({}));
                            alert(
                              `❌ Failed: ${err?.error || 'Unknown error'}`
                            );
                          }
                        }}
                      >
                        🚨 Hard Delete
                      </button>
                    ) : (
                      <button onClick={() => handleDelete(u.id)}>
                        🗑 Soft Delete
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setResetTarget(u.id)}>
                  🔑 Reset Password
                </button>
                {u.is_deleted && (
                  <button onClick={() => handleReactivate(u.id)}>
                    ♻️ Reactivate
                  </button>
                )}
                <Link
                  to={`/admin/users/${u.id}`}
                  style={{ marginLeft: '0.5rem' }}
                >
                  📄 View Details
                </Link>
                {resetTarget === u.id && (
                  <div>
                    <input
                      type="password"
                      placeholder="New password"
                      autoComplete="new-password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      style={{ marginTop: '0.25rem' }}
                    />
                    <button onClick={() => handleResetPassword(u.id)}>
                      ✅ Confirm
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
