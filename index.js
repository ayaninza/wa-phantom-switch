const { generateWAMessageFromContent } = require('elaina-bail');
const fs = require('fs');

/**
 * Validates JID format for WhatsApp
 * @private
 */
function isValidJid(jid) {
    return typeof jid === 'string' && /^[\d-]+@(s\.whatsapp\.net|g\.us)$/.test(jid);
}

/**
 * PhantomSwitch Engine by ayaninza
 * Overwrites an existing message with new content using live location message trick
 * 
 * @param {Object} conn - elaina-baileys connection instance
 * @param {string} jid - Target chat JID (e.g., '1234567890@s.whatsapp.net')
 * @param {Object} oldMsgKey - Original message key object
 * @param {string} oldMsgKey.id - Message ID to overwrite
 * @param {string} [oldMsgKey.participant] - Participant JID (for groups)
 * @param {string} [oldMsgKey.remoteJid] - Remote JID
 * @param {Object} content - New message content
 * @param {string} content.text - Text content to display
 * @param {string} [content.imagePath] - Path to image file
 * @param {Buffer} [content.buffer] - Image buffer (alternative to imagePath)
 * @returns {Promise<Object>} Result object {status: 'success'|'error', id?: string, error?: string}
 * 
 * @example
 * const result = await phantomSwitch(conn, jid, 
 *   { id: 'BAE5...', remoteJid: jid },
 *   { text: 'Updated message!', imagePath: './image.jpg' }
 * );
 */
async function phantomSwitch(conn, jid, oldMsgKey, content) {
    try {
        // Input validation
        if (!conn || !conn.user) {
            throw new Error('Invalid connection instance - ensure elaina-bail is properly initialized');
        }
        if (!isValidJid(jid)) {
            throw new Error(`Invalid JID format: ${jid}`);
        }
        if (!oldMsgKey || !oldMsgKey.id) {
            throw new Error('Invalid message key - id is required');
        }
        if (!content || (!content.text && content.text !== '')) {
            throw new Error('Content text is required');
        }

        const { text, imagePath, buffer } = content;
        
        // Handle image buffer
        let imageBuffer;
        if (imagePath) {
            if (typeof imagePath !== 'string') {
                throw new Error('imagePath must be a string');
            }
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }
            imageBuffer = fs.readFileSync(imagePath);
        } else if (buffer) {
            if (!Buffer.isBuffer(buffer)) {
                throw new Error('buffer must be a Buffer instance');
            }
            imageBuffer = buffer;
        } else {
            throw new Error('Either imagePath or buffer must be provided');
        }

        // Validate buffer size (WhatsApp limits)
        if (imageBuffer.length > 5 * 1024 * 1024) { // 5MB limit
            console.warn('Warning: Image buffer exceeds 5MB, may fail to send');
        }

        const msg = generateWAMessageFromContent(jid, {
            liveLocationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                caption: text + "\n" + String.fromCharCode(8206).repeat(200), // Zero-width padding
                sequenceNumber: Math.floor(Date.now() / 1000),
                jpegThumbnail: imageBuffer,
                contextInfo: {
                    stanzaId: oldMsgKey.id,
                    participant: oldMsgKey.participant || oldMsgKey.remoteJid,
                    remoteJid: jid,
                    isForwarded: false
                }
            }
        }, { userJid: conn.user.id });

        // The Magic Overwrite
        await conn.relayMessage(jid, msg.message, { messageId: oldMsgKey.id });
        
        return { 
            status: 'success', 
            id: oldMsgKey.id,
            timestamp: Date.now()
        };
    } catch (e) {
        console.error("PhantomSwitch Error:", e.message || e);
        return { 
            status: 'error', 
            error: e.message || String(e),
            timestamp: Date.now()
        };
    }
}

/**
 * SilentFlow: Creates interactive messages without grey button UI
 * Uses viewOnce message wrapper to hide default WhatsApp UI elements
 * 
 * @param {Object} conn - elaina-baileys connection instance
 * @param {string} jid - Target chat JID
 * @param {Object} flowData - Flow configuration
 * @param {string} [flowData.header] - Header title
 * @param {string} [flowData.body] - Body text
 * @param {string} [flowData.footer] - Footer text
 * @param {Buffer} [flowData.buffer] - Header image buffer
 * @param {Array} flowData.buttons - Array of button objects
 * @param {string} [flowData.displayText] - Display text for params (default: "View")
 * @returns {Promise<Object>} Result object
 * 
 * @example
 * await sendSilentFlow(conn, jid, {
 *   header: 'Welcome',
 *   body: 'Choose an option',
 *   footer: 'Powered by PhantomSwitch',
 *   buttons: [
 *     { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: 'Option 1', id: 'opt1' }) }
 *   ],
 *   buffer: imageBuffer
 * });
 */
async function sendSilentFlow(conn, jid, flowData) {
    try {
        if (!conn || !conn.user) {
            throw new Error('Invalid connection instance - ensure elaina-bail is properly initialized');
        }
        if (!isValidJid(jid)) {
            throw new Error(`Invalid JID format: ${jid}`);
        }
        if (!flowData || !flowData.buttons || !Array.isArray(flowData.buttons)) {
            throw new Error('Flow data with buttons array is required');
        }
        if (flowData.buttons.length === 0) {
            throw new Error('At least one button is required');
        }

        const msg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        header: { 
                            title: flowData.header || '', 
                            hasMediaAttachment: !!flowData.buffer, 
                            jpegThumbnail: flowData.buffer 
                        },
                        body: { text: flowData.body || '' },
                        footer: { text: flowData.footer || '' },
                        nativeFlowMessage: {
                            buttons: flowData.buttons,
                            messageParamsJson: JSON.stringify({ 
                                display_text: flowData.displayText || "View" 
                            })
                        }
                    }
                }
            }
        }, {});
        
        await conn.relayMessage(jid, msg.message, { participant: { jid } });
        
        return {
            status: 'success',
            timestamp: Date.now()
        };
    } catch (e) {
        console.error("SilentFlow Error:", e.message || e);
        throw new Error(`SilentFlow failed: ${e.message || e}`);
    }
}

module.exports = { 
    phantomSwitch, 
    sendSilentFlow 
};
