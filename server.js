const express = require('express');
const morgan = require('morgan');
const bodyparser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express()


// DB
mongoose.connect(process.env.DATABASE_CLOUD, {
    useNewUrlParser: true,
    useUnifiedTopology: true,

  })
        .then(()=> console.log('DB Connected successfully'))
        .catch(err => console.log(err));

// import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const categoryRoutes = require('./routes/category');
const linkRoutes = require('./routes/link');


// app middlewares
app.use(morgan('dev'));
app.use(bodyparser.json({limit:'5mb',type:'application/json'}));
app.use(cors({origin:process.env.CLIENT_URL}));


// middlewares
app.use('/api',authRoutes);
app.use('/api',userRoutes);
app.use('/api',categoryRoutes);
app.use('/api',linkRoutes);


const port = process.env.PORT || 8000;
app.listen(port,()=> console.log(`App is running on port ${port}`));