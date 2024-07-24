const express = require('express');
const router = express.Router();

// Validators
const { categoryCreateValidator, categoryUpdateValidator } = require('../validators/category');
const { runValidation } = require('../validators');

// Controllers
const { requireSignin, adminMiddleware } = require('../controllers/auth');
const { create, list, read, update, remove } = require('../controllers/category');

// Routes
router.post('/category', requireSignin, adminMiddleware, categoryCreateValidator, runValidation, create);
router.get('/categories', list);
router.post('/category/:slug', read);
router.put('/category/:slug', requireSignin, adminMiddleware, categoryUpdateValidator, runValidation, update);
router.delete('/category/:slug', requireSignin, adminMiddleware, remove);

module.exports = router;
