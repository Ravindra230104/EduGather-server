const mongoose = require('mongoose');
const {ObjectId} = mongoose.Schema

const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        trim:true,
        required:true,
        max:32
    },
    slug:{
        type:String,
        lowercase:true,
        unique:true,
        index:true,
        slug: "title"
    },
    image:{
        url:String,
        key:String
    },
    content:{
        type:{},
        min:10,
        max:2000
    },
    postedBy:{
        type:ObjectId,
        ref:'User'
    }
},{timestamps:true})


module.exports = mongoose.model('Category',categorySchema)