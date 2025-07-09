"use strict";
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const { Upload } = require('@aws-sdk/lib-storage');
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

const awsAccessKeyId = process.env.AWS_ACCESS_KEY;
const awsSecretAccessKey = process.env.AWS_SECRET_KEY;

// Initialize the S3 client
const s3 = new S3Client({
    region: 'us-east-1',
    requestHandler: new NodeHttpHandler({
        requestTimeout: 300000,  // 5 minutes
        connectionTimeout: 300000  // 5 minutes
    }),
    credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
    },
});

async function saveToS3(bucketName, key, content) {
    try {
        const parallelUpload = new Upload({
            client: s3,
            params: {
                Bucket: bucketName,
                Key: key,
                Body: content,
                ContentType: 'application/json'
            },
            queueSize: 4,          // Concurrent parts
            partSize: 1024 * 1024 * 20, // 20MB chunks
            leavePartsOnError: false
        });
        // const command = new PutObjectCommand({
        //     Bucket: bucketName,
        //     Key: key,
        //     Body: content,
        // });
        // await s3.send(command);

        // Wait for the upload to complete
        await parallelUpload.done();
        return true;
    } catch (error) {
        console.error("Error saving botId to S3:", error);
        return false;
    }
}

async function getFromS3(bucketName, key) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const response = await s3.send(command);
        // Return the stream data
        return response.Body;
    } catch (error) {
        console.error("Error retrieving botId from S3:", error);
        return false;
    }
}

async function getFromS3ByPrefix(bucketName, prefix = '') {
    try {
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
        });

        const listResponse = await s3.send(listCommand);
        const contents = listResponse.Contents || [];

        const results = [];

        for (const item of contents) {
            const key = item.Key;

            if (!key) {
                console.warn("Skipping object with empty key");
                continue;
            }

            const getCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const file = await s3.send(getCommand);
            const body = await streamToString(file.Body);

            results.push({ key, data: body });
        }

        return results;
    } catch (error) {
        console.error("Error retrieving botId from S3:", error);
        return [];
    }
}

async function deleteFromS3(bucketName, key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await s3.send(command);

        console.log(`Deleted key: ${key} successfully!`);
        return true;
    } catch (error) {
        console.error("Error deleting from S3:", error);
        return false;
    }
}

async function keyExists(bucketName, key) {
    try {
        await s3.send(new HeadObjectCommand({
            Bucket: bucketName,
            Key: key
        }));
        return true;
    } catch (error) {
        if (error.name === 'NotFound') {
            return false;
        }
        throw error; // Re-throw unexpected errors
    }
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


module.exports = {
    saveToS3,
    getFromS3,
    getFromS3ByPrefix,
    deleteFromS3,
    keyExists
};
