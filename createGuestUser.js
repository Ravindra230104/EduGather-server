require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user'); // Adjust the path as needed

// Connect to your MongoDB database
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('Database connected');
})
.catch(err => {
    console.error('Database connection error:', err);
});

// Function to create the guest user
const createGuestUser = async () => {
    const guestUser = new User({
        name: 'Guest User',
        email: 'ravindrasapkal2304@gmail.com',
        password: '121212',
        role: 'guest',
    });

    try {
        const user = await guestUser.save();
        console.log('Guest user created:', user);
        mongoose.connection.close(); // Close the connection after creation
    } catch (err) {
        console.error('Error creating guest user:', err);
        mongoose.connection.close(); // Close the connection if there's an error
    }
};

// Run the function to create the guest user
createGuestUser();
