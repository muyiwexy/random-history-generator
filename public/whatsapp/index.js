const accountSid = 'AC74992e1923d40ae3401216f65455be8a';
const authToken = '53ea35d9d91ffa5fbf5e35f8b5b898b2';

const client = require('twilio')(accountSid, authToken, {
    lazyloading: true
});

async function sendmessage(message, senderID) {
    try {
        await client.messages
            .create({
                body: message,
                from: 'whatsapp:+14155238886',
                to: senderID
            })
            .then(message => console.log(message.sid))
            .done();
    } catch (error) {
        console.log(error);
    }
};
module.exports = {
    sendmessage
}