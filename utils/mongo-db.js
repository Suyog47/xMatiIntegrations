// mongo.js
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

// eslint-disable-next-line no-undef
const MONGO_URI = process.env.MONGO_URI;
// eslint-disable-next-line no-undef
const DB_NAME = process.env.DB_NAME;
// eslint-disable-next-line no-undef
const dbEnv = process.env.DB_ENV;

let client;
let db;

async function connectMongo() {
    if (db) return db;
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db(DB_NAME);
    return db;
}


async function ensureCollection(collectionName) {
    const database = await connectMongo();
    const existing = await database.listCollections({ name: collectionName }).toArray();
    if (!existing.length) {
        await database.createCollection(collectionName);
    }
    const coll = database.collection(collectionName);
    try {
        await coll.createIndex({ key: 1 }, { unique: true });
    } catch (err) {
        // If duplicates exist, unique index creation will fail — we'll log and continue.
        if (err.codeName) {
            console.warn(`Warning creating unique index on ${collectionName}.key:`, err.message);
        } else {
            throw err;
        }
    }
    return coll;
}

async function saveDocument(collectionName, key, content) {
    try {
        const coll = await ensureCollection(collectionName);

        let payload = content;
        if (typeof content === "string") {
            // eslint-disable-next-line no-unused-vars
            try { payload = JSON.parse(content); } catch (e) { payload = content; }
        }

        await coll.updateOne(
            { key },
            {
                $set: { content: payload, updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        return true;
    } catch (error) {
        console.error("saveDocument error:", error);
        return false;
    }
}

async function getDocument(collectionName, key) {
    try {
        const database = await connectMongo();
        const coll = database.collection(collectionName);
        const doc = await coll.findOne({ key });
        return doc.content; 
    } catch (error) {
        console.error("getDocument error:", error);
        return null;
    }
}

async function getFromMongoByPrefix(collectionName, prefix = '') {
    let results = [];
    try {
        collectionName = (dbEnv === 'prod') ? collectionName : `${collectionName}-${dbEnv}`;
        const database = await connectMongo();
        const coll = database.collection(collectionName);

        const query = { key: { $regex: `^${prefix}` } }; // find keys starting with prefix
        const docs = await coll.find(query).toArray();

         for (const item of docs) {
             if (!item.key) {
                console.warn("Skipping object with empty key");
                continue;
            }

            results.push({ key: item.key, data: item.content });
         }

        return results;
    } catch (error) {
        console.error("Error retrieving from Mongo:", error);
        return [];
    }
}

async function deleteFromMongo(collectionName, key) {
    try {
        collectionName = (dbEnv === 'prod') ? collectionName : `${collectionName}-${dbEnv}`;
        const database = await connectMongo();
        const coll = database.collection(collectionName);

        const result = await coll.deleteOne({ key });

        if (result.deletedCount > 0) {
            console.log(`Deleted key: ${key} successfully!`);
            return true;
        } else {
            console.warn(`Key: ${key} not found.`);
            return false;
        }
    } catch (error) {
        console.error("Error deleting from Mongo:", error);
        return false;
    }
}

async function mongoKeyExists(collectionName, key) {
    try {
        collectionName = (dbEnv === 'prod') ? collectionName : `${collectionName}-${dbEnv}`;
        const database = await connectMongo();
        const coll = database.collection(collectionName);

        const doc = await coll.findOne({ key });
        return !!doc;
    } catch (error) {
        console.error("Error checking key in Mongo:", error);
        throw error;
    }
}

async function findDocuments(collectionName, filter = {}, options = {}) {
    const database = await connectMongo();
    const coll = database.collection(collectionName);
    const { limit = 100, sort = { updatedAt: -1 } } = options;
    return coll.find(filter).sort(sort).limit(limit).toArray();
}

async function closeMongo() {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}

module.exports = {
    connectMongo,
    closeMongo,
    saveDocument,
    getDocument,
    getFromMongoByPrefix,
    deleteFromMongo,
    mongoKeyExists,
    findDocuments,
};

