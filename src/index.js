require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const { connectDB } = require('./Configs/mongoDb');
const { redisClient } = require('./Configs/redisConfig');
const { TaskModel } = require('./Modals/TaskModels');

const PORT = process.env.PORT || 8080;
const REDIS_KEY = process.env.REDIS_KEY || 'FULLSTACK_TASK_Manikant';

const app = express();
app.use(cors({
    origin: ['http://localhost:5173','https://kazamanikant.vercel.app/'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Connect to Redis
async function connectRedis() {
    try {
        await redisClient.connect();
        console.log('Redis Connected');
    } catch (error) {
        console.error('Redis connection error:', error);
    }
}

// MQTT Setup
const mqttClient = mqtt.connect(process.env.MQTT_URL); // Public broker

mqttClient.on('connect', () => {
    console.log('MQTT Connected');
    mqttClient.subscribe('/add');
});

mqttClient.on('message', async (topic, message) => {
    if (!redisClient) return console.error('Redis not initialized yet.');

    if (topic === '/add') {
        const newTask = message.toString();
        // console.log('New Task:', newTask);

        let tasks = [];
        const cacheData = await redisClient.get(REDIS_KEY);
        // console.log('Cache Data:', cacheData);

        if (cacheData) {
            tasks = JSON.parse(cacheData);
        }

        tasks.push(newTask);

        if (tasks.length > 50) {
            await TaskModel.insertMany(tasks.map(content => ({ content })));
            await redisClient.del(REDIS_KEY);
            console.log('Moved 50+ tasks to MongoDB and cleared cache');
        } else {
            await redisClient.set(REDIS_KEY, JSON.stringify(tasks));
            console.log('Task added to Redis:', newTask);
        }
    }
});


app.get('/fetchAllTasks', async (req, res) => {
    try {
        if (!redisClient) return res.status(500).json({ error: 'Redis not connected yet' });

        const cacheData = await redisClient.get(REDIS_KEY);
        const redisTasks = cacheData ? JSON.parse(cacheData) : [];
        // console.log('Redis Tasks:', redisTasks);

        const mongoTasks = await TaskModel.find();
        // console.log('MongoDB Tasks:', mongoTasks);
        
        const allMongo = mongoTasks.map(t => t.content);

        res.json({message:"Task fetched successfully", data: [...redisTasks, ...allMongo]});
    } catch (err) {
        res.status(500).json({message:'Failed to fetch tasks',error: err});
    }
});

app.listen(PORT, async () => {
    try {
        await connectRedis();
        await connectDB();
        console.log(`Server running on port ${PORT}`);
    } catch (error) {
        console.error('Error running to Server:', error);
    }
});
