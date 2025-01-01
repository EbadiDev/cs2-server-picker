const { ipcRenderer } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { app } = require('@electron/remote');

// Use global base path for module resolution
const ServerCard = require(path.join(__basedir, 'components/ServerCard'));
const WindowControls = require(path.join(__basedir, 'components/WindowControls'));
const ServerManager = require(path.join(__basedir, 'utils/ServerManager'));

async function initializeApp() {
    try {
        WindowControls.init();
        await loadServers();
    } catch (error) {
        console.error('Renderer: Error initializing app:', error);
        showError('Error initializing application');
    }
}

// Add this function to show error messages
function showError(message) {
    const serverList = document.getElementById('serverList');
    serverList.innerHTML = `<div class="text-center text-red-500">${message}</div>`;
}

// Add this function to create the refresh button
function createRefreshButton() {
    const container = document.querySelector('.container');
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-6';
    
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'flex gap-2';
    
    const refreshButton = document.createElement('button');
    refreshButton.className = 'px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm flex items-center gap-2 transition-all duration-200 transform hover:scale-105';
    refreshButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Refresh Servers</span>
    `;
    
    const unblockAllButton = document.createElement('button');
    unblockAllButton.className = 'px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm flex items-center gap-2 transition-all duration-200 transform hover:scale-105';
    unblockAllButton.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
        </svg>
        <span>Unblock All Regions</span>
    `;
    
    unblockAllButton.onclick = async () => {
        try {
            unblockAllButton.disabled = true;
            unblockAllButton.innerHTML = `
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Unblocking...</span>
            `;

            const serverData = await ServerManager.fetchServers();
            for (const [region, data] of Object.entries(serverData)) {
                if (ServerManager.isBlocked(region)) {
                    await ServerManager.unblockAllServers(region, data.relays);
                }
            }

            // Refresh the page to update all UI elements
            await loadServers();
        } catch (error) {
            console.error('Error unblocking all servers:', error);
            unblockAllButton.innerHTML = 'Error unblocking servers';
        } finally {
            unblockAllButton.disabled = false;
            unblockAllButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                </svg>
                <span>Unblock All Regions</span>
            `;
        }
    };

    // Add refresh button functionality
    refreshButton.onclick = async () => {
        try {
            refreshButton.disabled = true;
            refreshButton.innerHTML = `
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Refreshing...</span>
            `;
            await loadServers();
        } catch (error) {
            console.error('Error refreshing servers:', error);
            showError('Failed to refresh servers');
        } finally {
            refreshButton.disabled = false;
            refreshButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh Servers</span>
            `;
        }
    };

    buttonGroup.appendChild(refreshButton);
    buttonGroup.appendChild(unblockAllButton);
    header.appendChild(buttonGroup);
    container.insertBefore(header, container.firstChild);
}

async function pingServer(ip) {
    try {
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 
            `ping -n 1 -w 2000 ${ip}` : // Windows
            `ping -c 1 ${ip}`; // Linux/Mac
        
        const { stdout } = await execAsync(command);
        
        // Parse ping time from output
        const match = isWindows ?
            stdout.match(/time[=<](\d+)ms/) :
            stdout.match(/time=([\d.]+) ms/);
            
        if (match && match[1]) {
            return parseFloat(match[1]);
        }
        return -1;
    } catch (error) {
        console.error('Ping error:', error);
        return -1;
    }
}

