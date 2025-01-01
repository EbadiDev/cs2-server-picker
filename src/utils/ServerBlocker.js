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
            // Block both inbound and outbound traffic for both UDP and TCP
            const commands = ips.flatMap(ip => [
                // Block outbound
                `iptables -A OUTPUT -d ${ip} -p udp -j DROP -m comment --comment "CS2_BLOCK"`,
                `iptables -A OUTPUT -d ${ip} -p tcp -j DROP -m comment --comment "CS2_BLOCK"`,
                // Block inbound
                `iptables -A INPUT -s ${ip} -p udp -j DROP -m comment --comment "CS2_BLOCK"`,
                `iptables -A INPUT -s ${ip} -p tcp -j DROP -m comment --comment "CS2_BLOCK"`
            ]).join('; ');

            await execAsync(`pkexec sh -c '${commands}'`);
            return true;
        } catch (error) {
            console.error('Error adding blocking rules:', error);
            throw error;
        }
    }

    static async unblockLinuxServer(ips) {
        try {
            // Remove both inbound and outbound blocks for both UDP and TCP
            const commands = ips.flatMap(ip => [
                // Remove outbound blocks
                `iptables -D OUTPUT -d ${ip} -p udp -j DROP -m comment --comment "CS2_BLOCK"`,
                `iptables -D OUTPUT -d ${ip} -p tcp -j DROP -m comment --comment "CS2_BLOCK"`,
                // Remove inbound blocks
                `iptables -D INPUT -s ${ip} -p udp -j DROP -m comment --comment "CS2_BLOCK"`,
                `iptables -D INPUT -s ${ip} -p tcp -j DROP -m comment --comment "CS2_BLOCK"`
            ]).join('; ');

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
        // Block both inbound and outbound for both UDP and TCP
        const rules = ips.flatMap(ip => [
            // Block outbound
            `netsh advfirewall firewall add rule name="CS2_BLOCK_OUT_UDP_${ip}" dir=out action=block protocol=UDP remoteip=${ip}`,
            `netsh advfirewall firewall add rule name="CS2_BLOCK_OUT_TCP_${ip}" dir=out action=block protocol=TCP remoteip=${ip}`,
            // Block inbound
            `netsh advfirewall firewall add rule name="CS2_BLOCK_IN_UDP_${ip}" dir=in action=block protocol=UDP remoteip=${ip}`,
            `netsh advfirewall firewall add rule name="CS2_BLOCK_IN_TCP_${ip}" dir=in action=block protocol=TCP remoteip=${ip}`
        ]).join(' && ');
        await execAsync(rules, { shell: 'cmd.exe' });
    }

    static async unblockWindowsServer(ips) {
        // Remove all blocking rules
        const rules = ips.flatMap(ip => [
            `netsh advfirewall firewall delete rule name="CS2_BLOCK_OUT_UDP_${ip}"`,
            `netsh advfirewall firewall delete rule name="CS2_BLOCK_OUT_TCP_${ip}"`,
            `netsh advfirewall firewall delete rule name="CS2_BLOCK_IN_UDP_${ip}"`,
            `netsh advfirewall firewall delete rule name="CS2_BLOCK_IN_TCP_${ip}"`
        ]).join(' && ');
        await execAsync(rules, { shell: 'cmd.exe' });
    }
}

module.exports = ServerBlocker; 