const { dialog } = require('@electron/remote');
const ServerManager = require('../utils/ServerManager');

class ServerCard {
    static REGIONS = {
        'North America': ['atl', 'dfw', 'eat', 'iad', 'lax', 'ord', 'sea'],
        'South America': ['gru', 'scl', 'lim', 'eze'],
        'Europe': ['ams', 'fra', 'hel', 'lhr', 'mad', 'par', 'sto', 'vie', 'waw'],
        'Asia': ['bom', 'dxb', 'hkg', 'sgp', 'tyo', 'seo'],
        'China': ['ctu', 'pek', 'pvg', 'sha', 'tsn'],
        'Australia': ['syd']
    };

    static REGION_FLAGS = {
        // North America
        'atl': '🇺🇸', // Atlanta
        'dfw': '🇺🇸', // Dallas
        'eat': '🇺🇸', // Seattle
        'iad': '🇺🇸', // Virginia
        'lax': '🇺🇸', // Los Angeles
        'ord': '🇺🇸', // Chicago
        'sea': '🇺🇸', // Seattle

        // South America
        'gru': '🇧🇷', // São Paulo
        'scl': '🇨🇱', // Santiago
        'lim': '🇵🇪', // Lima
        'eze': '🇦🇷', // Buenos Aires

        // Europe
        'ams': '🇳🇱', // Amsterdam
        'fra': '🇩🇪', // Frankfurt
        'hel': '🇫🇮', // Helsinki
        'lhr': '🇬🇧', // London
        'mad': '🇪🇸', // Madrid
        'par': '🇫🇷', // Paris
        'sto': '🇸🇪', // Stockholm
        'vie': '🇦🇹', // Vienna
        'waw': '🇵🇱', // Warsaw

        // Asia
        'bom': '🇮🇳', // Mumbai
        'dxb': '🇦🇪', // Dubai
        'hkg': '🇭🇰', // Hong Kong
        'sgp': '🇸🇬', // Singapore
        'tyo': '🇯🇵', // Tokyo
        'seo': '🇰🇷', // Seoul

        // China
        'ctu': '🇨🇳', // Chengdu
        'pek': '🇨🇳', // Beijing
        'pvg': '🇨🇳', // Shanghai
        'sha': '🇨🇳', // Shanghai
        'tsn': '🇨🇳', // Tianjin

        // Australia
        'syd': '🇦🇺', // Sydney
    };

    static FLAGS = {
        'North America': '🇺🇸',
        'South America': '🌎',
        'Europe': '🇪🇺',
        'Asia': '🌏',
        'China': '🌏',
        'Australia': '🇦🇺'
    };

    static create(region, data) {
        const card = document.createElement('div');
        card.className = 'server-card backdrop-blur-md bg-opacity-10 bg-white rounded-xl p-6 transform transition-all duration-300 hover:scale-105 border border-green-500/20';
        card.dataset.region = region;
        card.title = `${data.desc || region}\n${data.relays?.length || 0} servers available`;
        
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between gap-3 mb-4';
        
        const headerLeft = document.createElement('div');
        headerLeft.className = 'flex items-center gap-3';
        
        const flag = document.createElement('span');
        flag.className = 'text-2xl';
        flag.textContent = this.REGION_FLAGS[region] || this.FLAGS[this.getCountryForRegion(region)] || '🌐';
        
        const title = document.createElement('h3');
        title.className = 'text-xl font-bold text-green-400';
        title.textContent = data.desc || `Region: ${region}`;
        
        headerLeft.appendChild(flag);
        headerLeft.appendChild(title);
        
        // Add blocked indicator if any servers are blocked
        if (data.relays && data.relays.some(() => ServerManager.isBlocked(region))) {
            const blockedBadge = document.createElement('span');
            blockedBadge.className = 'px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400';
            blockedBadge.textContent = '🔒 Blocked';
            headerLeft.appendChild(blockedBadge);
        }
        
        header.appendChild(headerLeft);

        const status = document.createElement('div');
        status.className = 'text-sm text-gray-400 mb-4';
        const relaysCount = data.relays && Array.isArray(data.relays) ? data.relays.length : 0;
        status.innerHTML = `
            <div class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/>
                </svg>
                <span>${relaysCount} servers available</span>
            </div>
        `;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'w-full mt-4 px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-medium';
        this.updateButtonState(toggleBtn, region);
        toggleBtn.onclick = () => this.toggleServer(region, data, toggleBtn);

        card.appendChild(header);
        card.appendChild(status);
        card.appendChild(toggleBtn);

        return card;
    }

    static getCountryForRegion(region) {
        for (const [country, regions] of Object.entries(this.REGIONS)) {
            if (regions.includes(region)) {
                return country;
            }
        }
        return null;
    }

    static updateButtonState(button, region) {
        const isBlocked = ServerManager.isBlocked(region);
        button.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${isBlocked ? 
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>' :
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/>'}
            </svg>
            <span>${isBlocked ? 'Unblock Servers' : 'Block Servers'}</span>
        `;
        button.className = `w-full mt-4 px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-medium ${
            isBlocked 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
        }`;
    }

    static async toggleServer(region, data, button) {
        try {
            await ServerManager.toggleServer(region, data);
            this.updateButtonState(button, region);
            
            // Update the blocked badge
            const card = button.closest('.server-card');
            const headerLeft = card.querySelector('.flex.items-center.gap-3');
            const existingBadge = headerLeft.querySelector('.blocked-badge');
            
            if (ServerManager.isBlocked(region)) {
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
            console.error('ServerCard: Error toggling server:', error);
            await dialog.showMessageBox({
                type: 'error',
                title: 'Error',
                message: 'Failed to toggle server',
                detail: error.message
            });
        }
    }
}

module.exports = ServerCard; 