require('dotenv').config();

// eslint-disable-next-line no-undef
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount, currency, customerId, paymentMethodId, email, subscription, duration) {

    const customer = (customerId && Object.keys(customerId).length > 0)
        ? customerId
        : await getOrCreateCustomerByEmail(email);

    let response = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customer.id,
        payment_method: paymentMethodId,
        metadata: {
            email,
            subscription,
            duration
        },
        automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never', // Disable redirect-based payment methods
        },
        expand: ['charges'],
    })

    if (!response) {
        return { success: false };
    }
    else {
        // Get card details
        const cardDetailsResponse = await getCardDetails(paymentMethodId);
        return { success: true, data: response, card: cardDetailsResponse };
    }
}

async function getOrCreateCustomerByEmail(email) {
    try {

        const existingCustomers = await stripe.customers.list({
            email,
            limit: 1
        })

        if (existingCustomers.data.length > 0) {
            return existingCustomers.data[0]  // Reuse existing customer
        }

        // Create new one if not found
        return await stripe.customers.create({
            email,
            metadata: { guest: 'true' }
        })
    }
    catch (err) {
        console.log(err);
        return false;
    }
}

async function makePayment(paymentIntentId, paymentMethodId) {
    try {
        const response = await stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: paymentMethodId,
        });

        if (response.error) {
            return { success: false, error: response.error.message };
        }

        // Check if the payment was successful
        if (response.status === 'succeeded') {
            return {
                success: true,
                paymentIntent: {
                    id: response.id,
                    amount: response.amount / 100,
                    currency: response.currency,
                    customer: response.customer,
                    paymentMethod: response.payment_method,
                    status: response.status,
                    latestCharge: response.latest_charge,
                },
            };
        } else {
            return {
                success: false,
                error: `Payment failed with status: ${response.status}`,
            };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getStripeTransaction(email){
   try {
        const customers = await stripe.customers.list({ email, limit: 1 })
        if (!customers.data.length) {
            return { status: false, error: 'Customer not found' }
        }

        const customerId = customers.data[0].id

        // Get latest 100 charges
        const charges = await stripe.charges.list({
            customer: customerId,
            limit: 100,
            expand: ['data.refunds'],
        })

        return { status: true, charges: charges.data }
    } catch (err) {
        console.error(err)
        return { status: false, error: 'Failed to retrieve transactions' }
    }
}

async function refundCharge(chargeId, reason, amount) {
    try {
          const numericAmount = parseFloat(amount.replace(/^\$/, ''));
          // refund the amount
          if (numericAmount > 0.00) {
              await stripe.refunds.create({
                  charge: chargeId,
                  amount: Math.round(numericAmount * 100), // Stripe expects the amount in cents
                  reason: reason === '-' ? 'requested_by_customer' : reason,
              });
          }

          return true;
      } catch (e) {
          console.error('Refund error:', e.message);
          return false;
      }
}

async function getCardDetails(paymentMethodId) {
    try {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        if (!paymentMethod || paymentMethod.type !== 'card') {
            return { success: false, message: 'Invalid or non-card payment method' };
        }

        const cardDetails = {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
            funding: paymentMethod.card.funding,  // This can be 'credit', 'debit', etc.
        };

        return { success: true, cardDetails };
    } catch (error) {
        console.error('Error retrieving card details:', error.message);
        return { success: false, message: error.message };
    }
}

module.exports = { createPaymentIntent, getOrCreateCustomerByEmail, makePayment, getStripeTransaction, refundCharge, getCardDetails }

