const Link = require('../models/link')
const slugify = require('slugify');
const mongoose = require('mongoose');
const User = require('../models/user')
const Category = require('../models/category')
const {linkPublishedParams} = require('../helpers/email')
const AWS = require('aws-sdk')

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const ses = new AWS.SES();

exports.create = async (req, res) => {
    const { title, url, categories, type = 'Free', medium = 'Video' } = req.body;
    const slug = slugify(title, { lower: true, strict: true }); // Create slug from title

    try {
        const link = new Link({
            title,
            url,
            categories,
            type,
            medium,
            slug,
            postedBy: req.user._id // Associate the link with the authenticated user
        });

        const data = await link.save(); // Save link and wait for completion
        res.json(data);

        // Find all users in category
        const users = await User.find({ categories: { $in: categories } }).exec();
        const result = await Category.find({ _id: { $in: categories } }).exec();
        data.categories = result;

        for (let i = 0; i < users.length; i++) {
            const params = linkPublishedParams(users[i].email, data);
            const sendEmail = ses.sendEmail(params).promise();

            try {
                const success = await sendEmail;
                console.log('email submitted to SES', success);
            } catch (failure) {
                console.log('error on email submitted to SES', failure);
            }
        }

    } catch (err) {
        console.error('Error saving link:', err);
        res.status(400).json({
            error: 'Link already exists or another error occurred'
        });
    }
};



exports.list = async (req, res) => {
    let limit = req.body.limit ? parseInt(req.body.limit) : 10;
    let skip = req.body.skip ? parseInt(req.body.skip) : 0;

    try {
        const data = await Link.find()
            .populate('postedBy', 'name')
            .populate('categories', 'name slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
        
        res.json(data);
    } catch (err) {
        console.error('Error listing links:', err);
        return res.status(400).json({
            error: 'Could not list links'
        });
    }
};


exports.read = async (req, res) => {
    const { id } = req.params;

    try {
        // Query by slug instead of ObjectId
        const data = await Link.findOne({ slug: id }).exec();
        if (!data) {
            return res.status(404).json({
                error: 'Link not found'
            });
        }
        res.json(data);
    } catch (err) {
        console.error('Error while reading the link:', err.message);
        return res.status(400).json({
            error: 'Error while reading the link',
            details: err.message
        });
    }
};



exports.update = async (req, res) => {
    const { id } = req.params;
    const { title, url, categories, type, medium } = req.body;
    const updatedLink = { title, url, categories, type, medium };

    try {
        const updated = await Link.findOneAndUpdate({ _id: id }, updatedLink, { new: true }).exec();
        res.json(updated);
    } catch (err) {
        return res.status(400).json({
            error: 'Error updating the link'
        });
    }
};



exports.remove = async (req, res) => {
    const { id } = req.params;

    try {
        await Link.findOneAndDelete({ _id: id }).exec();
        res.json({
            message: 'Link removed successfully'
        });
    } catch (err) {
        return res.status(400).json({
            error: 'Error removing the link'
        });
    }
};



exports.clickCount = async (req, res) => {
    const { linkId } = req.body;

    try {
        const result = await Link.findByIdAndUpdate(
            linkId, 
            { $inc: { clicks: 1 } }, 
            { upsert: true, new: true }
        ).exec();
        
        res.json(result);
    } catch (err) {
        res.status(400).json({
            error: 'Could not update view count'
        });
    }
};



exports.popular = async (req, res) => {
    try {
        const links = await Link.find()
            .populate('postedBy', 'name')
            .sort({ clicks: -1 })
            .limit(3)
            .exec();
        res.json(links);
    } catch (err) {
        return res.status(400).json({
            error: 'Links not found'
        });
    }
};

exports.popularInCategory = async (req, res) => {
    const { slug } = req.params;
    try {
        const category = await Category.findOne({ slug }).exec();
        if (!category) {
            return res.status(400).json({
                error: 'Could not load category'
            });
        }

        const links = await Link.find({ categories: category })
            .sort({ clicks: -1 })
            .limit(3)
            .exec();
        res.json(links);
    } catch (err) {
        return res.status(400).json({
            error: 'Links not found'
        });
    }
};
