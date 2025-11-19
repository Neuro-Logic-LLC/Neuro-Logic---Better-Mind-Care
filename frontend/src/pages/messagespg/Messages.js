/** @format */

import React from 'react';

function Messages() {
  // Sample messages - in real app, this would come from API
  const messages = [
    {
      id: 1,
      from: 'Support Team',
      subject: 'Welcome to Better Mind Care',
      date: '2025-11-15',
      preview: 'Thank you for joining us. Your account is now active...'
    },
    {
      id: 2,
      from: 'Dr. Smith',
      subject: 'Your Lab Results Are Ready',
      date: '2025-11-10',
      preview: 'Your recent lab results have been analyzed and are available...'
    },
    {
      id: 3,
      from: 'System',
      subject: 'Appointment Reminder',
      date: '2025-11-08',
      preview: 'You have an upcoming appointment scheduled for tomorrow...'
    }
  ];

  return (
    <div className="messages-page">
      <h1>Messages</h1>
      <p>Your messages and notifications from the Better Mind Care team.</p>

      <div className="messages-list">
        {messages.map(message => (
          <div key={message.id} className="message-item">
            <div className="message-header">
              <strong>{message.from}</strong>
              <span className="message-date">{message.date}</span>
            </div>
            <div className="message-subject">{message.subject}</div>
            <div className="message-preview">{message.preview}</div>
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <p className="no-messages">No messages at this time.</p>
      )}
    </div>
  );
}

export default Messages;