import socks from 'socks';
import { ProxyAgent } from 'proxy-agent';
import mineflayer from 'mineflayer';
import fs from 'fs';
import pkg from 'mineflayer-pathfinder';
import minecraftData from 'minecraft-data';
const { pathfinder, Movements, goals } = pkg;
import { Vec3 } from 'vec3';


// Load proxy list
const proxies = fs.readFileSync('proxies.txt', 'utf-8')
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
        const [host, port, username, password] = line.split(':');
        return { host, port: parseInt(port, 10), username, password };
    });

const botCredentials = [
    { username: 'iliketomine1990', password: 'professionalbotsfr' },
    { username: 'iliketomine4387', password: 'professionalbotsfr' },

];

const bots = [];
let isRestarting = false;

function createBot(cred, proxy) {
    const bot = mineflayer.createBot({
        username: cred.username,
        password: cred.password,
        version: '1.20.1',
        hideErrors: false,
        connect: (client) => {
            socks.SocksClient.createConnection(
                {
                    proxy: {
                        host: proxy.host,
                        port: proxy.port,
                        userId: proxy.username,
                        password: proxy.password,
                        type: 5,
                    },
                    command: 'connect',
                    destination: {
                        host: 'anarchy.6b6t.org',
                        port: 25565,
                    },
                },
                (err, info) => {
                    if (err) {
                        console.error(`[${cred.username}] Proxy connection error:`, err);
                        return;
                    }
                    client.setSocket(info.socket);
                    client.emit('connect');
                }
            );
        },
        agent: new ProxyAgent({
            protocol: 'socks5:',
            host: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
        }),
        host: 'pl.6b6t.org',
        port: 25565,
        checkTimeoutInterval: 120 * 1000,
        viewDistance: 'tiny',
    });

    bot.once('spawn', () => {
        console.log(`Bot ${cred.username} has spawned.`);
        bot.loadPlugin(pathfinder);
        navigateToPortal(bot);
    });

    bot.on('login', () => {
        console.log(`Bot ${cred.username} logged in using proxy ${proxy.host}:${proxy.port}.`);
        bots.push(bot);
        setupMessageHandlers(bot, cred.password);
    });

    bot.on('error', (err) => {
        console.error(`Bot ${cred.username} encountered an error:`, err);
    });

    bot.on('kicked', (reason) => {
        console.error(`Bot ${cred.username} was kicked: ${reason}`);
    });

    bot.on('end', (reason) => {
        console.log(`Bot ${cred.username} has disconnected. Reason: ${reason}`);

        // Remove bot from array
        const index = bots.indexOf(bot);
        if (index !== -1) bots.splice(index, 1);

        console.log(`Reconnecting bot ${cred.username} in 15 seconds...`);
        setTimeout(() => createBot(cred, proxy), 15000);
    });
}

function setupMessageHandlers(bot, mcPassword) {
    bot.on('message', async (jsonMsg) => {
        const message = jsonMsg.toString();

        if (message.includes('please login with the command: /login')) {
            console.log(`Logging in as ${bot.username}...`);
            bot.chat(`/login ${mcPassword}`);
            setTimeout(() => navigateToPortal(bot), 5000);
        }

        const restartMessages = [
            'Server restarts in 60s',
            'Server restarts in 30s',
            'Server restarts in 15s',
            'Server restarts in 10s',
            'Server restarts in 5s',
            'Server restarts in 4s',
            'Server restarts in 3s',
            'Server restarts in 2s',
            'Server restarts in 1s',
            'The target server is offline now! You have been sent to the backup server while it goes back online.',
            'You were kicked from main-server: Server closed',
            'The main server is restarting. We will be back soon! Join our Discord with /discord command in the meantime.'
        ];

        if (restartMessages.includes(message)) {
            console.log('Server restart detected. Disconnecting bot...');
            isRestarting = true;
            bot.end();
        }
    });
}
async function navigateToPortal(bot) {
    console.log(`[${bot.username}] Searching for a Nether portal...`);
    console.log(`Bot position: ${bot.entity.position}`);
    
    // Ensure pathfinder is loaded
    if (!bot.pathfinder) {
        console.error('Pathfinder not loaded!');
        return;
    }

    const mcData = minecraftData(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);

    // Check if bot is at the specific position and move it
    const targetPosition = new Vec3(-999.5, 100, -999.5);
    if (bot.entity.position.floored().equals(targetPosition.floored())) {
        console.log(`[${bot.username}] Detected at ${targetPosition}, moving to (-1001, 101, -988)...`);
        bot.pathfinder.setGoal(new goals.GoalBlock(-1001, 101, -988));
        return;
    }
}





export async function startBots() {
    if (bots.length === 0) {
        for (let index = 0; index < botCredentials.length; index++) {
            const cred = botCredentials[index];
            const proxy = proxies[Math.floor(index / 3)];
            
            createBot(cred, proxy);
            console.log(`Started bot: ${cred.username}`);
            
            // Wait for 5 seconds before starting the next bot
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        console.log('All bots started.');
    } else {
        console.log('Bots are already running.');
    }
}


export function broadcastMessage(message) {
    bots.forEach(bot => {
        if (bot && bot.chat) {
            bot.chat(message);
            console.log(`Sent message: "${message}" from bot ${bot.username}`);
        }
    });
}

export function count() {
    return bots.length; // Fixed function to return bot count
}

