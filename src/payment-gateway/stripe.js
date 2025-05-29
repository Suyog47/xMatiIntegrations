require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createPaymentIntent(amount, currency) {
    try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: currency,
          payment_method_types: ['card', 'link'],
          // automatic_payment_methods: {
          //   enabled: true, // Let Stripe handle payment method selection
          // }, 
        });
    
        return paymentIntent.client_secret;
      } catch (error) {
        console.log(error.message);
        return false;
      }
}

module.exports = { createPaymentIntent }

