require('colors');
const inquirer = require('inquirer');
const Bot = require('./src/Bot');
const Config = require('./src/Config');
const {
  fetchAllProxies,
  readLines,
  selectProxySource,
} = require('./src/ProxyManager');
const { delay, displayHeader } = require('./src/utils');

async function main() {
  displayHeader();
  console.log(`Please wait...\n`.yellow);

  await delay(10);

  const config = new Config();
  const bot = new Bot(config);

  const proxySource = await selectProxySource();

  let proxies = [];
  if (proxySource.type === 'all') {
    proxies = await fetchAllProxies();
  }

  if (proxies.length === 0) {
    console.error('No proxies found. Exiting...'.red);
    return;
  }

  console.log(`Loaded ${proxies.length} unique proxies`.green);

  const userIDs = await readLines('uid.txt');
  if (userIDs.length === 0) {
    console.error('No user IDs found in uid.txt. Exiting...'.red);
    return;
  }

  console.log(`Loaded ${userIDs.length} user IDs\n`.green);

  const connectionPromises = userIDs.flatMap((userID) =>
    proxies.map((proxy) => bot.connectToProxy(proxy, userID))
  );

  await Promise.all(connectionPromises);
}

main().catch(console.error);