async function loadServers() {
    const serverList = document.getElementById('serverList');
    try {
        // Show loading state
        serverList.innerHTML = `
            <div class="flex items-center justify-center gap-3 text-gray-400">
                <svg class="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-xl">Loading servers...</span>
            </div>
        `;

        const serverData = await ServerManager.fetchServers();
        
        if (!serverData) {
            serverList.innerHTML = '<div class="text-center text-red-500">No servers found</div>';
            return;
        }

        serverList.innerHTML = '';

        // Group servers by country
        const groupedServers = {};
        for (const [region, data] of Object.entries(serverData)) {
            const country = ServerCard.getCountryForRegion(region);
            if (country) {
                if (!groupedServers[country]) {
                    groupedServers[country] = [];
                }
                groupedServers[country].push({ region, data });
            }
        }

        // Create country groups
        for (const [country, servers] of Object.entries(groupedServers)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'region-group mb-8';
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'flex items-center justify-between cursor-pointer p-2 hover:bg-white/5 rounded-lg transition-colors duration-200';
            groupHeader.onclick = () => toggleGroup(groupDiv);
            
            const headerLeft = document.createElement('div');
            headerLeft.className = 'flex items-center gap-3';
            headerLeft.innerHTML = `
                <span class="text-2xl">${ServerCard.FLAGS[country]}</span>
                <h2 class="text-xl font-bold text-green-400">${country}</h2>
                <span class="text-gray-500 text-sm">(${servers.length} regions)</span>
            `;

            const expandIcon = document.createElement('div');
            expandIcon.className = 'expand-icon transform transition-transform duration-200';
            expandIcon.innerHTML = `
                <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            `;
            
            groupHeader.appendChild(headerLeft);
            groupHeader.appendChild(expandIcon);
            
            const serversGrid = document.createElement('div');
            serversGrid.className = 'servers-grid mt-4 grid-content';
            
            servers.forEach(({ region, data }) => {
                if (data && typeof data === 'object') {
                    const card = ServerCard.create(region, data);
                    
                    // Add ping button only if there are servers available
                    if (data.relays && Array.isArray(data.relays) && data.relays.length > 0) {
                        const pingButton = document.createElement('button');
                        pingButton.className = 'mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm flex items-center justify-center gap-2 w-full transition-colors duration-200';
                        pingButton.innerHTML = `
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <span>Check Ping</span>
                        `;
                        
                        const pingResult = document.createElement('div');
                        pingResult.className = 'mt-2 text-center text-sm text-gray-400';
                        
                        pingButton.onclick = async () => {
                            try {
                                pingButton.disabled = true;
                                pingResult.innerHTML = ''; // Clear previous results
                                
                                // Create containers for progress and live results
                                const progressDiv = document.createElement('div');
                                progressDiv.className = 'text-sm text-gray-400 text-center mt-2';
                                const liveResults = document.createElement('div');
                                liveResults.className = 'space-y-1 mt-2';
                                
                                // Create cancel button
                                const cancelButton = document.createElement('button');
                                cancelButton.className = 'mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-white text-sm transition-colors duration-200';
                                cancelButton.innerHTML = 'Cancel Testing';
                                let isCancelled = false;
                                
                                cancelButton.onclick = () => {
                                    isCancelled = true;
                                    cancelButton.innerHTML = 'Cancelling...';
                                    cancelButton.disabled = true;
                                };
                                
                                // Add elements to pingResult
                                pingResult.appendChild(progressDiv);
                                pingResult.appendChild(cancelButton);
                                pingResult.appendChild(liveResults);
                                
                                pingButton.innerHTML = `
                                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Testing servers...</span>
                                `;

                                const testResults = [];
                                
                                // Test each server
                                for (let i = 0; i < data.relays.length; i++) {
                                    if (isCancelled) {
                                        break;
                                    }
                                    
                                    progressDiv.textContent = `Testing server ${i + 1}/${data.relays.length}...`;
                                    const results = await testServer(data.relays[i].ipv4);
                                    
                                    if (results) {
                                        const serverResult = {
                                            ...data.relays[i],
                                            ...results,
                                            score: results.ping + (results.jitter * 2) + (results.packetLoss * 3)
                                        };
                                        testResults.push(serverResult);

                                        // Show result immediately
                                        const resultElement = document.createElement('div');
                                        resultElement.innerHTML = createServerResultDisplay(serverResult);
                                        liveResults.appendChild(resultElement);

                                        // Re-sort and highlight best 3 servers
                                        const bestServers = testResults
                                            .sort((a, b) => a.score - b.score)
                                            .slice(0, 3);

                                        // Update highlighting
                                        liveResults.querySelectorAll('.server-result').forEach(el => {
                                            const ip = el.querySelector('.server-ip').textContent;
                                            if (bestServers.some(s => s.ipv4 === ip)) {
                                                el.classList.add('best-server');
                                            } else {
                                                el.classList.remove('best-server');
                                            }
                                        });
                                    }
                                }

                                // Remove cancel button
                                cancelButton.remove();

                                // Get final best servers
                                const bestServers = testResults
                                    .sort((a, b) => a.score - b.score)
                                    .slice(0, 3);

                                if (bestServers.length > 0 && !isCancelled) {
                                    // Add the block others button
                                    const blockOthersButton = document.createElement('button');
                                    let isAnyBlocked = data.relays.some(relay => ServerManager.isBlocked(region));

                                    blockOthersButton.className = `mt-2 px-4 py-2 rounded-lg text-white text-sm flex items-center justify-center gap-2 w-full transition-colors duration-200 ${
                                        isAnyBlocked ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'
                                    }`;

                                    blockOthersButton.innerHTML = isAnyBlocked ? `
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                                        </svg>
                                        <span>Unblock All Servers</span>
                                    ` : `
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                        </svg>
                                        <span>Block Other Servers</span>
                                    `;

                                    blockOthersButton.onclick = async () => {
                                        try {
                                            blockOthersButton.disabled = true;
                                            if (isAnyBlocked) {
                                                // Unblock all servers
                                                await ServerManager.unblockAllServers(region, data.relays);
                                                isAnyBlocked = false;
                                                blockOthersButton.className = 'mt-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm flex items-center justify-center gap-2 w-full transition-colors duration-200';
                                                blockOthersButton.innerHTML = `
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                                    </svg>
                                                    <span>Block Other Servers</span>
                                                `;
                                            } else {
                                                // Block all except recommended
                                                const bestIPs = new Set(bestServers.map(s => s.ipv4));
                                                const othersToBlock = data.relays.filter(s => !bestIPs.has(s.ipv4));
                                                await ServerManager.blockServers(region, othersToBlock);
                                                isAnyBlocked = true;
                                                blockOthersButton.className = 'mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-sm flex items-center justify-center gap-2 w-full transition-colors duration-200';
                                                blockOthersButton.innerHTML = `
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                                                    </svg>
                                                    <span>Unblock All Servers</span>
                                                `;
                                            }

                                            // Refresh the server card's blocked state
                                            const card = blockOthersButton.closest('.server-card');
                                            const headerLeft = card.querySelector('.flex.items-center.gap-3');
                                            const existingBadge = headerLeft.querySelector('.blocked-badge');
                                            
                                            if (isAnyBlocked) {
                                                if (!existingBadge) {
                                                    const blockedBadge = document.createElement('span');
                                                    blockedBadge.className = 'blocked-badge px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400';
                                                    blockedBadge.textContent = '🔒 Blocked';
                                                    headerLeft.appendChild(blockedBadge);
                                                }
                                            } else if (existingBadge) {
                                                existingBadge.remove();
                                            }
                                        } catch (error) {
                                            console.error('Error managing servers:', error);
                                            blockOthersButton.innerHTML = 'Error managing servers';
                                        } finally {
                                            blockOthersButton.disabled = false;
                                        }
                                    };

                                    pingResult.innerHTML = `
                                        <div class="space-y-1">
                                            <div class="text-sm text-green-400 mb-2">✨ Recommended servers:</div>
                                            ${bestServers.map(createServerResultDisplay).join('')}
                                            <div class="text-xs text-gray-500 mt-2">
                                                <div>Lower values are better:</div>
                                                <div>• Ping: Response time</div>
                                                <div>• Jitter: Connection stability</div>
                                                <div>• Loss: Packet loss percentage</div>
                                            </div>
                                        </div>
                                    `;
                                    pingResult.appendChild(blockOthersButton);
                                } else if (isCancelled) {
                                    progressDiv.textContent = 'Testing cancelled';
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                    progressDiv.remove();
                                } else {
                                    pingResult.innerHTML = `<span class="text-red-400">No responsive servers found</span>`;
                                }
                            } catch (error) {
                                console.error('Ping error:', error);
                                pingResult.innerHTML = `<span class="text-red-400">Error testing servers</span>`;
                            } finally {
                                pingButton.innerHTML = `
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                    </svg>
                                    <span>Check Ping</span>
                                `;
                                pingButton.disabled = false;
                            }
                        };
                        
                        card.appendChild(pingButton);
                        card.appendChild(pingResult);
                    } else {
                        // Add a disabled message if no servers are available
                        const noServersMsg = document.createElement('div');
                        noServersMsg.className = 'mt-2 text-center text-sm text-gray-500';
                        noServersMsg.textContent = 'No servers available to ping';
                        card.appendChild(noServersMsg);
                    }
                    
                    serversGrid.appendChild(card);
                }
            });
            
            groupDiv.appendChild(groupHeader);
            groupDiv.appendChild(serversGrid);
            serverList.appendChild(groupDiv);
            
            // Expand first group by default
            if (country === Object.keys(groupedServers)[0]) {
                groupDiv.classList.add('expanded');
                serversGrid.style.maxHeight = serversGrid.scrollHeight + 'px';
            }
        }
    } catch (error) {
        console.error('Renderer: Error in loadServers:', error);
        showError(`Error loading servers: ${error.message}`);
    }
}

