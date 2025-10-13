const { getFromMongoByPrefix, getDocument } = require('../../utils/mongo-db');
const { paymentFailedEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');
const { createPaymentIntent, makePayment } = require('../../src/payment-gateway/stripe'); 
const { SaveSubscription } = require('../../src/subscription-services/save-subscription'); 
const { clearNextSubs } = require('../../src/subscription-services/nextsub-clear');

async function autoRenewSubscription() {
    let userKey, parsedUserData;
    try {
        // Retrieve all keys from the 'xmati-subscriber' bucket
        const keys = await getFromMongoByPrefix('xmati-subscriber');

        if (!keys || keys.length === 0) {
            return { status: false, message: 'No subscriptions found' };
        }

        const currentDate = new Date();
        const normalizedCurrentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        for (const key of keys) {
            try {
                const data = key.data;

                // Validate and normalize the 'till' date
                if (!data.till) {
                    console.warn(`Skipping key ${key.key}: Missing 'till' value`);
                    continue;
                }

                const tillDate = new Date(data.till);
                if (isNaN(tillDate)) {
                    console.warn(`Skipping key ${key.key}: Invalid 'till' value`);
                    continue;
                }

                const normalizedTillDate = new Date(tillDate.getFullYear(), tillDate.getMonth(), tillDate.getDate());

                // Skip if subscription is "Cancelled"
                if (data.isCancelled === true) {
                    console.log(`Skipping auto-renewal for key ${key.key}: Subscription is Cancelled.`);
                    continue;
                }

                // Compare expiry (till date) with the current date
                if (normalizedTillDate.getTime() === normalizedCurrentDate.getTime()) {
                    let subscription = data.subscription;
                    let duration = data.duration;
                    let amount = data.amount;

                    // Retrieve user data from 'xmati-users' bucket
                    userKey = key.key;
                    let userData = await getDocument('xmati-users', userKey);

                    if (!userData) {
                        console.error(`User data not found for key ${userKey}`);
                        continue;
                    }

                    parsedUserData = userData;

                    // Check if next subscription details exist
                    if (parsedUserData && parsedUserData.nextSubs) {
                        subscription = parsedUserData.nextSubs.plan
                        duration = parsedUserData.nextSubs.duration;
                        amount = `${parsedUserData.nextSubs.price}`;
                    }

                    // Validate customerId and paymentMethodId
                    const customerId = parsedUserData.stripeCustomerId;
                    const paymentMethodId = parsedUserData.stripePayementId;

                    if (!customerId || !paymentMethodId) {
                        console.error(`Missing customerId or paymentMethodId for key ${userKey}`);
                        continue;
                    }

                    // Extract numeric value from amount (e.g., "$18" -> 18)
                    const numericAmount = parseFloat(amount.replace(/^\$/, ''));
                    if (isNaN(numericAmount)) {
                        console.error(`Invalid amount format for key ${userKey}: ${amount}`);
                        continue;
                    }

                    // Create a payment intent
                    const paymentIntentResponse = await createPaymentIntent(
                        numericAmount * 100, // Convert amount to cents
                        'usd',
                        { id: customerId },
                        paymentMethodId,
                        userKey, // Extract email from key
                        subscription,
                        duration
                    );

                    if (!paymentIntentResponse.success) {
                        console.error(`Failed to create payment intent for key ${userKey}:`, paymentIntentResponse.error);
                        continue;
                    }

                    const clientSecret = paymentIntentResponse.data.id;

                    // Call the makePayment function
                    const paymentResponse = await makePayment(
                        clientSecret,
                        paymentMethodId,
                    );

                    if (!paymentResponse.success) {
                        console.error(`Failed to process payment for key ${key.key}:`, paymentResponse.error);

                        // Send the failed payment email
                        const failedPaymentEmailTemplate = paymentFailedEmail(parsedUserData.fullName, subscription, amount);
                        sendEmail(parsedUserData.email, null, null, failedPaymentEmailTemplate.subject, failedPaymentEmailTemplate.body);
                        continue;
                    }

                    // Call SaveSubscription after successful payment
                    const saveSubscriptionResponse = await SaveSubscription(
                        userKey, // Email
                        parsedUserData.fullName,
                        subscription,
                        duration,
                        0,
                        amount,
                        false // isCancelled flag
                    );

                    if (!saveSubscriptionResponse.status) {
                        console.error(`Failed to save subscription for key ${key.key}:`, saveSubscriptionResponse.msg);
                        continue;
                    }

                    console.log(`Payment and subscription save successful for key ${key.key}`);
                }
            } catch (error) {
                console.error(`Error processing key ${key.key}:`, error.message);
                continue; // Skip this key and move to the next
            }
            finally {
                // Clear nextSubs if it exists
                if (parsedUserData && parsedUserData.nextSubs) {
                    await clearNextSubs(userKey, parsedUserData);
                }
            }
        }

        return { status: true, message: 'Auto-renewal process completed successfully' };
    } catch (error) {
        console.error('Error in auto-sub-renewal:', error);
        return { status: false, message: 'Something went wrong', error: error.message };
    }
}
    
module.exports = autoRenewSubscription;