require('colors');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4, v3: uuidv3 } = require('uuid');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const tls = require('tls');

// Constants
const URI_LIST = [
    "wss://proxy.wynd.network:4444/",
    "wss://proxy2.wynd.network:4650/"
];

class Bot {
    constructor(config) {
        this.config = config;
    }

    getRandomURI() {
        return URI_LIST[Math.floor(Math.random() * URI_LIST.length)];
    }

    generateDeviceId(proxy) {
        // Using UUID v3 with DNS namespace like Python version
        return uuidv3(proxy, uuidv3.DNS);
    }

    async getProxyIP(proxy) {
        const agent = proxy.startsWith('http')
            ? new HttpsProxyAgent(proxy)
            : new SocksProxyAgent(proxy);
        try {
            const response = await axios.get(this.config.ipCheckURL, {
                httpsAgent: agent,
            });
            console.log(`Connected through proxy ${proxy}`.green);
            return response.data;
        } catch (error) {
            console.error(
                `Skipping proxy ${proxy} due to connection error: ${error.message}`
                    .yellow
            );
            return null;
        }
    }

    async connectToProxy(proxy, userID) {
        const formattedProxy = proxy.startsWith('socks5://')
            ? proxy
            : proxy.startsWith('http')
                ? proxy
                : `socks5://${proxy}`;
        const proxyInfo = await this.getProxyIP(formattedProxy);

        if (!proxyInfo) {
            return;
        }

        try {
            const agent = formattedProxy.startsWith('http')
                ? new HttpsProxyAgent(formattedProxy)
                : new SocksProxyAgent(formattedProxy);

            // SSL configuration matching Python version
            const wsOptions = {
                agent,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    OS: 'Windows',
                    Platform: 'Desktop',
                    Browser: 'Mozilla',
                },
                rejectUnauthorized: false, // Matches Python's CERT_NONE
                checkServerIdentity: () => undefined, // Disables hostname verification
            };

            const wsURL = this.getRandomURI();
            const deviceId = this.generateDeviceId(proxy);
            const ws = new WebSocket(wsURL, wsOptions);

            ws.on('open', () => {
                console.log(`Connected to ${proxy}`.cyan);
                console.log(`Device ID: ${deviceId}`.cyan);
                console.log(`Proxy IP Info: ${JSON.stringify(proxyInfo)}`.magenta);
                this.sendPing(ws, proxyInfo.ip);
            });

            ws.on('message', (message) => {
                const msg = JSON.parse(message);
                console.log(`Received message: ${JSON.stringify(msg)}`.blue);

                if (msg.action === 'AUTH') {
                    const authResponse = {
                        id: msg.id,
                        origin_action: 'AUTH',
                        result: {
                            browser_id: deviceId,
                            user_id: userID,
                            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                            timestamp: Math.floor(Date.now() / 1000),
                            device_type: 'desktop',
                            version: '4.29.0',
                        },
                    };
                    ws.send(JSON.stringify(authResponse));
                    console.log(
                        `Sent auth response: ${JSON.stringify(authResponse)}`.green
                    );
                } else if (msg.action === 'PONG') {
                    const pongResponse = {
                        id: msg.id,
                        origin_action: 'PONG'
                    };
                    ws.send(JSON.stringify(pongResponse));
                    console.log(`Sent PONG response: ${JSON.stringify(pongResponse)}`.blue);
                }
            });

            ws.on('close', (code, reason) => {
                console.log(
                    `WebSocket closed with code: ${code}, reason: ${reason}`.yellow
                );
                setTimeout(
                    () => this.connectToProxy(proxy, userID),
                    this.config.retryInterval
                );
            });

            ws.on('error', (error) => {
                console.error(
                    `WebSocket error on proxy ${proxy}: ${error.message}`.red
                );
                ws.terminate();
            });
        } catch (error) {
            console.error(
                `Failed to connect with proxy ${proxy}: ${error.message}`.red
            );
        }
    }

    sendPing(ws, proxyIP) {
        setInterval(() => {
            const pingMessage = {
                id: uuidv4(),
                version: '1.0.0',
                action: 'PING',
                data: {
                    user_name: 'shadowhere'
                }
            };
            ws.send(JSON.stringify(pingMessage));
            console.log(
                `Sent ping - IP: ${proxyIP}, Message: ${JSON.stringify(pingMessage)}`
                    .cyan
            );
        }, 30000); // Matching Python's 30-second interval
    }
}

module.exports = Bot;
