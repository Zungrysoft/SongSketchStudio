const User = require('../database/models/user');

module.exports = {
    // Finds a User by ID and returns a formatted object, removing sensitive info
    getUserDataById: async function (id) {
        try {
            const user = await User.findById(id).exec();
            return {
                username: user.username,
                fullname: user.fullname,
                // eslint-disable-next-line no-underscore-dangle
                _id: user._id,
            };
        } catch (error) {
            console.log(`Unable to fetch User from database with id: ${id}`);
            return {};
        }
    }
}
