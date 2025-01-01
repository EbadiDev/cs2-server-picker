const { ipcRenderer } = require('electron');
const { app } = require('@electron/remote');
const path = require('path');
const ServerBlocker = require('./ServerBlocker');

class ServerManager {
    static blockedServers = new Set();

    static async fetchServers(retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const data = await ipcRenderer.invoke('fetch-servers');
                if (data) return data;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        throw new Error('Failed to fetch servers after multiple attempts');
    }

    static async toggleServer(region, data) {
        console.log('ServerManager: Toggling server for region:', region, 'with data:', data);
        
        if (!data || !data.relays || !Array.isArray(data.relays)) {
            throw new Error('Invalid server data structure');
        }

        const ips = data.relays.map(relay => {
            if (!relay || !relay.ipv4) {
                throw new Error('Invalid relay data structure');
            }
            return relay.ipv4;
        });

        if (ips.length === 0) {
            throw new Error('No server IPs found for this region');
        }

        try {
            if (this.isBlocked(region)) {
                await ServerBlocker.unblockAllServers(region, data.relays);
                this.blockedServers.delete(region);
                this.saveBlockedServers();
            } else {
                await ServerBlocker.blockServers(region, data.relays);
                this.blockedServers.add(region);
                this.saveBlockedServers();
            }
        } catch (error) {
            console.error('ServerManager: Error toggling server:', error);
            throw error;
        }
    }

    static isBlocked(region) {
        return Array.from(this.blockedServers).includes(region);
    }

    static async blockServers(region, servers) {
        try {
            await ServerBlocker.blockServers(region, servers);
            servers.forEach(server => {
                this.blockedServers.add(region);
            });
            this.saveBlockedServers();
        } catch (error) {
            console.error('Error blocking servers:', error);
            throw error;
        }
    }

    static async unblockAllServers(region, servers) {
        try {
            await ServerBlocker.unblockAllServers(region, servers);
            this.blockedServers.delete(region);
            this.saveBlockedServers();
        } catch (error) {
            console.error('Error unblocking servers:', error);
            throw error;
        }
    }

    static saveBlockedServers() {
        localStorage.setItem('blockedServers', JSON.stringify(Array.from(this.blockedServers)));
    }

    static loadBlockedServers() {
        const saved = localStorage.getItem('blockedServers');
        if (saved) {
            this.blockedServers = new Set(JSON.parse(saved));
        }
    }
}

ServerManager.loadBlockedServers();

module.exports = ServerManager; 