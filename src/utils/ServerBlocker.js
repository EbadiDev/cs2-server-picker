const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ServerBlocker {
    static async blockServers(region, servers) {
        try {
            const isWindows = process.platform === 'win32';
            const ips = servers.map(server => server.ipv4);
            
            if (isWindows) {
                await this.blockWindowsServer(ips);
            } else {
                await this.blockLinuxServer(ips);
            }
        } catch (error) {
            console.error('Error blocking servers:', error);
            throw error;
        }
    }

    static async unblockAllServers(region, servers) {
        try {
            const isWindows = process.platform === 'win32';
            const ips = servers.map(server => server.ipv4);
            
            if (isWindows) {
                await this.unblockWindowsServer(ips);
            } else {
                await this.unblockLinuxServer(ips);
            }
        } catch (error) {
            console.error('Error unblocking servers:', error);
            throw error;
        }
    }

    static async blockLinuxServer(ips) {
        try {
            // Add rules directly
            const commands = ips
                .map(ip => `iptables -A OUTPUT -d ${ip} -p udp --dport 27015 -j DROP -m comment --comment "CS2_BLOCK"`)
                .join('; ');

            await execAsync(`pkexec sh -c '${commands}'`);
            return true;
        } catch (error) {
            console.error('Error adding blocking rules:', error);
            throw error;
        }
    }

    static async unblockLinuxServer(ips) {
        try {
            // Just try to remove the rules directly
            const commands = ips
                .map(ip => `iptables -D OUTPUT -d ${ip} -p udp --dport 27015 -j DROP -m comment --comment "CS2_BLOCK"`)
                .join('; ');

            await execAsync(`pkexec sh -c '${commands}'`);
            return true;
        } catch (error) {
            // If error contains "Bad rule", it means rule doesn't exist - not a real error
            if (error.message.includes('Bad rule')) {
                return true;
            }
            console.error('Error removing blocking rules:', error);
            throw error;
        }
    }

    static async blockWindowsServer(ips) {
        // For Windows, create a single batch command
        const rules = ips.map(ip => 
            `netsh advfirewall firewall add rule name="CS2_BLOCK_${ip}" dir=out action=block protocol=UDP remoteip=${ip}`
        ).join(' && ');
        await execAsync(rules, { shell: 'cmd.exe' });
    }

    static async unblockWindowsServer(ips) {
        // For Windows, create a single batch command
        const rules = ips.map(ip => 
            `netsh advfirewall firewall delete rule name="CS2_BLOCK_${ip}"`
        ).join(' && ');
        await execAsync(rules, { shell: 'cmd.exe' });
    }
}

module.exports = ServerBlocker; 