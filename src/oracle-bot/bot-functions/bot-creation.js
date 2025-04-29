const oda = require("oci-oda");
const common = require("oci-common");
const createChannel = require("./channel-creation");

const provider = new common.ConfigFileAuthenticationDetailsProvider(
  "./.oci/config",
  "DEFAULT"
);

// Creates Oracle Digital Assistant Instance
async function createODAInstance(botName) {
  try {
    const client = new oda.OdaClient({ authenticationDetailsProvider: provider });

    const createOdaInstanceDetails = {
      displayName: botName,
      description: "A Digital Assistant Instance",
      compartmentId:
        "ocid1.tenancy.oc1..aaaaaaaae7lkrax3pq5wmhjahxh3wmdyycpnebgbtpkqmbnlb7zvlsdoe3ja",
      shapeName: oda.models.CreateOdaInstanceDetails.ShapeName.Development,
    };

    const createOdaInstanceRequest = {
      createOdaInstanceDetails,
      opcRequestId: "LRXO6FTIM5K3REK6AFYN<unique_ID>",
      opcRetryToken: "EXAMPLE-opcRetryToken-Value",
    };

    await client.createOdaInstance(createOdaInstanceRequest);
  } catch (error) {
    console.log("createOdaInstance Failed with error:", error);
  }
}

// Creates Digital Assistant
async function createDigitalAssistant(botName) {
  try {
    const client = new oda.ManagementClient({
      authenticationDetailsProvider: provider,
    });

    const createDigitalAssistantDetails = {
      kind: "NEW",
      displayName: botName,
      name: botName,
      description: "A Digital Assistant",
      version: "1.0",
    };

    const createDigitalAssistantRequest = {
      odaInstanceId:
        "ocid1.odainstance.oc1.ap-mumbai-1.amaaaaaaf56a2vqax722uutclf3e32zccwapqgwj5viml7du2nwyiwokgf6q",
      createDigitalAssistantDetails,
    };

    await client.createDigitalAssistant(createDigitalAssistantRequest);
  } catch (error) {
    console.log("createDigitalAssistant Failed with error:", error);
  }
}

// Imports Digital Assistant from Oracle Storage
async function importDigitalAssistant(objectName) {
  try {
    const client = new oda.ManagementClient({
      authenticationDetailsProvider: provider,
    });

    const importBotDetails = {
      source: {
        regionId: "ap-mumbai-1",
        compartmentId:
          "ocid1.tenancy.oc1..aaaaaaaae7lkrax3pq5wmhjahxh3wmdyycpnebgbtpkqmbnlb7zvlsdoe3ja",
        namespaceName: "bmmeagi53psc",
        bucketName: "bot_templates",
        objectName,
      },
    };

    const importBotRequest = {
      odaInstanceId:
        "ocid1.odainstance.oc1.ap-mumbai-1.amaaaaaaf56a2vqax722uutclf3e32zccwapqgwj5viml7du2nwyiwokgf6q",
      importBotDetails,
    };

    await client.importBot(importBotRequest);
  } catch (error) {
    console.log("importBot Failed with error:", error);
  }
}

// Clones an existing Digital Assistant template
async function cloningDigitalAssistant(botName) {
  try {
    const client = new oda.ManagementClient({
      authenticationDetailsProvider: provider,
    });

    const createDigitalAssistantDetails = {
      kind: "CLONE",
      id: "8F280BBF-A468-453A-B386-A36CC42ECC77",
      displayName: botName,
      name: botName,
      description: "A Digital Assistant",
      version: "1.0",
    };

    const createDigitalAssistantRequest = {
      odaInstanceId:
        "ocid1.odainstance.oc1.ap-mumbai-1.amaaaaaaf56a2vqax722uutclf3e32zccwapqgwj5viml7du2nwyiwokgf6q",
      createDigitalAssistantDetails,
    };

    await client.createDigitalAssistant(createDigitalAssistantRequest);
    await getDigitalAssistantID(botName);
  } catch (error) {
    throw new sdk.RuntimeError(`Error creating bot: ${error}`);
  }
}

// Gets the Metadata of a Digital Assistant
async function getDigitalAssistantID(botName) {
  try {
    const client = new oda.ManagementClient({
      authenticationDetailsProvider: provider,
    });

    const listDigitalAssistantsRequest = {
      odaInstanceId:
        "ocid1.odainstance.oc1.ap-mumbai-1.amaaaaaaf56a2vqax722uutclf3e32zccwapqgwj5viml7du2nwyiwokgf6q",
      name: botName,
      opcRequestId: "KEBKBN1RPZTRW1WN44TV<unique_ID>",
    };

    const listDigitalAssistantsResponse = await client.listDigitalAssistants(
      listDigitalAssistantsRequest
    );
    const botId =
      listDigitalAssistantsResponse.digitalAssistantCollection.items[0].id;

    createChannel(`${botName}Channel`, botId);
  } catch (error) {
    console.log("listDigitalAssistants Failed with error:", error);
  }
}

module.exports = {
  createODAInstance,
  createDigitalAssistant,
  importDigitalAssistant,
  cloningDigitalAssistant,
  getDigitalAssistantID,
};
