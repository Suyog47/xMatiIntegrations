function welcomeSubscription(fullName, planName, billingCycle, nextChargeDate, otherFeatures = []) {
    return {
        subject: "Welcome to xMati! Here’s What You’ve Unlocked 🎉",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>Thank you for choosing xMati! You’re now part of a smarter way to engage customers and grow your business. Here’s what’s included in your <strong>${planName}</strong> Subscription:</p>

                <p><strong>✨ Key Features:</strong></p>
                <ul>
                    <li>${planName === 'trial' ? '3' : (planName === 'Starter') ? '3' : '5'} bots creation</li>
                    <li>AI-powered chatbots</li>
                    <li>Real-time analytics</li>
                    <li>Readymade Bot templates</li>
                    <li>Customizable workflows</li>
                    <li>LLM-powered bot creations</li>
                    ${otherFeatures.map(feature => `<li>${feature}</li>`).join('')}
                </ul>

                <p><strong>📅 Billing Cycle:</strong> ${billingCycle} | <strong>Next charge:</strong> ${nextChargeDate}</p>

                <p><strong>🚀 Get Started Now:</strong></p>
                <ul>
                    <li>Integrate xMati with your website</li>
                    <li>Explore analytics</li>
                </ul>

                <p>Need help? Reply to this email.</p>

                <p>Welcome aboard!</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function paymentReceiptEmail(fullName, planName, billingCycle, amount, nextBillingDate) {
    return {
        subject: "Your xMati Payment Receipt – Thank You! ✅",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>Your <strong>${planName}</strong> subscription plan has been successfully renewed for <strong>${billingCycle} billing cycle</strong>.</p>

                <p><strong>📄 Invoice Summary:</strong></p>
                <ul>
                    <li><strong>Plan:</strong> ${planName}</li>
                    <li><strong>Amount:</strong> ${amount}</li>
                    <li><strong>Next Billing Date:</strong> ${nextBillingDate}</li>
                </ul>

                <p><strong>🔒 Manage Subscription:</strong> <a href="https://www.app.xmati.ai">Update payment method or plan</a></p>

                <p>Thank you for trusting xMati!</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function paymentFailedEmail(fullName, planName, amount) {
    return {
        subject: "Action Needed: Payment Failed for Your xMati Plan ❌",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>We couldn’t process your payment for the <strong>${planName}</strong> subscription of amount <strong>${amount}</strong>.</p>

                <p><strong>🚨 Next Steps:</strong></p>
                <ul>
                    <li>Update Payment Method Now</li> Or
                    <li>Retry payment manually: <a href="https://www.app.xmati.ai">Pay Now</a></li>
                </ul>

                <p>Need assistance? Reply to this email.</p>

                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function renewalReminderEmail(fullName, planName, renewalDate, amount) {
    return {
        subject: "Friendly Reminder: Your xMati Plan Renews Soon 🔄",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>Your <strong>${planName}</strong> subscription will auto-renew on <strong>${renewalDate}</strong>.</p>
                <p><strong>📌 Amount:</strong> ${amount}</p>

                <p><strong>Need to make changes?</strong></p>
                <ul>
                    <li><a href="https://www.app.xmati.ai">Switch plans</a></li>
                </ul>

                <p>Questions? We’re here to help!</p>

                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

module.exports = { welcomeSubscription, paymentReceiptEmail, paymentFailedEmail, renewalReminderEmail };