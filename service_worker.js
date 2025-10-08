// service_worker.js - Background service worker for Car Efficiency extension

/**
 * Extension lifecycle and background tasks
 */
class CarEfficiencyServiceWorker {
    constructor() {
        this.init();
    }

    /**
     * Initialize service worker
     */
    init() {
        console.log('Car Efficiency Service Worker: Initializing...');

        // Setup event listeners
        this.setupInstallListener();
        this.setupActivateListener();
        this.setupMessageListener();
        this.setupStorageListener();

        console.log('Car Efficiency Service Worker: Initialized');
    }

    /**
     * Handle extension installation
     */
    setupInstallListener() {
        chrome.runtime.onInstalled.addListener((details) => {
            console.log('Car Efficiency Extension installed:', details);

            // Initialize default settings on first install
            if (details.reason === 'install') {
                this.initializeDefaultSettings();
                this.showWelcomeNotification();
            } else if (details.reason === 'update') {
                this.handleUpdate(details);
            }
        });
    }

    /**
     * Handle service worker activation
     */
    setupActivateListener() {
        chrome.runtime.onStartup.addListener(() => {
            console.log('Car Efficiency Extension: Browser startup detected');
        });
    }

    /**
     * Setup message listener for communication with content scripts and popup
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Service Worker received message:', message);

            switch (message.action) {
                case 'checkApiStatus':
                    this.handleApiStatusCheck(sendResponse);
                    return true; // Keep message channel open for async response

                case 'getSettings':
                    this.handleGetSettings(sendResponse);
                    return true;

                case 'logError':
                    this.handleErrorLog(message.error, message.context);
                    break;

                case 'trackUsage':
                    this.handleUsageTracking(message.data);
                    break;

                default:
                    console.log('Unknown message action:', message.action);
            }
        });
    }

    /**
     * Setup storage change listener
     */
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.carEfficiencySettings) {
                console.log('Settings changed:', changes.carEfficiencySettings);
                // Content scripts will automatically detect storage changes
                // No need to notify them explicitly
            }
        });
    }

    /**
     * Initialize default settings
     */
    async initializeDefaultSettings() {
        try {
            const defaultSettings = {
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

            await chrome.storage.sync.set({
                carEfficiencySettings: defaultSettings,
                extensionVersion: chrome.runtime.getManifest().version,
                installDate: Date.now()
            });

            console.log('Default settings initialized');

        } catch (error) {
            console.error('Error initializing default settings:', error);
        }
    }

    /**
     * Show welcome notification on first install
     */
    showWelcomeNotification() {
        // Note: Chrome extensions have limited notification permissions
        // This would require additional permissions in manifest.json
        console.log('Welcome to Car Efficiency & Value Score extension!');
    }

    /**
     * Handle extension update
     */
    async handleUpdate(details) {
        try {
            const previousVersion = details.previousVersion;
            const currentVersion = chrome.runtime.getManifest().version;

            console.log(`Extension updated from ${previousVersion} to ${currentVersion}`);

            // Store update information
            await chrome.storage.sync.set({
                lastUpdateDate: Date.now(),
                previousVersion: previousVersion,
                extensionVersion: currentVersion
            });

            // Handle version-specific migrations if needed
            await this.handleVersionMigration(previousVersion, currentVersion);

        } catch (error) {
            console.error('Error handling update:', error);
        }
    }

    /**
     * Handle version-specific migrations
     */
    async handleVersionMigration(fromVersion, toVersion) {
        console.log(`Migrating from ${fromVersion} to ${toVersion}`);

        // Add version-specific migration logic here
        // For example, if settings structure changes between versions

        try {
            const result = await chrome.storage.sync.get(['carEfficiencySettings']);
            let settings = result.carEfficiencySettings || {};

            // Example migration logic (uncomment if needed):
            // if (fromVersion < '1.1.0') {
            //   // Add new settings or restructure existing ones
            //   settings.newFeature = defaultValue;
            // }

            await chrome.storage.sync.set({ carEfficiencySettings: settings });
            console.log('Migration completed successfully');

        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    /**
     * Handle API status check
     */
    async handleApiStatusCheck(sendResponse) {
        try {
            // Check if Gemini API key is configured
            // Note: In a production app, this would check a secure backend
            const apiAvailable = true; // Placeholder - actual check would be more complex

            sendResponse({
                apiAvailable,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error checking API status:', error);
            sendResponse({
                apiAvailable: false,
                error: error.message
            });
        }
    }

    /**
     * Handle get settings request
     */
    async handleGetSettings(sendResponse) {
        try {
            const result = await chrome.storage.sync.get(['carEfficiencySettings']);
            sendResponse({
                settings: result.carEfficiencySettings,
                success: true
            });

        } catch (error) {
            console.error('Error getting settings:', error);
            sendResponse({
                settings: null,
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Handle error logging
     */
    handleErrorLog(error, context) {
        console.error(`Extension Error [${context}]:`, error);

        // In production, you might want to send errors to an analytics service
        // or store them for debugging purposes
    }

    /**
     * Handle usage tracking
     */
    handleUsageTracking(data) {
        console.log('Usage tracking:', data);

        // In production, you might want to track:
        // - Pages analyzed
        // - Features used
        // - Performance metrics
        // - User preferences
    }


    /**
     * Clean up old data (called periodically)
     */
    async cleanupOldData() {
        try {
            // Clean up old cached data, logs, etc.
            const result = await chrome.storage.local.get(null);
            const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

            const keysToRemove = [];
            for (const [key, value] of Object.entries(result)) {
                if (key.startsWith('cache_') && value.timestamp < cutoffTime) {
                    keysToRemove.push(key);
                }
            }

            if (keysToRemove.length > 0) {
                await chrome.storage.local.remove(keysToRemove);
                console.log(`Cleaned up ${keysToRemove.length} old cache entries`);
            }

        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Initialize service worker
const serviceWorker = new CarEfficiencyServiceWorker();

// Set up periodic cleanup (every 24 hours)
chrome.alarms.create('cleanup', { periodInMinutes: 24 * 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
        serviceWorker.cleanupOldData();
    }
});

// Handle extension context menu (if needed in future)
// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === 'analyzeCarPage') {
//     chrome.tabs.sendMessage(tab.id, { action: 'analyzeCurrentPage' });
//   }
// });

console.log('Car Efficiency Service Worker: Ready');

