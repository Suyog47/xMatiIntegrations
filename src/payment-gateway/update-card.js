const { updateUserPassOrProfile } = require('../authentication/user-auth/auth');

// eslint-disable-next-line no-undef
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

async function updateCard(email, customerId, paymentMethodId, data) {
     try {
        if (!customerId) {
            return { success: false, msg: 'Failed to create or retrieve customer' };
        }

        if (paymentMethodId == '') {
            return { success: false, msg: 'Invalid payment method id' };
        }

        // Attach the payment method to the customer
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

        // Set the payment method as the default for the customer
        await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        let result = await updateUserPassOrProfile(email, data);

        if (result === "error") {
            console.log("Failed to update user's card details");
            return { success: false, msg: "Failed to update user's card details" };
        }

        return { success: true, msg: 'Stripe customer created and payment method attached successfully' };
    } catch (error) {
        console.error('Error creating Stripe customer:', error.message);
        return { success: false, msg: error.message };
    }
}

module.exports = { updateCard };