function toggleGroup(groupDiv) {
    const content = groupDiv.querySelector('.grid-content');
    const icon = groupDiv.querySelector('.expand-icon');
    
    groupDiv.classList.toggle('expanded');
    
    if (groupDiv.classList.contains('expanded')) {
        content.style.maxHeight = content.scrollHeight + 'px';
    } else {
        content.style.maxHeight = null;
    }
}

// Add this function to get best servers based on ping
async function testServer(ip) {
    try {
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
            const toolsDir = path.join(app.getPath('userData'), 'tools');
            const pspingPath = path.join(toolsDir, 'psping.exe');
            const command = `"${pspingPath}" -n 10 -w 0 ${ip}:27015`;
            const { stdout } = await execAsync(command);
            
            // Parse PSPing output
            const lines = stdout.split('\n');
            const statsLine = lines.find(line => line.includes('Minimum'));
            if (!statsLine) return null;

            const [min, avg, max, loss] = statsLine.match(/[\d.]+/g).map(Number);
            
            return {
                ping: Math.round(avg),
                jitter: Math.round((max - min) / 2),
                packetLoss: loss
            };
        } else {
            // For Linux/Mac use ping with multiple packets
            try {
                const { stdout } = await execAsync(`ping -c 10 ${ip}`);
                
                // Parse ping output
                const times = stdout.match(/time=([\d.]+) ms/g)
                    ?.map(t => parseFloat(t.match(/[\d.]+/)[0])) || [];
                    
                if (times.length === 0) return null;

                const ping = Math.round(times.reduce((a, b) => a + b) / times.length);
                const jitter = Math.round(Math.max(...times) - Math.min(...times));
                const packetLoss = ((10 - times.length) / 10) * 100;

                return { ping, jitter, packetLoss };
            } catch (error) {
                // If ping fails, return null instead of throwing
                return null;
            }
        }
    } catch (error) {
        console.error('Network test error:', error);
        return null;
    }
}

