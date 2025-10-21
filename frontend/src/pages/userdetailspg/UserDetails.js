import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

export default function UserDetails() {
  const { id } = useParams();
  const { user: currentUser, setUser } = useAuth();

  const [user, setUserDetails] = useState(null);
  const [form, setForm] = useState({
    email: '',
    phone: '',
    role_id: '',
    first_name: '',
    last_name: '',
    gender: ''
  });

  useEffect(() => {
    fetch(`/api/auth/users/${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setUserDetails(data);
        setForm({
          email: data.email || '',
          phone: data.phone || '',
          role_id: data.role_id || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          gender: data.gender || ''
        });
      })
      .catch((err) => {
        console.error(err);
        alert('❌ Failed to load user details');
      });
  }, [id]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: id, ...form })
      });

      if (res.ok) {
        alert('✅ User updated');

        // 🔁 Only rehydrate session if the updated user is the logged-in user
        if (id === currentUser?.id) {
          const refreshed = await fetch('/api/auth/me', {
            credentials: 'include'
          });
          const data = await refreshed.json();
          setUser(data.user);
        }
      } else {
        const err = await res.json();
        alert(`❌ Failed: ${err?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Server error');
    }
  };
  if (!user) return <p>Loading...</p>;

  return (
    <div className="user-detail-page">
      <h2>User Details</h2>
      <p>
        <strong>ID:</strong> {user.id}
      </p>
      <p>
        <strong>First Name:</strong> {user.first_name}
      </p>
      <p>
        <strong>Last Name:</strong> {user.last_name}
      </p>
      <p>
        <strong>Email:</strong> {user.email}
      </p>
      <p>
        <strong>Phone:</strong> {user.phone}
      </p>
      <p>
        <strong>Role:</strong> {user.role_name}
      </p>
      <p>
        <strong>Gender:</strong> {user.gender}
      </p>
      <p>
        <strong>Status:</strong> {user.is_active ? 'Active' : 'Inactive'}
      </p>
      <p>
        <strong>Deleted:</strong> {user.is_deleted ? 'Yes' : 'No'}
      </p>
      <p>
        <strong>Created:</strong> {user.created_at}
      </p>
      <p>
        <strong>Updated:</strong> {user.updated_at}
      </p>
      <hr style={{ margin: '2rem 0' }} />
      <h3>Edit User</h3>

      {[
        'email',
        'phone',
        'role_id',
        'first_name',
        'last_name'
      ].map((field) => (
        <div key={field} style={{ marginBottom: '0.75rem' }}>
          <label>{field.replace('_', ' ')}:</label>
          <input
            name={field}
            value={form[field]}
            onChange={handleChange}
            style={{ padding: '0.5rem', width: '100%' }}
          />
        </div>
      ))}

      <div style={{ marginBottom: '1rem' }}>
        <label>Gender:</label>
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          style={{ padding: '0.5rem', width: '100%' }}
        >
          <option value="">Select gender</option> 
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Nonbinary">Non-binary</option>
          <option value="Prefer_not_say">Prefer not to say</option>
        </select>
      </div>

      <button
        onClick={handleUpdate}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#333',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        💾 Save Changes
      </button>
    </div>
  );
}
