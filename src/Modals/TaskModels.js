const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
}, {versionKey: false});

const TaskModel = mongoose.model('Task', TaskSchema);

module.exports = {TaskModel};