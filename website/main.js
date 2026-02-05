# Main JavaScript Implementation

```javascript
/**
 * PromoCodePlatform - Main Application JavaScript
 * A platform for developers to upload bulk promo codes with automatic distribution
 */

class PromoCodePlatform {
    constructor() {
        this.apiBaseUrl = '/api';
        this.currentUser = null;
        this.socket = null;
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.initializeAuth();
        this.setupWebSocket();
        this.loadUserDashboard();
    }

    /**
     * Setup WebSocket for real-time code tracking
     */
    setupWebSocket() {
        this.socket = new WebSocket(`ws://${window.location.host}/ws`);
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleRealtimeUpdate(data);
        };

        this.socket.onclose = () => {
            // Reconnect after 3 seconds
            setTimeout(() => this.setupWebSocket(), 3000);
        };
    }

    /**
     * Handle real-time updates from WebSocket
     */
    handleRealtimeUpdate(data) {
        switch(data.type) {
            case 'code_redeemed':
                this.updateCodeStatus(data.codeId, 'used');
                this.updateCampaignStats(data.campaignId);
                this.showNotification(`Code ${data.code} was redeemed!`, 'success');
                break;
            case 'campaign_stats':
                this.updateDashboardStats(data);
                break;
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // File upload handling
        document.getElementById('csv-upload')?.addEventListener('change', this.handleCSVUpload.bind(this));
        
        // Campaign creation
        document.getElementById('create-campaign-btn')?.addEventListener('click', this.showCampaignModal.bind(this));
        document.getElementById('campaign-form')?.addEventListener('submit', this.createCampaign.bind(this));
        
        // Code distribution
        document.getElementById('distribute-btn')?.addEventListener('click', this.distributeCodes.bind(this));
        
        // Platform filter
        document.getElementById('platform-filter')?.addEventListener('change', this.filterByPlatform.bind(this));
        
        // Bulk actions
        document.getElementById('bulk-action-btn')?.addEventListener('click', this.handleBulkAction.bind(this));
        
        // Export functionality
        document.getElementById('export-btn')?.addEventListener('click', this.exportData.bind(this));
        
        // Search functionality
        document.getElementById('search-input')?.addEventListener('input', this.debounce(this.handleSearch.bind(this), 300));
    }

    /**
     * Initialize authentication
     */
    async initializeAuth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/me`);
            if (response.ok) {
                this.currentUser = await response.json();
                this.updateUIForAuthenticatedUser();
            } else {
                this.showLoginForm();
            }
        } catch (error) {
            console.error('Auth initialization failed:', error);
            this.showLoginForm();
        }
    }

    /**
     * Handle CSV file upload for bulk promo codes
     */
    async handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            this.showNotification('Please upload a CSV file', 'error');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('File size must be less than 10MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('csv_file', file);

        try {
            this.showLoadingState('Uploading and processing codes...');
            
            const response = await fetch(`${this.apiBaseUrl}/codes/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`Successfully uploaded ${result.count} codes`, 'success');
                this.refreshCodesList();
                this.updateDashboardStats(result.stats);
            } else {
                this.showNotification(result.error || 'Upload failed', 'error');
            }
        } catch (error) {
            this.showNotification('Network error during upload', 'error');
            console.error('Upload error:', error);
        } finally {
            this.hideLoadingState();
        }
    }

    /**
     * Create a new promo code campaign
     */
    async createCampaign(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const campaignData = {
            name: formData.get('name'),
            description: formData.get('description'),
            platforms: Array.from(formData.getAll('platforms')),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            maxRedemptions: parseInt(formData.get('maxRedemptions')) || null,
            autoDistribute: formData.get('autoDistribute') === 'on'
        };

        try {
            const response = await fetch(`${this.apiBaseUrl}/campaigns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(campaignData)
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('Campaign created successfully', 'success');
                this.hideCampaignModal();
                this.refreshCampaignsList();
            } else {
                this.showNotification(result.error || 'Failed to create campaign', 'error');
            }
        } catch (error) {
            this.showNotification('Network error', 'error');
            console.error('Campaign creation error:', error);
        }
    }

    /**
     * Distribute codes automatically based on user platform
     */
    async distributeCodes() {
        const selectedCampaign = document.getElementById('campaign-select').value;
        if (!selectedCampaign) {
            this.showNotification('Please select a campaign', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/campaigns/${selectedCampaign}/distribute`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`Started distributing ${result.queuedCount} codes`, 'success');
                this.updateCampaignStats(selectedCampaign);
            } else {
                this.showNotification(result.error || 'Distribution failed', 'error');
            }
        } catch (error) {
            this.showNotification('Network error during distribution', 'error');
            console.error('Distribution error:', error);
        }
    }

    /**
     * Filter codes by platform
     */
    filterByPlatform(event) {
        const platform = event.target.value;
        const codesList = document.getElementById('codes-list');
        const rows = codesList.querySelectorAll('tr[data-platform]');

        rows.forEach(row => {
            const rowPlatform = row.dataset.platform;
            if (platform === 'all' || rowPlatform === platform) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });

        this.updateFilteredStats(platform);
    }

    /**
     * Handle search functionality
     */
    handleSearch(event) {
        const query = event.target.value.toLowerCase();
        const codesList = document.getElementById('codes-list');
        const rows = codesList.querySelectorAll('tbody tr');

        rows.forEach(row => {
            const code = row.cells[1]?.textContent.toLowerCase() || '';
            const campaign = row.cells[2]?.textContent.toLowerCase() || '';
            const platform = row.cells[3]?.textContent.toLowerCase() || '';

            if (code.includes(query) || campaign.includes(query) || platform.includes(query)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    /**
     * Handle bulk actions on selected codes
     */
    async handleBulkAction() {
        const selectedCodes = this.getSelectedCodes();
        const action = document.getElementById('bulk-action-select').value;

        if (selectedCodes.length === 0) {
            this.showNotification('Please select codes first', 'warning');
            return;
        }

        if (!action) {
            this.showNotification('Please select an action', 'warning');
            return;
        }

        const confirmMessage = `Are you sure you want to ${action} ${selectedCodes.length} codes?`;
        if (!confirm(confirmMessage)) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/codes/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    action: action,
                    codeIds: selectedCodes
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification(`Successfully ${action}ed ${result.affected} codes`, 'success');
                this.refreshCodesList();
            } else {
                this.showNotification(result.error || 'Bulk action failed', 'error');
            }
        } catch (error) {
            this.showNotification('Network error during bulk action', 'error');
            console.error('Bulk action error:', error);
        }
    }

    /**
     * Export data in various formats
     */
    async exportData() {
        const format = document.getElementById('export-format').value;
        const filters = this.getCurrentFilters();

        try {
            const response = await fetch(`${this.apiBaseUrl}/export?format=${format}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify(filters)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `promo-codes-export.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showNotification('Export completed', 'success');
            } else {
                this.showNotification('Export failed', 'error');
            }
        } catch (error) {
            this.showNotification('Export error', 'error');
            console.error('Export error:', error);
        }
    }

    /**
     * Update dashboard statistics
     */
    updateDashboardStats(stats) {
        const elements = {
            'total-codes': stats.totalCodes || 0,
            'used-codes': stats.usedCodes || 0,
            'unused-codes': stats.unusedCodes || 0,
            'active-campaigns': stats.activeCampaigns || 0,
            'usage-rate': `${((stats.usedCodes / stats.totalCodes) * 100).toFixed(1)}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.classList.add('updated');
                setTimeout(() => element.classList.remove('updated'), 1000);
            }
        });

        this.updateCharts(stats);
    }

    /**
     * Update charts with new data
     */
    updateCharts(stats) {
        // Usage chart
        const usageCtx = document.getElementById('usage-chart');
        if (usageCtx) {
            new Chart(usageCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Used', 'Unused'],
                    datasets: [{
                        data: [stats.usedCodes, stats.unusedCodes],
                        backgroundColor: ['#10b981', '#e5e7eb']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Platform distribution chart
        const platformCtx = document.getElementById('platform-chart');
        if (platformCtx && stats.platformBreakdown) {
            new Chart(platformCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(stats.platformBreakdown),
                    datasets: [{
                        label: 'Codes by Platform',
                        data: Object.values(stats.platformBreakdown),
                        backgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="close-btn" onclick="this.parentElement.remove()">×</button>
        `;

        const container = document.getElementById('notifications-container') || document.body;
        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Show loading state
     */
    showLoadingState(message = 'Loading...') {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.querySelector('.loading-message').textContent = message;
            loader.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * Utility function for debouncing
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Get selected code IDs from checkboxes
     */
    getSelectedCodes() {
        const checkboxes = document.querySelectorAll('input[name="code-select"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * Get current filter settings
     */
    getCurrentFilters() {
        return {
            platform: document.getElementById('