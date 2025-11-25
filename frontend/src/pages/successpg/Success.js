import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchPaidCalendarAccess } from '../../calendarApi/calendarApi';

export default function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.classList.add('success-bg');
    return () => document.body.classList.remove('success-bg');
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userId = params.get('userId');
    const productKey = params.get('productKey');

    if (!userId || !productKey) return;

    async function redirectToMeeting() {
      try {
        // Call backend to verify payment and get Google Meet link
        const { join_url } = await fetchPaidCalendarAccess(userId, productKey);

        // Redirect user to Google Meet
        window.location.href = join_url;
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to access calendar.');
      }
    }

    redirectToMeeting();
  }, [location.search]);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center flex-1 flex items-center justify-center">
      <h1 className="text-3xl font-bold mb-2">Payment complete</h1>
      <p className="text-gray-700 mb-6">
        Thanks! A receipt will be emailed by Stripe.
      </p>

      {error && <p className="text-red-600 mb-4">{error}</p>}

       <OutlineButton onClick={() => navigate('/login')}>
         Go to Login
       </OutlineButton>
    </div>
  );
}
