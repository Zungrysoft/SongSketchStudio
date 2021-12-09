const User = require('../database/models/user');

// Finds a User by ID and returns a formatted object, removing sensitive info
async function getUserDataById(id) {
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
// Checks if the user making this request is the owner of the section
function isOwner(req, object) {
    if (!req.user) {
        return false;
    }
    if (object.owner.toString() !== req.user.id) {
        return false;
    }
    return true;
}
function checkIsOwner(req, res, object) {
    if (isOwner(req, object)) {
        return false;
    }
    return res.status(403).json({
        error: 'This account is not authorized for this object',
    });
}

// Checks if the user making this request is allowed to edit this section
function isEditor(req, object) {
    if (isOwner(req, object)) {
        return true;
    }
    if (!req.user) {
        return false;
    }
    var editors = object.editors;
    for (let i = 0; i < editors.length; i ++) {
        var item = editors[i];
        if (item.toString() === req.user.id.toString()) {
            return true;
        }
    }
    return false;
}
function checkIsEditor(req, res, object) {
    if (isEditor(req, object)) {
        return false;
    }
    return res.status(403).json({
        error: 'This account is not authorized for this object',
    });
}

module.exports = {getUserDataById, isOwner, checkIsOwner, isEditor, checkIsEditor};

