import Imap, { ImapMessage, ImapFetch } from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { parseStringPromise } from 'xml2js';

const imapConfig: Imap.Config = {
    user: 'assistancefrankleo@gmail.com',
    password: 'yxpbmmeywsvhfqoc',
    host: 'imap.gmail.com',
    port: 993,
    tls: true
};

let imap: Imap;

function connectImap() {
    imap = new Imap(imapConfig);

    imap.once('ready', () => {
        openInbox();
    });

    imap.once('close', (hadError) => {
        console.warn('Reconnecting...');
        setTimeout(connectImap, 5000);
    });

    imap.once('error', (err) => {
        console.error('Error');
        setTimeout(connectImap, 5000);
    });

    imap.connect();
}

function openInbox() {
    imap.openBox('INBOX', false, (err, box) => {
        if (err) throw err;
        console.log('Waiting for new emails...');

        imap.on('mail', () => {
            fetchNewMessages(box);
        });
    });
}

function fetchNewMessages(box: Imap.Box) {
    imap.search(['UNSEEN'], (err, results) => {
        if (err) {
            console.error('Error fetching emails:', err);
            return;
        }
        if (!results || !results.length) return;

        const f: ImapFetch = imap.fetch(results, { bodies: '', struct: true });

        f.on('message', (msg: ImapMessage) => processMessage(msg));
        f.once('error', (err) => console.error('Error fetch:', err));
    });
}

function processMessage(msg: ImapMessage) {
    msg.on('body', (stream) => {
        simpleParser(stream as any, async (err, parsed: ParsedMail) => {
            if (err) {
                console.error('Error parsing email:', err);
                return;
            }
            if (parsed?.subject?.includes('AVISO DE LLEGADA')) {
                if (parsed.attachments && parsed.attachments.length > 0) {
                    for (const attachment of parsed.attachments) {
                        if (attachment.filename && attachment.filename.endsWith('.xml')) {
                            try {
                                const xmlString = attachment.content.toString();
                                const data = await parseStringPromise(xmlString);

                                console.log('📊 XML data mapped:', data);
                            } catch (xmlErr) {
                                console.error('Error XML:', xmlErr);
                            }
                        }
                    }
                }
            }
        });
    });

    msg.once('attributes', (attrs) => {
        const uid = attrs.uid;
        imap.addFlags(uid, ['\\Seen'], (err) => {
            if (err) throw err;
        });
    });
}

export function startMailListener() {
    connectImap();
}