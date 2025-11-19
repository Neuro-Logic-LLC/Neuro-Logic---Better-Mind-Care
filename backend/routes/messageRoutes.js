const express = require('express');
const router = express.Router();
const knex = require('../db/initKnex');
const { verifyToken } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role?.toLowerCase())) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// POST /messages - Create new message (admin only)
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { category, title, body, recipientId, sendAt } = req.body;

    // Validate required fields
    if (!category || !title || !body) {
      return res.status(400).json({ error: 'Category, title, and body are required' });
    }

    // Validate category
    const validCategories = ['system_update', 'announcement', 'one_to_one'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // For one_to_one, recipientId is required
    if (category === 'one_to_one' && !recipientId) {
      return res.status(400).json({ error: 'recipientId required for one_to_one messages' });
    }

    // For broadcast messages, ensure no PHI (basic check)
    if (!recipientId && body.toLowerCase().includes('medical') || body.toLowerCase().includes('diagnosis')) {
      return res.status(400).json({ error: 'Broadcast messages cannot contain potential PHI' });
    }

    // Sanitize HTML body (basic sanitization)
    const sanitizedBody = body.replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]+>/g, (match) => {
      // Allow only safe tags
      const safeTags = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'];
      const tag = match.match(/<\/?([a-z]+)/i)?.[1];
      return safeTags.includes(tag) ? match : '';
    });

    const messageData = {
      recipient_id: recipientId || null,
      sender_type: 'admin', // For now, admin sends all
      category,
      title,
      body: sanitizedBody,
      send_at: sendAt || null,
      is_sent: !sendAt // If no sendAt, mark as sent immediately
    };

    const [message] = await knex('messages').insert(messageData).returning('*');

    // If one_to_one and immediate send, trigger email
    if (category === 'one_to_one' && !sendAt && recipientId) {
      try {
        const user = await knex('users').where('id', recipientId).first();
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: 'You have a new message in your Better Mind Care Dashboard',
            html: `
              <p>You have a new message waiting for you.</p>
              <p>Please sign in to your secure dashboard to view it.</p>
              <p><a href="${process.env.FRONTEND_URL || 'https://staging.bettermindcare.com'}/login">Log In</a></p>
            `
          });
        }
      } catch (emailError) {
        console.error('Failed to send message notification email:', emailError);
        // Don't fail the message creation
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// GET /messages - Get messages for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await knex('messages')
      .leftJoin('message_read_states', function() {
        this.on('messages.id', 'message_read_states.message_id')
            .andOn('message_read_states.user_id', userId);
      })
      .where(function() {
        this.whereNull('recipient_id') // Broadcast messages
            .orWhere('recipient_id', userId); // Direct messages
      })
      .select(
        'messages.*',
        'message_read_states.read_at',
        knex.raw('CASE WHEN message_read_states.read_at IS NULL THEN true ELSE false END as is_new')
      )
      .orderBy('messages.created_at', 'desc');

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /messages/:id - Get message detail and mark as read
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const message = await knex('messages')
      .where('id', id)
      .andWhere(function() {
        this.whereNull('recipient_id').orWhere('recipient_id', userId);
      })
      .first();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Mark as read
    await knex('message_read_states')
      .insert({
        message_id: id,
        user_id: userId,
        read_at: knex.fn.now()
      })
      .onConflict(['message_id', 'user_id'])
      .merge({ read_at: knex.fn.now() });

    res.json({ ...message, is_new: false });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// PATCH /messages/:id/read - Mark message as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await knex('message_read_states')
      .insert({
        message_id: id,
        user_id: userId,
        read_at: knex.fn.now()
      })
      .onConflict(['message_id', 'user_id'])
      .merge({ read_at: knex.fn.now() });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// GET /admin/messages - Admin audit view
router.get('/admin/messages', verifyToken, requireAdmin, async (req, res) => {
  try {
    const messages = await knex('messages')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(100); // Limit for admin view

    res.json(messages);
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;