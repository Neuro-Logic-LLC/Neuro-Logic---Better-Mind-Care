import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OutlineButton } from '../../components/button/Buttons';

export default function CancelPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('success-bg');
    return () => document.body.classList.remove('success-bg');
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 text-center flex-1 flex items-center justify-center">
      <h1 className="text-3xl font-bold mb-2">Checkout canceled</h1>
      <p className="text-gray-700 mb-6">No charge was made.</p>
      <OutlineButton onClick={() => navigate('/order')}>
        Back to products
      </OutlineButton>
    </div>
  );
}
