const s3Service = require("../../../utils/s3-service");
const { Buffer } = require("buffer");


async function login(email, password) {
    if (await checkUser(email)) {
        let s3Data = await getUser(email);
        s3Data = JSON.parse(s3Data)

        if (s3Data.password === password) {
            return s3Data;
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
    const exists = await s3Service.keyExists('xmati-users', `${email}.txt`);
    if (exists) {
        return true;
    } else {
        return false;
    }
}

async function setUser(email, data) {
    try {
        await s3Service.saveToS3(
            "xmati-users",
            `${email}.txt`,
            `${JSON.stringify(data)}`
        );
        return true;
    }
    catch (err) {
        console.log("Error saving to S3:", err);
        return false;
    }
}

async function getUser(email) {
    const s3Content = await s3Service.getFromS3("xmati-users", `${email}.txt`);
    const data = await streamToString(s3Content);
    return data;
}

// Helper function to convert stream to string
function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        stream.on("error", reject);
    });
}

module.exports = { login, register, updateUserPassOrProfile, setUser };