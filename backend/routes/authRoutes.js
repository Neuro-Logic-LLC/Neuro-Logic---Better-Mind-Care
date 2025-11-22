const { verifyToken, requireAdminOrDoctor} = require("../middleware/auth");
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 🔐 Public routes



/**
 * @openapi
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email }
 *         password: { type: string, minLength: 8 }
 *     VerifyMfaRequest:
 *       type: object
 *       required: [email, code]
 *       properties:
 *         email: { type: string, format: email }
 *         code:  { type: string, minLength: 6, maxLength: 6 }
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       '200': { description: Logged in }
 *       '401': { description: Invalid credentials }
 */


router.post("/login", authController.login);         // Login and sets HttpOnly cookie

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Log out
 *     responses:
 *       '204': { description: Logged out }
 */

router.post("/logout", verifyToken, authController.logout);       // Clears the cookie

// 👤 Authenticated user session check
/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Current user
 */
router.get("/me", verifyToken,  authController.getMe); // Gets user from verified JWT

// 🛡️ Admin-only protected routes
/**
 * @openapi
 * /api/auth/create-user:
 *   post:
 *     summary: Create user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:  { type: string, format: email }
 *               name:   { type: string }
 *               role:   { type: string }
 *     responses:
 *       '201': { description: Created }
 *       '401': { description: Unauthorized }
 */
router.post("/admin-create-user", verifyToken, authController.adminCreateUser)

router.post("/create-user", verifyToken, authController.createUser);
/**
 * @openapi
 * /api/auth/users/{id}:
 *   get:
 *     summary: Get user by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '200': { description: OK }
 *       '404': { description: Not found }
 */
router.get("/users/:id", verifyToken, authController.getUserById);

/**
 * @openapi
 * /api/auth/users:
 *   get:
 *     summary: List users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200': { description: OK }
 */

router.get("/users", verifyToken, requireAdminOrDoctor,authController.getAllUsers);


// router.post("/users/reset-password", verifyToken, authController.resetUserPassword);


/**
 * @openapi
 * /api/auth/users/{id}:
 *   delete:
 *     summary: Delete user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '204': { description: Deleted }
 */
router.delete("/users/:id", verifyToken, authController.deleteUser);



/**
 * @openapi
 * /api/auth/verify-mfa:
 *   post:
 *     summary: Verify MFA
 *     responses:
 *       '200': { description: Verified }
 *       '400': { description: Invalid code }
 */
router.post('/verify-mfa', authController.verifyMfa);

/**
 * @openapi
 * /api/auth/dev-mfa:
 *   get:
 *     summary: (dev) Get current MFA code for an email
 *     parameters:
 *       - in: query
 *         name: email
 *         schema: { type: string, format: email }
 *         required: true
 *     responses:
 *       '200': { description: OK }
 *       '404': { description: Not found }
 */
router.get('/dev-mfa', async (req, res) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  const knex = await require('../db/initKnex')();
  const { identHash } = require('../utils/identHash');
  const email = String(req.query.email || '');
  const row = await knex('users').select('mfa_code','mfa_expires_at')
    .where({ email_hash: identHash(email) }).first();
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});
/**
 * @openapi
 * /api/auth/audit-log:
 *   get:
 *     summary: Audit log
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200': { description: OK }
 */
router.get('/audit-log', verifyToken, authController.getAuditLog);

/**
 * @openapi
 * /api/auth/users/reactivate:
 *   post:
 *     summary: Reactivate user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200': { description: Reactivated }
 */
router.post('/users/reactivate', verifyToken, authController.reactivateUser);

/**
 * @openapi
 * /api/auth/users/{id}:
 *   put:
 *     summary: Update user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object }
 *     responses:
 *       '200': { description: Updated }
 */
router.put('/users/:id', verifyToken, authController.updateUser);


/**
 * @openapi
 * /api/auth/public-signup:
 *   post:
 *     summary: Public signup
 *     responses:
 *       '201': { description: Created }
 */
router.post('/public-signup', authController.publicSignup);

router.post('/paid-signup', authController.paidSignup);



/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Forgot password
 *     responses:
 *       '200': { description: Email sent }
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     responses:
 *       '200': { description: Password reset }
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @openapi
 * /api/auth/confirm-email:
 *   post:
 *     summary: Confirm email
 *     responses:
 *       '200': { description: Confirmed }
 */
router.post('/confirm-email', authController.confirmEmail);

/**
 * @openapi
 * /api/auth/resend-confirmation:
 *   post:
 *     summary: Resend confirmation email
 *     responses:
 *       '200': { description: Sent }
 */
router.post('/resend-confirmation', authController.resendEmailConfirmation);

// /**
//  * @openapi
//  * /api/auth/forgot-username:
//  *   post:
//  *     summary: Forgot username
//  *     responses:
//  *       '200': { description: Email sent }
//  */
// router.post('/forgot-username', authController.forgotUsername);

/**
 * @openapi
 * /api/auth/admin/user/hard-delete/{id}:
 *   delete:
 *     summary: Hard delete user (superadmin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       '204': { description: Deleted }
 */
// ✅ SuperAdmin-only Hard Delete
router.delete("/admin/user/hard-delete/:id", verifyToken, authController.hardDeleteUser);


router.get("/check-email-exists", authController.checkAndValidateEmailExists);

module.exports = router;