// Update getBestServers function to use the new metrics
async function getBestServers(servers, maxServers = 3) {
    const testResults = [];
    const progressDiv = document.createElement('div');
    progressDiv.className = 'text-sm text-gray-400';
    
    // Create a container for live results
    const liveResults = document.createElement('div');
    liveResults.className = 'space-y-1 mt-2';
    progressDiv.parentElement?.appendChild(liveResults);

    for (let i = 0; i < servers.length; i++) {
        progressDiv.textContent = `Testing server ${i + 1}/${servers.length}...`;
        const results = await testServer(servers[i].ipv4);
        
        if (results) {
            const serverResult = { 
                ...servers[i], 
                ...results,
                score: results.ping + (results.jitter * 2) + (results.packetLoss * 3)
            };
            testResults.push(serverResult);

            // Show result immediately
            const resultElement = document.createElement('div');
            resultElement.innerHTML = createServerResultDisplay(serverResult);
            liveResults.appendChild(resultElement);

            // Re-sort and highlight best servers
            const bestServers = testResults
                .sort((a, b) => a.score - b.score)
                .slice(0, maxServers);

            // Update highlighting
            liveResults.querySelectorAll('.server-result').forEach(el => {
                const ip = el.querySelector('.server-ip').textContent;
                if (bestServers.some(s => s.ipv4 === ip)) {
                    el.classList.add('best-server');
                } else {
                    el.classList.remove('best-server');
                }
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Return sorted results
    return testResults
        .sort((a, b) => a.score - b.score)
        .slice(0, maxServers);
}

// Update the server result display to support highlighting
function createServerResultDisplay(server) {
    const qualityColor = server.score < 50 ? 'text-green-400' : 
                        server.score < 100 ? 'text-yellow-400' : 
                        'text-red-400';
    
    return `
        <div class="server-result flex flex-col p-2 rounded bg-opacity-10 bg-white backdrop-blur-sm mb-2 transition-all duration-200">
            <div class="flex items-center justify-between">
                <span class="server-ip text-gray-300">${server.ipv4}</span>
                <span class="${qualityColor} font-bold">${server.ping}ms</span>
            </div>
            <div class="flex justify-between text-xs mt-1 text-gray-400">
                <span>Jitter: ${server.jitter}ms</span>
                <span>Loss: ${server.packetLoss.toFixed(1)}%</span>
            </div>
        </div>
    `;
}

async function checkSteamAPI() {
    try {
        const response = await fetch('https://api.steampowered.com/ISteamApps/GetSDRConfig/v1/?appid=730');
        return response.ok;
    } catch {
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    createRefreshButton();
    initializeApp();
});

document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R to refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        document.querySelector('.refresh-button')?.click();
    }
    // Esc to cancel ping tests
    if (e.key === 'Escape') {
        document.querySelector('.cancel-button')?.click();
    }
}); 