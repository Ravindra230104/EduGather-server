const AWS = require('aws-sdk');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { registerEmailParams,forgotPasswordEmailParams } = require('../helpers/email');
const shortId = require('shortid');
const { expressjwt: expressJwt } = require('express-jwt');
const _ = require('lodash')
const Link = require('../models/link')

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const ses = new AWS.SES({ apiVersion: '2018-12-01' });


exports.register = async (req, res) => {
    const { name, email, password, categories } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({
                error: 'Email is already taken',
            });
        }

        // Generate token with user name, email, and password
        const token = jwt.sign({ name, email, password, categories }, process.env.JWT_ACCOUNT_ACTIVATION, {
            expiresIn: '10m',
        });

        const params = registerEmailParams(email, token);

        const sendEmailOnRegister = ses.sendEmail(params).promise();

        await sendEmailOnRegister;
        console.log('email submitted to SES', sendEmailOnRegister);
        res.json({
            message: `Email has been sent to ${email}. Follow the instructions to complete your registration.`,
        });
    } catch (error) {
        console.log('Error in user registration:', error);
        res.status(500).json({
            message: 'Email could not be sent, please check your email again',
        });
    }
};

exports.registerActivate = async (req, res) => {
    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION);

        const { name, email, password, categories } = jwt.decode(token);
        const username = shortId.generate();

        const user = await User.findOne({ email });

        if (user) {
            return res.status(401).json({
                error: 'Email is taken',
            });
        }

        // Register new user
        const newUser = new User({ username, name, email, password, categories });

        await newUser.save();

        return res.json({
            message: 'Registration success. Please login.',
        });
    } catch (error) {
        console.log('Error in user registration activation:', error);
        return res.status(401).json({
            error: 'Expired link. Try again',
        });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                error: 'User with that email does not exist. Please register.',
            });
        }

        // authenticate
        if (!user.authenticate(password)) {
            return res.status(400).json({
                error: 'Email and password do not match.',
            });
        }

        // generate token and send to the client
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const { _id, name, role } = user;

        return res.json({
            token,
            user: { _id, name, email, role },
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            error: 'Something went wrong. Please try again later.',
        });
    }
};

// Example middleware to set req.user
exports.requireSignin = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = decoded; // Make sure req.user is set with user data
        next();
    });
};



exports.authMiddleware = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                error: 'Authentication required',
            });
        }

        const authUserId = req.user._id;
        const user = await User.findById(authUserId).exec();
        if (!user) {
            return res.status(400).json({
                error: 'User not found',
            });
        }
        req.profile = user;
        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        res.status(500).json({
            error: 'Internal server error',
        });
    }
};


exports.adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                error: 'No user authenticated',
            });
        }

        const adminUserId = req.user._id;
        const user = await User.findById(adminUserId);

        if (!user) {
            return res.status(400).json({
                error: 'User not found',
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                error: 'Admin resource. Access denied',
            });
        }

        req.profile = user;
        next();
    } catch (error) {
        console.error('Error in adminMiddleware:', error);
        return res.status(500).json({
            error: 'An error occurred while processing your request',
        });
    }
};




exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        // Check if user exists with that email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({
                error: 'User with that email does not exist'
            });
        }

        // Generate token and email to user
        const token = jwt.sign({ name: user.email }, process.env.JWT_RESET_PASSWORD, { expiresIn: '10m' });
        
        // Send email
        const params = forgotPasswordEmailParams(email, token);

        // Populate the db user reset password link
        await user.updateOne({ resetPasswordLink: token });

        const sendEmail = ses.sendEmail(params).promise();
        await sendEmail;

        console.log('SES reset password success', sendEmail);
        return res.json({
            message: `Email has been sent to ${email}. Click on the link to reset your password`
        });
    } catch (error) {
        console.log('SES reset password failed', error);
        return res.status(400).json({
            error: 'Password reset failed. Try later'
        });
    }
};



 
exports.resetPassword = async (req, res) => {
    const { resetPasswordLink, newPassword } = req.body;

    if (!resetPasswordLink) {
        return res.status(400).json({ error: 'Reset password link is required' });
    }
  
    if (resetPasswordLink) {
      try {
        // Verify JWT token for expiry
        await jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD);
      } catch (err) {
        return res.status(400).json({ error: 'Expired Link. Try again' });
      }
  
      try {
        // Find user by reset password link
        const user = await User.findOne({ resetPasswordLink });
  
        if (!user) {
          return res.status(400).json({ error: 'Invalid token. Try again' });
        }
  
        // Update user password and remove reset link
        user.password = newPassword;
        user.resetPasswordLink = '';
  
        // Save updated user data
        await user.save();
  
        res.json({ message: `Great! Now you can login with your new password` });
      } catch (err) {
        return res.status(400).json({ error: 'Password reset failed. Try again' });
      }
    }
  };
  


exports.canUpdateDeleteLink = async (req, res, next) => {
    const { id } = req.params;

    try {
        const link = await Link.findOne({ _id: id }).exec();
        
        if (!link) {
            return res.status(400).json({
                error: 'Could not find Link'
            });
        }

        const authorizedUser = link.postedBy._id.toString() === req.user._id.toString();
        
        if (!authorizedUser) {
            return res.status(400).json({
                error: 'You are not authorized'
            });
        }

        next();
    } catch (err) {
        console.error('Error finding or authorizing link:', err);
        return res.status(400).json({
            error: 'Could not find Link'
        });
    }
};