const express = require('express');
const router = express.Router();

const { userRegisterValidator,userLoginValidator,forgotPasswordValidator,resetPasswordValidator} = require('../validators/auth');
const { runValidation } = require('../validators');
const { register, registerActivate, login, requireSignin,forgotPassword,resetPassword,guestLogin } = require('../controllers/auth');

router.post('/register', userRegisterValidator, runValidation, register);
router.post('/register/activate', registerActivate);
router.post('/guestlogin', guestLogin);
router.post('/login', userLoginValidator, runValidation, login);
router.put('/forgot-password',forgotPasswordValidator,runValidation,forgotPassword)
router.put('/reset-password',resetPasswordValidator,runValidation,resetPassword)

// router.get('/secret',requireSignin, (req,res) => {
//     res.json({
//         data:'This is secret page for logged in users only'
//     })
// })


module.exports = router;
