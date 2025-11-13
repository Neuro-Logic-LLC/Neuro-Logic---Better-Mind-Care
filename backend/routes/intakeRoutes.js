const express = require('express');
const router = express.Router();
const { submitIntake, getMyReports} = require('../controllers/intakeController');
const { verifyToken, requireAdmin, requireAdminOrDoctor } = require('../middleware/auth');

// Admin submits intake form on behalf of patient
router.post('/submit',  requireAdminOrDoctor, submitIntake);


// Patient views their own reports
router.get('/my-reports', getMyReports);

module.exports = router;