/** @format */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './messages.css';

function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSenderLabel = (senderType, category) => {
    switch (senderType) {
      case 'admin':
        return 'Admin';
      case 'clinician':
        return 'Clinician';
      case 'system':
        return category === 'system_update' ? 'System Update' : 'Announcement';
      default:
        return 'Better Mind Care';
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'system_update':
        return 'System Update';
      case 'announcement':
        return 'Announcement';
      case 'one_to_one':
        return 'Direct Message';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="messages-page">
        <h1>Messages</h1>
        <p>Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="messages-page">
        <h1>Messages</h1>
        <p>Error loading messages: {error}</p>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <h1>Messages</h1>
      <p>Your messages and notifications from the Better Mind Care team.</p>

      <div className="messages-list">
        {messages.map(message => (
          <div key={message.id} className="message-item">
            <div className="message-header">
              <strong>{getSenderLabel(message.sender_type, message.category)}</strong>
              <span className="message-category">{getCategoryLabel(message.category)}</span>
              <span className="message-date">
                {new Date(message.created_at).toLocaleDateString()}
              </span>
              {message.is_new && <span className="new-badge">New</span>}
            </div>
            <div className="message-subject">{message.title}</div>
            <div className="message-preview" dangerouslySetInnerHTML={{
              __html: message.body.length > 100 ? message.body.substring(0, 100) + '...' : message.body
            }} />
          </div>
        ))}
      </div>

      {messages.length === 0 && (
        <p className="no-messages">Updates and important notices will appear here.</p>
      )}
    </div>
  );
}

export default Messages;