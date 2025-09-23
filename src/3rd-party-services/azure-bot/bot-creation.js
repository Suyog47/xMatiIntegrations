// "use strict";

// const { Client } = require("@microsoft/microsoft-graph-client");
// // const { ResourceManagementClient } = require("@azure/arm-resources");
// const { AzureBotService, Bot } = require("@azure/arm-botservice");
// const { WebSiteManagementClient } = require("@azure/arm-appservice");
// const axios = require("axios");
// const FormData = require("form-data");
// const { saveToS3, getFromS3 } = require("../../../utils/s3-service");
// require('dotenv').config();

// const azureSubscription = process.env.AZURE_SUBSCRIPTION;

// const subscriptionId = azureSubscription;
// const resourceGroupName = "my-resource-handler";
// let isAppRegistered = false;


// // Registers the App for Bot creation
// async function createAppRegistration(credential, name) {
//     if (isAppRegistered) {
//       return;
//     }
  
//     const authProvider = {
//       getAccessToken: async () => {
//         try {
//           // Get an access token using the credential
//           const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
//           return tokenResponse?.token; // Return the access token
//         } catch (error) {
//           console.error("Error fetching access token:", error);
//           throw new Error("Access token retrieval failed.");
//         }
//       },
//     };
  
//     // Initialize Microsoft Graph Client with the custom auth provider
//     const client = Client.initWithMiddleware({
//       authProvider: authProvider,
//     });
  
//     const app = {
//       displayName: `${name}`, // Name for the app registration
//       signInAudience: "AzureADMultipleOrgs",
//     };
  
//     try {
//       // Create the app registration
//       const response = await client.api('/applications').post(app);
//       isAppRegistered = true;
//       let appId = response.appId;
//       let objectId = response.id;
  
//       const res = await client.api('/organization').get();
//       let tenantId = res.value[0].id;
  
//       const passwordPayload = {
//         displayName: "Default Secret",
//         startDateTime: new Date().toISOString(),
//         endDateTime: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
//       };
  
//       const passwordResponse = await client.api(`/applications/${objectId}/addPassword`).post(passwordPayload);
  
//       let appSecret = passwordResponse.secretText;
  
//       await createAppService(credential, appId, appSecret, tenantId, name);
//     } catch (err) {
//       var errMsg = "Error registering app:" + err;
//       throw new sdk.RuntimeError(errMsg);
//     }
//   }
  
//   // Creates App Service to be used by the Bot
//   async function createAppService(credential, appId, appSecret, tenantId, name) {
//     try {
//       const webClient = new WebSiteManagementClient(credential, subscriptionId);
  
//       var result = await webClient.webApps.beginCreateOrUpdateAndWait(
//         resourceGroupName,
//         `${name}-appservice`,
//         {
//           location: "Canada East",
//           serverFarmId: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Web/serverfarms/ASP-myresourcehandler-87c0`,
//           siteConfig: {
//             linuxFxVersion: "NODE|20-lts", // Runtime Stack
//           },
//         }
//       );
  
//       if (result) {
//         const hostname = result.defaultHostName;
//         let messagingEndpoint = `https://${hostname}/api/messages`;
//         await uploadEnv(credential, appId, appSecret, tenantId, messagingEndpoint, name);
//       }
//     } catch (error) {
//       console.error("Error updating environment variables:", error);
//     }
//   }
  
//   // Uploads Environment Variables to the created App Service
//   async function uploadEnv(credential, appId, appSecret, tenantId, messagingEndpoint, name) {
//     try {
//       const appSettings = {
//         properties: {
//           MicrosoftAppId: appId,
//           MicrosoftAppPassword: appSecret,
//           MicrosoftAppTenantId: tenantId,
//           MicrosoftAppType: "Multi Tenant",
//         },
//       };
  
//       const client = new WebSiteManagementClient(credential, subscriptionId);
  
//       const result = await client.webApps.updateApplicationSettings(resourceGroupName, `${name}-appservice`, appSettings);
//       await createBot(appId, credential, messagingEndpoint, name);
//     } catch (error) {
//       console.error("Error updating environment variables:", error);
//     }
//   }
  
//   // Creates the Bot
//   async function createBot(appId, credential, botEndpoint, name) {
//     try {
//       const botServiceClient = new AzureBotService(credential, subscriptionId);
  
//       const botParams = {
//         location: "global",
//         sku: { name: "F0" }, // Use S1 for production
//         kind: "azurebot",
//         properties: {
//           displayName: `${name}`,
//           msaAppId: appId,
//           description: "A bot created via Botpress Azure SDK",
//           endpoint: botEndpoint,
//         },
//       };
  
//       const result = await botServiceClient.bots.create(resourceGroupName, `${name}`, botParams);
//        await s3Service.saveToS3(
//                   "bot-id-bucket",
//                   `${name}.txt`,
//                   `${name}-${apiUrl}`
//               );
//       deployBot(credential, name);
//     } catch (e) {
//       throw new sdk.RuntimeError(e.toString());
//     }
//   }
  
//   // Deploys bot source code into App Service
//   async function deployBot(credential, name) {
//     try {
//       const webClient = new WebSiteManagementClient(credential, subscriptionId);
  
//       // Get the App Service's Kudu site credentials
//       const publishingCredentials = await webClient.webApps
//         .beginListPublishingCredentials(resourceGroupName, `${name}-appservice`)
//         .then((poller) => poller.pollUntilDone());
  
//       const { publishingUserName, publishingPassword } = publishingCredentials;
  
//       // Kudu Zip Deploy URL
//       const kuduApiUrl = `https://${name}-appservice.scm.azurewebsites.net/api/zipdeploy`;
  
//       // Get the bot .zip file from S3
//       const s3Response = await getFromS3("azurebottemplates", "echo-bot-js.zip");
//       if (!s3Response) {
//         throw new Error("Failed to retrieve the file from S3.");
//       }
  
//       // Deploy using Axios
//       const form = new FormData();
//       form.append("file", s3Response, "bot.zip");
  
//       const response = await axios.post(kuduApiUrl, form, {
//         auth: {
//           username: publishingUserName,
//           password: publishingPassword,
//         },
//         headers: form.getHeaders(),
//       });
  
//       console.log("Deployment succeeded:", response.data);
//     } catch (error) {
//       console.error("Deployment failed:", error);
//     }
//   }

//   module.exports = { createAppRegistration };
  