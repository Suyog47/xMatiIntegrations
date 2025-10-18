// const s3Service = require("../../../utils/s3-service");
// const { Buffer } = require("buffer");
const { saveDocument, getDocument, mongoKeyExists } = require("../../../utils/mongo-db");

async function login(email, password) {
    if (await checkUser(email)) {
        let mongoData = await getDocument("xmati-users", `${email}`);

        if (mongoData.password === password) {
            return mongoData;
        } else {
            return "wrong pass";
        }
    } else {
        return "not exist";
    }
}

async function register(email, data) {
    if (await checkUser(email)) {
        return "already exist";
    } else {
        // If selectedPlan is 'Starter', remove nextSubs key from data 
        // because we don't need to include it for Starter plans
        if (data.nextSubs && data.nextSubs.plan === 'Starter') {
            delete data.nextSubs;
        }

        let stats = await setUser(email, data);
        if (stats) {
            return "success";
        }
        else {
            return "error";
        }
    }
}

async function updateUserPassOrProfile(email, data) {
    if (await checkUser(email)) {
        let stats = await setUser(email, data);
        if (stats) {
            return "success";
        }
        else {
            return "error";
        }
    } else {
        return "not exist";
    }
}

async function checkUser(email) {
    const exists = await mongoKeyExists('xmati-users', `${email}`);
    if (exists) {
        return true;
    } else {
        return false;
    }
}

async function setUser(email, data) {
    try {
        await saveDocument(
            "xmati-users",
            `${email}`,
            `${JSON.stringify(data)}`
        );
        return true;
    }
    catch (err) {
        console.log("Error saving to S3:", err);
        return false;
    }
}

// async function getUser(email) {
//     const s3Content = await getDocument("xmati-users", `${email}.txt`);
//     const data = await streamToString(s3Content);
//     return data;
// }

// Helper function to convert stream to string
// function streamToString(stream) {
//     return new Promise((resolve, reject) => {
//         const chunks = [];
//         stream.on("data", (chunk) => chunks.push(chunk));
//         stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
//         stream.on("error", reject);
//     });
// }

module.exports = { login, register, updateUserPassOrProfile, setUser };