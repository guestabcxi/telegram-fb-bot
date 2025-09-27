const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables - ADD YOUR CREDENTIALS HERE
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8409260682:AAG5g5Tyi1U_F6X3VfeO7uxkgXj1Jwohh7E';
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '-1002526772779';
const FACEBOOK_PAGE_TOKEN = process.env.FACEBOOK_PAGE_TOKEN || 'EAAYH1xIohjcBPnlLIIHbdq8Cg5pyeKzcoFZAiZBjXjJm26IhjoZBRpYrOK80hWtumvs9B47hZCnODmo2Xz4MZBLqnjZC7rAOjA09Bx2peLCy8FTAeWnAZBi6YOkxpg5AZCV3cLZCBtLQjJFjVP8ZBG4pZB4OhbNXxTlJCWlTJej56dfKv20q0ZANX0A38JVb4cpD8mZCWfAZDZD';
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID || '798540176679223';

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Goodealzz Bot is running! 🚀');
});

// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log('Received update:', JSON.stringify(update, null, 2));
        
        // Check if it's a channel post from your channel
        if (update.channel_post && 
            update.channel_post.chat.id.toString() === TELEGRAM_CHANNEL_ID) {
            
            const message = update.channel_post;
            console.log('Processing message from channel:', message.chat.title);
            
            // Extract message content
            let postContent = '';
            let imageUrl = null;
            
            // Handle text messages
            if (message.text) {
                postContent = message.text;
            }
            
            // Handle messages with captions (like photos with text)
            if (message.caption) {
                postContent = message.caption;
            }
            
            // Handle photos
            if (message.photo && message.photo.length > 0) {
                try {
                    const photo = message.photo[message.photo.length - 1];
                    const fileResponse = await axios.get(
                        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${photo.file_id}`
                    );
                    
                    if (fileResponse.data.ok) {
                        imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileResponse.data.result.file_path}`;
                    }
                } catch (photoError) {
                    console.error('Error getting photo:', photoError.message);
                }
            }
            
            // Only proceed if we have content to post
            if (postContent || imageUrl) {
                await postToFacebook(postContent, imageUrl);
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook error:', error.message);
        res.status(500).send('Error processing webhook');
    }
});

// Function to post to Facebook
async function postToFacebook(message, imageUrl = null) {
    try {
        console.log('Posting to Facebook:', { message: message?.substring(0, 50), hasImage: !!imageUrl });
        
        if (imageUrl) {
            // Post with image
            const photoApiUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/photos`;
            const photoData = {
                url: imageUrl,
                caption: message || '',
                access_token: FACEBOOK_PAGE_TOKEN
            };
            
            const response = await axios.post(photoApiUrl, photoData);
            console.log('✅ Posted to Facebook with image:', response.data.id);
        } else if (message) {
            // Text-only post
            const facebookApiUrl = `https://graph.facebook.com/v18.0/${FACEBOOK_PAGE_ID}/feed`;
            const postData = {
                message: message,
                access_token: FACEBOOK_PAGE_TOKEN
            };
            
            const response = await axios.post(facebookApiUrl, postData);
            console.log('✅ Posted to Facebook:', response.data.id);
        }
        
    } catch (error) {
        console.error('❌ Facebook posting error:', error.response?.data || error.message);
        
        // Log specific error details
        if (error.response?.data?.error) {
            console.error('Facebook API Error:', error.response.data.error);
        }
    }
}

// Function to set webhook
async function setWebhook() {
    try {
        const webhookUrl = `https://${process.env.HEROKU_APP_NAME || 'your-app-name'}.herokuapp.com/webhook`;
        console.log('Setting webhook to:', webhookUrl);
        
        const response = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
            {
                url: webhookUrl
            }
        );
        
        console.log('✅ Webhook set successfully:', response.data);
    } catch (error) {
        console.error('❌ Webhook setup error:', error.response?.data || error.message);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Bot server running on port ${PORT}`);
    
    // Set webhook after server starts (only in production)
    if (process.env.NODE_ENV === 'production' || process.env.HEROKU_APP_NAME) {
        setTimeout(setWebhook, 5000); // Wait 5 seconds for server to be ready
    }
});

module.exports = app;
