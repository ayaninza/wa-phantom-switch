/// <reference types="node" />

interface MessageKey {
    id: string;
    participant?: string;
    remoteJid?: string;
}

interface PhantomSwitchContent {
    text: string;
    imagePath?: string;
    buffer?: Buffer;
}

interface PhantomSwitchResult {
    status: 'success' | 'error';
    id?: string;
    error?: string;
    timestamp: number;
}

interface FlowButton {
    name: string;
    buttonParamsJson: string;
}

interface FlowData {
    header?: string;
    body?: string;
    footer?: string;
    buffer?: Buffer;
    buttons: FlowButton[];
    displayText?: string;
}

interface SilentFlowResult {
    status: 'success';
    timestamp: number;
}

/**
 * Overwrites an existing WhatsApp message with new content
 */
export function phantomSwitch(
    conn: any,
    jid: string,
    oldMsgKey: MessageKey,
    content: PhantomSwitchContent
): Promise<PhantomSwitchResult>;

/**
 * Sends an interactive message without default WhatsApp UI
 */
export function sendSilentFlow(
    conn: any,
    jid: string,
    flowData: FlowData
): Promise<SilentFlowResult>;
