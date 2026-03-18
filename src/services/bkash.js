const axios = require('axios');
require('dotenv').config();

// bKash API Configuration
const BKASH_CONFIG = {
    sandbox: {
        baseUrl: 'https://checkout.sandbox.bkash.com',
        tokenUrl: 'https://checkout.sandbox.bkash.com/tokenized/checkout/grant'
    },
    production: {
        baseUrl: 'https://checkout.bkash.com',
        tokenUrl: 'https://checkout.bkash.com/tokenized/checkout/grant'
    },
    appKey: process.env.BKASH_APP_KEY,
    appSecret: process.env.BKASH_APP_SECRET,
    username: process.env.BKASH_USERNAME,
    password: process.env.BKASH_PASSWORD
};

// Use sandbox by default, switch to production in production environment
const config = BKASH_CONFIG.sandbox;

// Cache for access token
let accessTokenCache = {
    token: null,
    expiresAt: null
};

/**
 * Get bKash access token using OAuth2 credentials
 * Caches the token and refreshes when expired
 */
async function grantToken() {
    try {
        // Check if we have a valid cached token
        if (accessTokenCache.token && accessTokenCache.expiresAt && new Date() < accessTokenCache.expiresAt) {
            return accessTokenCache.token;
        }

        const response = await axios.post(config.tokenUrl, {
            app_key: BKASH_CONFIG.appKey,
            app_secret: BKASH_CONFIG.appSecret
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'username': BKASH_CONFIG.username,
                'password': BKASH_CONFIG.password
            }
        });

        if (response.data && response.data.id_token) {
            // Cache the token (expires in 1 hour, we'll refresh at 50 minutes)
            accessTokenCache.token = response.data.id_token;
            accessTokenCache.expiresAt = new Date(Date.now() + 50 * 60 * 1000);
            
            console.log('bKash token granted successfully');
            return response.data.id_token;
        } else {
            throw new Error('Invalid token response from bKash');
        }
    } catch (error) {
        console.error('Error getting bKash token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate with bKash');
    }
}

/**
 * Create a payment request
 * @param {number} amount - Payment amount
 * @param {string} invoiceNumber - Unique invoice number
 * @param {string} callbackURL - Callback URL after payment completion
 * @returns {Object} Payment creation response with bkashURL
 */
async function createPayment(amount, invoiceNumber, callbackURL) {
    try {
        const token = await grantToken();
        
        const response = await axios.post(
            `${config.baseUrl}/tokenized/checkout/create`,
            {
                mode: '0011',
                payerReference: ' ',
                callbackURL: callbackURL,
                amount: amount.toString(),
                currency: 'BDT',
                intent: 'sale',
                merchantInvoiceNumber: invoiceNumber
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': token,
                    'X-App-Key': BKASH_CONFIG.appKey
                }
            }
        );

        if (response.data && response.data.bkashURL) {
            console.log('bKash payment created:', response.data.paymentID);
            return response.data;
        } else {
            throw new Error('Invalid payment creation response from bKash');
        }
    } catch (error) {
        console.error('Error creating bKash payment:', error.response?.data || error.message);
        throw new Error('Failed to create bKash payment');
    }
}

/**
 * Execute payment after user completes payment on bKash's page
 * @param {string} paymentID - Payment ID from bKash callback
 * @returns {Object} Payment execution response with transaction details
 */
async function executePayment(paymentID) {
    try {
        const token = await grantToken();
        
        const response = await axios.post(
            `${config.baseUrl}/tokenized/checkout/execute/${paymentID}`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': token,
                    'X-App-Key': BKASH_CONFIG.appKey
                }
            }
        );

        if (response.data && response.data.transactionStatus === 'Completed') {
            console.log('bKash payment executed successfully:', response.data.trxID);
            return response.data;
        } else {
            throw new Error('Payment execution failed or not completed');
        }
    } catch (error) {
        console.error('Error executing bKash payment:', error.response?.data || error.message);
        throw new Error('Failed to execute bKash payment');
    }
}

/**
 * Query payment status
 * @param {string} paymentID - Payment ID to query
 * @returns {Object} Payment status information
 */
async function queryPayment(paymentID) {
    try {
        const token = await grantToken();
        
        const response = await axios.post(
            `${config.baseUrl}/tokenized/checkout/details/${paymentID}`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': token,
                    'X-App-Key': BKASH_CONFIG.appKey
                }
            }
        );

        if (response.data) {
            return response.data;
        } else {
            throw new Error('Invalid payment details response from bKash');
        }
    } catch (error) {
        console.error('Error querying bKash payment:', error.response?.data || error.message);
        throw new Error('Failed to query bKash payment');
    }
}

module.exports = {
    grantToken,
    createPayment,
    executePayment,
    queryPayment
};
