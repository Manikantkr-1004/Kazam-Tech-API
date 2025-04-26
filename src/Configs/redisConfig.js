const redis = require('redis');

let redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_URL,
        port: process.env.REDIS_PORT,
        tls: false
    },
    password: process.env.REDIS_PASSWORD
});

module.exports = {redisClient};