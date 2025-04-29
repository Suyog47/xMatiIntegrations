const oda = require("oci-oda");
const common = require("oci-common");

const provider = new common.ConfigFileAuthenticationDetailsProvider(
  "./.oci/config",
  "DEFAULT"
);

async function createChannel(channelName, botId) {
  try {
    // Create a service client
    const client = new oda.ManagementClient({
      authenticationDetailsProvider: provider,
    });

    // Create a request and dependent object(s)
    const createChannelDetails = {
      name: channelName,
      type: "WEBHOOK",
      outboundUrl: "https://dummy.com",
      payloadVersion: "1.1",
      botId: botId,
    };

    const createChannelRequest = {
      odaInstanceId:
        "ocid1.odainstance.oc1.ap-mumbai-1.amaaaaaaf56a2vqax722uutclf3e32zccwapqgwj5viml7du2nwyiwokgf6q",
      createChannelDetails: createChannelDetails,
    };

    // Send request to the Client
    const createChannelResponse = await client.createChannel(
      createChannelRequest
    );
    const channelId = createChannelResponse.createChannelResult.id;

    await startChannel(channelId);
  } catch (error) {
    console.log("createChannel Failed with error:", error);
  }
}

async function startChannel(channelId) {
  try {
    // Create a service client
    const client = new oda.ManagementClient({
      authenticationDetailsProvider: provider,
    });

    // Create a request and dependent object(s)
    const startChannelRequest = {
      odaInstanceId:
        "ocid1.odainstance.oc1.ap-mumbai-1.amaaaaaaf56a2vqax722uutclf3e32zccwapqgwj5viml7du2nwyiwokgf6q",
      channelId: channelId,
    };

    // Send request to the Client
    await client.startChannel(startChannelRequest);
  } catch (error) {
    console.log("startChannel Failed with error:", error);
  }
}

module.exports = {
  createChannel,
  startChannel,
};
