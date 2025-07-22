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
                    <li>${planName === 'Trial' ? '3' : (planName === 'Starter') ? '3' : '5'} bots creation</li>
                    <li>AI-powered chatbots</li>
                    <li>Real-time analytics</li>
                    <li>Readymade Bot templates</li>
                    <li>Customizable workflows</li>
                    <li>LLM-powered bot creations</li>
                    ${otherFeatures.map(feature => `<li>${feature}</li>`).join('')}
                </ul>

                <p><strong>📅 Billing Cycle:</strong> ${billingCycle === '15d' ? '15 Days' : billingCycle === '3d' ? '3 Days' : billingCycle} | <strong>Next charge:</strong> ${nextChargeDate}</p>

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

                <p>Your <strong>${planName}</strong> subscription plan has been successfully renewed for <strong>${billingCycle === '15d' ? '15 Days' : billingCycle} billing cycle</strong>.</p>

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
                    <li>Retry payment manually: <a href="https://www.app.xmati.ai">Pay Now</a></li>
                </ul>

                <p>Need assistance? Reply to this email.</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function renewalReminderEmail(fullName, planName, renewalDate, amount, isCancelled) {
    const subscriptionMessage = isCancelled === true
        ? `Your ${planName} plan will end on <strong>${renewalDate}</strong>. To continue enjoying xMati services, please subscribe to a paid plan before expiry.`
        : `Your <strong>${planName}</strong> subscription will auto-renew on <strong>${renewalDate}</strong>.`;

    return {
        subject: `Friendly Reminder: Your xMati Plan ${isCancelled === true ? 'Expires' : 'Renews'} Soon 🔄`,
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName || 'User'},</p>

                <p>${subscriptionMessage}</p>
                ${isCancelled === true ? `<p></p>` : `<p><strong>📌 Amount:</strong> ${amount}</p>`}

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

function afterOneWeekExpiryEmail(fullName) {
    return {
        subject: "Your xMati Bot Awaits – Ready When You Are 🤖",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>We hope you’ve been well! This is just a quick note to let you know that your xMati account and bots are still here—fully intact and ready to pick up where you left off.</p>

                <p>While we respect your decision to pause, we’d love to have you back whenever you’re ready. Your account and bot information remain saved, so reactivating is seamless.</p>

                <p>Need it live again? Just log in and resume your subscription, no setup needed.</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function passwordChangeConfirmationEmail(fullName) {
    return {
        subject: "Password Updated – Secure Your xMati Account",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>Your xMati password was successfully changed. If this wasn’t you, act now: contact our support for help or reset your password.</p>

                <p><strong>Pro Tip:</strong> Use a unique, strong password (e.g., "PurpleMango@42!") and never share it.</p>

                <p>Stay secure,</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function profileUpdateConfirmationEmail(fullName) {
    return {
        subject: "Your xMati Profile Is Updated",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>We’ve updated your profile details as requested.</p>

                <p>Thanks for keeping your info current!</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function paymentMethodUpdateConfirmationEmail(fullName) {
    return {
        subject: "Your Payment Method Is Securely Updated",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>Your xMati billing details are now up to date!</p>

                <p>Cheers,</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function botCreationSuccessEmail(fullName, businessName, botName) {
    return {
        subject: `Your AI Bot Is Ready to Supercharge ${businessName}!`,
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${fullName},</p>

                <p>Say hello to your new 24/7 team member! Your AI bot, <strong>${botName}</strong>, is live and ready to:</p>
                <ul>
                    <li>✅ Engage visitors instantly – No more missed leads after hours</li>
                    <li>✅ Capture & qualify leads </li>
                    <li>✅ Handle FAQs – Free your team to focus on high-value tasks</li>
                </ul>

                <p><strong>Next Steps:</strong></p>
                <ol>
                    <li>Customize your bot’s personality to match your brand</li>
                    <li>Track performance with real-time analytics</li>
                </ol>

                <p>Need help? Contact our support—we’re happy to guide you!</p>

                <p>Welcome to the future of customer engagement,</p>
                <p>The xMati Team</p>
                <p>[MIST Global LLC]</p>
            </body>
        </html>
        `
    };
}

function botDeletionConfirmationEmail(firstName, botName) {
    return {
        subject: "We’ve Deleted Your Bot",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${firstName},</p>

                <p>Your bot, <strong>${botName}</strong>, has been successfully deleted.</p>

                <p>If this was a mistake, please contact support to restore your bot.</p>

                <p>Best,</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function botNameUpdateEmail(firstName, previousBotName, updatedBotName) {
    return {
        subject: "Your Bot Just Got a New Name!",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${firstName},</p>

                <p>Meet your rebranded AI assistant!</p>
                <ul>
                    <li>🔹 Old Name: <strong>${previousBotName}</strong></li>
                    <li>🔹 New Name: <strong>${updatedBotName}</strong></li>
                </ul>

                <p><strong>Why this matters:</strong> A clear, catchy name helps customers remember (and trust!) your bot.</p>

                <p>Happy automating,</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

function forgotPasswordOtpEmail(email, otpCode) {
    return {
        subject: "Reset Your Password – OTP Inside 🔒",
        body: `
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p>Hi ${email},</p>

                <p>We received a request to reset your xMati account password. Use the OTP below to proceed:</p>

                <p><strong>🔑 Your OTP:</strong> <span style="font-size: 18px; font-weight: bold;">${otpCode}</span></p>

                <p><strong>⚠️ Important:</strong> If you didn’t request a password reset, please ignore this email or contact our support team immediately.</p>

                <p>Stay secure,</p>
                <p>The xMati Team</p>
            </body>
        </html>
        `
    };
}

module.exports = {
    welcomeSubscription,
    paymentReceiptEmail,
    paymentFailedEmail,
    renewalReminderEmail,
    afterOneWeekExpiryEmail,
    passwordChangeConfirmationEmail,
    profileUpdateConfirmationEmail,
    paymentMethodUpdateConfirmationEmail,
    botCreationSuccessEmail,
    botDeletionConfirmationEmail,
    botNameUpdateEmail,
    forgotPasswordOtpEmail
};