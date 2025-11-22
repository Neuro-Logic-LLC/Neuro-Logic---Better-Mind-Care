/** @format */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  console.log(user);
  console.log(JSON.stringify(user, null, 2));
  return (
    <div className="dashboard-page">
      <h1 className="title-text">Welcome to Your Dashboard</h1>
      {user.email}

      {user?.role?.toLowerCase() === 'patient' && (
        <div
          style={{ display: 'flex', justifyContent: 'space-evenly' }}
          className="mt-4"
        >
          <button className="btn" onClick={() => navigate('/my-reports')}>
            View Patient Report
          </button>
          <button className="btn" onClick={() => navigate('/order')}>
            Order Labs
          </button>
          <button className="btn" onClick={() => navigate('/screening-order')}>
            Screening Test Results
          </button>
        </div>
      )}
      {['admin', 'superadmin'].includes(user?.role?.toLowerCase()) && (
        <div
          style={{ display: 'flex', justifyContent: 'space-evenly' }}
          className="mt-4"
        >
          <button className="btn" onClick={() => navigate('/intake-form')}>
            Start Patient Intake
          </button>
          <button className="btn" onClick={() => navigate('/admin/users')}>
            Manage Users
          </button>
          <button className="btn" onClick={() => navigate('/admin/logs')}>
            View Audit Logs
          </button>
          <button className="btn" onClick={() => navigate('/patient-orders')}>
            Patient Orders (In progress)
          </button>
        </div>
      )}
      {['doctor'].includes(user?.role?.toLowerCase()) && (
        <div className="mt-4">
          <button className="btn" onClick={() => navigate('/intake-form')}>
            Start Patient Intake
          </button>
          <button className="btn" onClick={() => navigate('/patient-orders')}>
            Patient Orders (In progress)
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
