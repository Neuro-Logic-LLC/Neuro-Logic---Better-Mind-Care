/** @format */

import React from 'react';
import Breadcrumb from '../../components/Breadcrumb';

function Messages() {
  // Sample messages - in real app, this would come from API
  const messages = [
    {
      id: 1,
      from: 'Message from Support',
      subject: 'Welcome to Better Mind Care',
      date: '2025-11-15',
      preview: 'Thank you for joining us. Your account is now active...'
    },
    {
      id: 2,
      from: 'Message from Support',
      subject: 'Your Lab Results Are Ready',
      date: '2025-11-10',
      preview: 'Your recent lab results have been analyzed and are available...'
    },
    {
      id: 3,
      from: 'System Update',
      subject: 'Appointment Reminder',
      date: '2025-11-08',
      preview: 'You have an upcoming appointment scheduled for tomorrow...'
    }
  ];

  return (
    <div className="messages-page bg-gradient-white-seafoam" style={{ minHeight: '100vh' }}>
      <style>{`@media (max-width: 768px) { .messages-page h1 { text-align: center; } }`}</style>
      <Breadcrumb items={[
        { label: 'Home', path: '/' },
        { label: 'Messages' }
      ]} />
      <h1>Messages from Better Mind Care</h1>

      <div className="messages-list" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {messages.map(message => (
          <div key={message.id} className="message-item">
             <div className="message-header">
               <strong>{message.from}</strong>
               <span className="message-date" style={{ marginLeft: '1rem' }}>{message.date}</span>
             </div>
            <div className="message-subject">{message.subject}</div>
            <div className="message-preview">{message.preview}</div>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <p className="no-messages">You don’t have any messages yet. We’ll notify you whenever there’s an important update or a personal message from our team.</p>
      )}
    </div>
  );
}

export default Messages;