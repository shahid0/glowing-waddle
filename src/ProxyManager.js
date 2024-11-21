require('colors');
const axios = require('axios');
const fs = require('fs');

const PROXY_SOURCES = {
  'S1': 'https://files.ramanode.top/airdrop/grass/server_1.txt',
  'S2': 'https://files.ramanode.top/airdrop/grass/server_2.txt',
  'S3': 'https://files.ramanode.top/airdrop/grass/server_3.txt',
  'S4': 'https://raw.githubusercontent.com/elliottophellia/proxylist/refs/heads/master/results/pmix_checked.txt',
  'S5': 'https://proxyspace.pro/socks5.txt',
  'S6': 'https://raw.githubusercontent.com/Vauth/proxy/refs/heads/main/proxy.txt',
  'S7': 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text',
  'S8': 'https://raw.githubusercontent.com/shahid0/super-duper-octo-winner/refs/heads/main/us_working_proxies.txt',
  'S9': 'https://raw.githubusercontent.com/shahid0/super-duper-octo-winner/refs/heads/main/working_proxies.txt',
};

async function fetchProxies(url) {
  try {
    const response = await axios.get(url);
    console.log(`\nFetched proxies from ${url}`.green);
    return response.data.split('\n').filter(Boolean);
  } catch (error) {
    console.error(`Failed to fetch proxies from ${url}: ${error.message}`.red);
    return [];
  }
}

async function fetchAllProxies() {
  const allProxySources = Object.keys(PROXY_SOURCES);
  const proxyPromises = allProxySources.map(async (source) => {
    const url = PROXY_SOURCES[source];
    const proxies = await fetchProxies(url);
    return {
      source: source,
      proxies: proxies
    };
  });

  const proxyResults = await Promise.all(proxyPromises);
  
  // Flatten and deduplicate proxies
  const allProxies = [...new Set(
    proxyResults.flatMap(result => result.proxies)
  )];

  console.log(`\nTotal unique proxies collected: ${allProxies.length}`.green);
  return allProxies;
}

async function readLines(filename) {
  try {
    const data = await fs.promises.readFile(filename, 'utf-8');
    console.log(`Loaded data from ${filename}`.green);
    return data.split('\n').filter(Boolean);
  } catch (error) {
    console.error(`Failed to read ${filename}: ${error.message}`.red);
    return [];
  }
}

async function selectProxySource(source = 'all') {
  if(source !== 'all') {
    return { 
      type: 'url', 
      source: PROXY_SOURCES[source] 
    };
  }
  return { 
    type: 'all', 
    source: 'All Available Sources' 
  };
}

module.exports = { 
  PROXY_SOURCES,
  fetchProxies, 
  fetchAllProxies,
  readLines, 
  selectProxySource 
};