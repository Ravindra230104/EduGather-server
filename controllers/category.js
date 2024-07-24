const mongoose = require('mongoose');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const Category = require('../models/category');
const Link = require('../models/link')

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});



exports.create = async (req, res) => {
    try {
        const { name, image, content } = req.body;

        if (!name || !image || !content) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Ensure req.user is defined
        if (!req.user || !req.user._id) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const base64Data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const type = image.split(';')[0].split('/')[1];

        const slug = slugify(String(name));

        const existingCategory = await Category.findOne({ slug });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category with this slug already exists' });
        }

        let category = new Category({ name, content, slug });
        const params = {
            Bucket: 'edugather',
            Key: `category/${uuidv4()}.${type}`,
            Body: base64Data,
            ContentEncoding: 'base64',
            ContentType: `image/${type}`
        };

        let data;
        try {
            data = await s3.upload(params).promise();
            console.log('S3 Upload Success:', data);
        } catch (s3Error) {
            console.error('S3 Upload Error:', s3Error);
            return res.status(400).json({ error: 'Error uploading to S3' });
        }

        category.image.url = data.Location;
        category.image.key = data.Key;

        category.postedBy = req.user._id;

        try {
            const savedCategory = await category.save();
            console.log('Category Saved:', savedCategory);
            res.json(savedCategory);
        } catch (dbError) {
            console.error('Database Save Error:', dbError);
            return res.status(400).json({ error: 'Error saving category' });
        }
    } catch (err) {
        console.error('General Error:', err);
        res.status(400).json({ error: 'Error uploading to S3 or saving category' });
    }
};




exports.list = async (req, res) => {
    try {
        const data = await Category.find({});
        res.json(data);
    } catch (err) {
        console.error('Error loading categories:', err);
        res.status(400).json({
            error: 'Categories could not load'
        });
    }
};







exports.read = async (req, res) => {
    const { slug } = req.params;
    let limit = req.body.limit ? parseInt(req.body.limit) : 10;
    let skip = req.body.skip ? parseInt(req.body.skip) : 0;

    try {
        console.log(`Finding category with slug: ${slug}`);
        const category = await Category.findOne({ slug }).populate('postedBy', '_id name username').exec();

        if (!category) {
            console.log('Category not found');
            return res.status(400).json({
                error: 'Could not load category'
            });
        }

        console.log(`Found category: ${category.name}`);
        console.log(`Finding links with category: ${category._id}`);

        const links = await Link.find({ categories: category._id })
            .populate('postedBy', '_id name username')
            .populate('categories', 'name')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .exec();

        console.log(`Found ${links.length} links`);

        res.json({ category, links });
    } catch (err) {
        console.error('Error loading category or links:', err);
        return res.status(400).json({
            error: 'Could not load category or links'
        });
    }
};





exports.update = async (req, res) => {
    const { slug } = req.params;
    const { name, image, content } = req.body;

    const base64Data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const type = image.split(';')[0].split('/')[1];

    try {
        let updated = await Category.findOneAndUpdate({ slug }, { name, content }, { new: true }).exec();
        if (!updated) {
            return res.status(400).json({ error: 'Could not find category to update' });
        }

        if (image) {
            // Delete the old image
            const deleteParams = {
                Bucket: 'edugather',
                Key: `${updated.image.key}`
            };

            try {
                await s3.deleteObject(deleteParams).promise();
                console.log('S3 deleted during update');
            } catch (err) {
                console.log('S3 Delete error during update', err);
            }

            // Upload the new image
            const base64Data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const type = image.split(';')[0].split('/')[1];

            const params = {
                Bucket: 'edugather',
                Key: `category/${uuidv4()}.${type}`,
                Body: base64Data,
                ContentEncoding: 'base64',
                ContentType: `image/${type}`
            };

            let data;
            try {
                data = await s3.upload(params).promise();
                console.log('S3 Upload Success:', data);
            } catch (s3Error) {
                console.error('S3 Upload Error:', s3Error);
                return res.status(400).json({ error: 'Error uploading to S3' });
            }

            updated.image.url = data.Location;
            updated.image.key = data.Key;

            try {
                const savedCategory = await updated.save();
                console.log('Category Saved:', savedCategory);
                return res.json(savedCategory);
            } catch (dbError) {
                console.error('Database Save Error:', dbError);
                return res.status(400).json({ error: 'Error saving category' });
            }
        } else {
            return res.json(updated);
        }
    } catch (err) {
        console.error('Database Find and Update Error:', err);
        return res.status(400).json({ error: 'Could not update category' });
    }
};




exports.remove = async (req, res) => {
    const { slug } = req.params;

    try {
        const data = await Category.findOneAndDelete({ slug });
        if (!data) {
            return res.status(400).json({ error: 'Could not find category to delete' });
        }

        const deleteParams = {
            Bucket: 'edugather',
            Key: `${data.image.key}`,
        };

        try {
            await s3.deleteObject(deleteParams).promise();
            console.log('S3 deleted successfully');
        } catch (err) {
            console.log('S3 Delete error during delete', err);
        }

        return res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error finding and deleting category:', err);
        return res.status(400).json({ error: 'Could not delete category' });
    }
};