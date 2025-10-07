const { getDocument } = require('../../utils/mongo-db');
const { clearNextSubs } = require('./nextsub-clear');
const { subscriptionCancellationEmail } = require('../../templates/email_template');
const { sendEmail } = require('../../utils/send-email');
const { saveSubscriptionToS3 } = require('./save-subscription');

// eslint-disable-next-line no-undef
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function cancelSubscription(chargeId, reason, email, fullName, subscription, amount, refundDetails) {
    try{
      
         if (!refundDetails.status) {
            console.log('Refund calculation error:', refundDetails.message);
            return false;
        }

        // refund the amount
        if (refundDetails.refundAmount > 0.00) {
            await stripe.refunds.create({
                charge: chargeId,
                amount: Math.round(refundDetails.refundAmount * 100), // Stripe expects the amount in cents
                reason: reason || 'requested_by_customer',
            });
        }

        let response = await saveSubscriptionToS3(email, fullName, subscription, 'custom', refundDetails.daysRemainingInCycle, amount, true);
        if (!response.status) {
            console.log('Failed to save subscription data:', response.msg);
            return false;
        }

        const currentDate = new Date();
        const newDate = new Date(new Date().setDate(currentDate.getDate() + refundDetails.daysRemainingInCycle));

        let normalizedCurrentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        let normalizedNewDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());


        // Get data from "xmati-users" bucket
        let userData = await getDocument("xmati-users", `${email}`);

        // Clear nextSub details (if exists)
        await clearNextSubs(email, userData);

        // Send a cancellation email
        const cancelEmail = subscriptionCancellationEmail(fullName, subscription, normalizedCurrentDate, normalizedNewDate, refundDetails.daysRemainingInCycle, refundDetails.refundAmount);
        sendEmail(email, null, null, cancelEmail.subject, cancelEmail.body);

        return true;
    }
    catch(error){
        console.error("Error in cancelSubscription:", error);
        return false;
    }
}

module.exports = { cancelSubscription };