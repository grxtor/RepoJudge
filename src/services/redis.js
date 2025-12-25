const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', err => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
}

// Helper to get/set cache
async function getCache(key) {
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Redis Get Error:', e);
        return null;
    }
}

async function setCache(key, value, ttlSeconds = 3600) {
    try {
        await redisClient.set(key, JSON.stringify(value), {
            EX: ttlSeconds
        });
    } catch (e) {
        console.error('Redis Set Error:', e);
    }
}

module.exports = {
    redisClient,
    connectRedis,
    getCache,
    setCache
};
