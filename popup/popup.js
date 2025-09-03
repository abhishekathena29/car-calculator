// popup.js - Popup settings interface

class CarEfficiencyPopup {
    constructor() {
        this.defaultSettings = {
            weights: {
                efficiency: 35,
                safety: 30,
                valueForMoney: 25,
                performancePerEfficiency: 10
            },
            fuelPrices: {
                petrol: 110,
                diesel: 95,
                cng: 80,
                electricity: 9
            }
        };

        this.currentSettings = null;
        this.init();
    }

    /**
     * Initialize popup
     */
    async init() {
        try {
            // Load current settings
            await this.loadSettings();

            // Populate form
            this.populateForm();

            // Setup event listeners
            this.setupEventListeners();

            // Check page status and API status
            this.checkPageStatus();
            this.checkApiStatus();

            console.log('Popup initialized successfully');

        } catch (error) {
            console.error('Error initializing popup:', error);
            this.showStatus('Failed to initialize settings', 'error');
        }
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['carEfficiencySettings']);
            const stored = result.carEfficiencySettings || {};

            // Merge with defaults
            this.currentSettings = {
                weights: { ...this.defaultSettings.weights, ...stored.weights },
                fuelPrices: { ...this.defaultSettings.fuelPrices, ...stored.fuelPrices }
            };

        } catch (error) {
            console.error('Error loading settings:', error);
            this.currentSettings = { ...this.defaultSettings };
        }
    }

    /**
     * Populate form with current settings
     */
    populateForm() {
        // Populate weights
        document.getElementById('efficiency-weight').value = this.currentSettings.weights.efficiency;
        document.getElementById('safety-weight').value = this.currentSettings.weights.safety;
        document.getElementById('value-weight').value = this.currentSettings.weights.valueForMoney;
        document.getElementById('perf-weight').value = this.currentSettings.weights.performancePerEfficiency;

        // Populate fuel prices
        document.getElementById('petrol-price').value = this.currentSettings.fuelPrices.petrol;
        document.getElementById('diesel-price').value = this.currentSettings.fuelPrices.diesel;
        document.getElementById('cng-price').value = this.currentSettings.fuelPrices.cng;
        document.getElementById('electricity-price').value = this.currentSettings.fuelPrices.electricity;

        // Update total weight display
        this.updateTotalWeight();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Weight inputs
        const weightInputs = document.querySelectorAll('.weight-input');
        weightInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateTotalWeight();
            });
        });

        // Save button
        document.getElementById('save-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetToDefaults();
        });

        // Analyze button
        document.getElementById('analyze-btn').addEventListener('click', () => {
            this.analyzeCurrentPage();
        });
    }

    /**
     * Update total weight display
     */
    updateTotalWeight() {
        const efficiency = parseInt(document.getElementById('efficiency-weight').value) || 0;
        const safety = parseInt(document.getElementById('safety-weight').value) || 0;
        const value = parseInt(document.getElementById('value-weight').value) || 0;
        const perf = parseInt(document.getElementById('perf-weight').value) || 0;

        const total = efficiency + safety + value + perf;
        const totalElement = document.getElementById('total-weight');

        totalElement.textContent = `Total: ${total}%`;

        if (total === 100) {
            totalElement.classList.remove('error');
        } else {
            totalElement.classList.add('error');
        }

        // Enable/disable save button based on valid total
        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = total !== 100;
    }

    /**
     * Save settings to storage
     */
    async saveSettings() {
        try {
            // Validate weights total 100
            const weights = this.getWeightsFromForm();
            const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

            if (total !== 100) {
                this.showStatus('Weights must total exactly 100%', 'error');
                return;
            }

            // Get fuel prices
            const fuelPrices = this.getFuelPricesFromForm();

            // Validate fuel prices
            if (!this.validateFuelPrices(fuelPrices)) {
                this.showStatus('Please enter valid fuel prices', 'error');
                return;
            }

            // Save to storage
            const settings = { weights, fuelPrices };
            await chrome.storage.sync.set({ carEfficiencySettings: settings });

            this.currentSettings = settings;
            this.showStatus('Settings saved successfully!', 'success');

            console.log('Settings saved:', settings);

        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Failed to save settings', 'error');
        }
    }

    /**
     * Get weights from form
     */
    getWeightsFromForm() {
        return {
            efficiency: parseInt(document.getElementById('efficiency-weight').value) || 0,
            safety: parseInt(document.getElementById('safety-weight').value) || 0,
            valueForMoney: parseInt(document.getElementById('value-weight').value) || 0,
            performancePerEfficiency: parseInt(document.getElementById('perf-weight').value) || 0
        };
    }

    /**
     * Get fuel prices from form
     */
    getFuelPricesFromForm() {
        return {
            petrol: parseFloat(document.getElementById('petrol-price').value) || 0,
            diesel: parseFloat(document.getElementById('diesel-price').value) || 0,
            cng: parseFloat(document.getElementById('cng-price').value) || 0,
            electricity: parseFloat(document.getElementById('electricity-price').value) || 0
        };
    }

    /**
     * Validate fuel prices
     */
    validateFuelPrices(prices) {
        return prices.petrol > 0 &&
            prices.diesel > 0 &&
            prices.cng > 0 &&
            prices.electricity > 0;
    }

    /**
     * Reset to default settings
     */
    resetToDefaults() {
        this.currentSettings = { ...this.defaultSettings };
        this.populateForm();
        this.showStatus('Reset to default values', 'success');
    }

    /**
     * Show status message
     */
    showStatus(message, type) {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        statusElement.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }

    /**
 * Check if current page is supported for analysis
 */
    async checkPageStatus() {
        const indicator = document.getElementById('page-status-indicator');
        const statusText = document.getElementById('page-status-text');
        const analyzeBtn = document.getElementById('analyze-btn');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('No active tab');
            }

            // Check if content script is available and page is supported
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'checkApiStatus'
            }).catch(() => null);

            if (response && response.pageSupported) {
                indicator.classList.add('connected');
                statusText.textContent = 'Car specification page detected';
                analyzeBtn.disabled = false;
            } else {
                indicator.classList.add('error');
                statusText.textContent = 'Not a car specification page';
                analyzeBtn.disabled = true;
            }

        } catch (error) {
            indicator.classList.add('error');
            statusText.textContent = 'Extension not active on this page';
            analyzeBtn.disabled = true;
        }
    }

    /**
     * Analyze current page
     */
    async analyzeCurrentPage() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const originalText = analyzeBtn.innerHTML;

        try {
            // Show loading state
            analyzeBtn.classList.add('loading');
            analyzeBtn.disabled = true;

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('No active tab found');
            }

            // Send message to content script to analyze page
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'analyzeCurrentPage'
            });

            if (response && response.success) {
                this.showStatus('Analysis started! Check the page for results.', 'success');

                // Close popup after a short delay to let user see the message
                setTimeout(() => {
                    window.close();
                }, 1500);
            } else {
                throw new Error('Failed to start analysis');
            }

        } catch (error) {
            console.error('Error analyzing page:', error);
            this.showStatus('Failed to analyze page. Make sure you\'re on a car specification page.', 'error');
        } finally {
            // Reset button state
            analyzeBtn.classList.remove('loading');
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = originalText;
        }
    }

    /**
     * Check API status
     */
    async checkApiStatus() {
        const indicator = document.getElementById('api-status-indicator');
        const statusText = document.getElementById('api-status-text');

        try {
            // Try to get active tab and check if content script is available
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                throw new Error('No active tab');
            }

            // Check if we can communicate with content script
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'checkApiStatus'
            }).catch(() => null);

            if (response && response.apiAvailable) {
                indicator.classList.add('connected');
                statusText.textContent = 'Gemini AI connected';
            } else {
                indicator.classList.add('error');
                statusText.textContent = 'Gemini API key required (see README)';
            }

        } catch (error) {
            indicator.classList.add('error');
            statusText.textContent = 'Extension not active on this page';
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CarEfficiencyPopup();
});

// Handle extension context menu or popup opening
chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
    if (message.action === 'refreshPopup') {
        location.reload();
    }
});

