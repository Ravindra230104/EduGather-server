const express = require('express');
const router = express.Router();

// Validators
const { linkCreateValidator, linkUpdateValidator } = require('../validators/link');
const { runValidation } = require('../validators');

// Controllers
const { requireSignin, authMiddleware, adminMiddleware, canUpdateDeleteLink } = require('../controllers/auth');
const { 
    create, 
    list, 
    read, 
    update, 
    remove, 
    clickCount, 
    popular, 
    popularInCategory, 
    approve, // Import the approve function
    listUnapproved
} = require('../controllers/link');

// Routes
router.post('/link', requireSignin, authMiddleware, linkCreateValidator, runValidation, create);
router.post('/links', requireSignin, adminMiddleware, list); // Admin can list all links
router.get('/links/unapproved', requireSignin, adminMiddleware, listUnapproved); // New route to list unapproved links
router.put('/link/:id/approve', requireSignin, adminMiddleware, approve); // New route for approving links
router.put('/click-count', clickCount);
router.get('/link/popular', popular);
router.get('/link/popular/:slug', popularInCategory);
router.post('/link/:id', read);
router.put('/link/:id', requireSignin, authMiddleware, linkUpdateValidator, runValidation, canUpdateDeleteLink, update);
router.put('/link/admin/:id', requireSignin, adminMiddleware, linkUpdateValidator, runValidation, update);
router.delete('/link/:id', requireSignin, authMiddleware, canUpdateDeleteLink, remove);
router.delete('/link/admin/:id', requireSignin, adminMiddleware, remove);

module.exports = router;
