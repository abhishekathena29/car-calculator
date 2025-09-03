// content.js - Main content script for Car Efficiency extension

/**
 * Main extension controller
 */
class CarEfficiencyExtension {
    constructor() {
        this.overlayId = 'car-efficiency-overlay';
        this.isProcessing = false;
        this.currentSpec = null;
        this.currentScore = null;
        this.settings = null;

        // Debounced analyze function to prevent multiple rapid calls
        this.debouncedAnalyze = CarEfficiencyUtils.debounce(() => {
            this.analyzeCurrentPage();
        }, 2000);
    }

    /**
 * Initialize the extension
 */
    async init() {
        try {
            console.log('Car Efficiency Extension: Initializing...');

            // Load settings
            this.settings = await CarEfficiencyUtils.loadSettings();

            // Check if this is a car specification page
            if (!CarEfficiencyUtils.isCarSpecPage()) {
                console.log('Car Efficiency Extension: Not a car spec page, skipping');
                return;
            }

            // Listen for messages from popup/background script
            this.setupMessageListener();

            // Listen for settings changes
            this.setupSettingsListener();

            console.log('Car Efficiency Extension: Initialized successfully - waiting for user interaction');

        } catch (error) {
            console.error('Car Efficiency Extension: Initialization failed', error);
        }
    }

    /**
 * Setup message listener for communication with popup
 */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message);

            switch (message.action) {
                case 'analyzeCurrentPage':
                    this.analyzeCurrentPage();
                    sendResponse({ success: true });
                    break;

                case 'checkApiStatus':
                    sendResponse({
                        apiAvailable: true, // Will be determined by actual API call
                        pageSupported: CarEfficiencyUtils.isCarSpecPage()
                    });
                    break;

                case 'getCurrentSpec':
                    sendResponse({
                        spec: this.currentSpec,
                        score: this.currentScore
                    });
                    break;

                default:
                    console.log('Unknown message action:', message.action);
            }
        });
    }

    /**
     * Setup listener for settings changes
     */
    setupSettingsListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.carEfficiencySettings) {
                console.log('Settings changed, refreshing analysis...');
                this.settings = {
                    ...CarEfficiencyUtils.getDefaultSettings(),
                    ...changes.carEfficiencySettings.newValue
                };

                // Re-analyze if we have current spec
                if (this.currentSpec) {
                    this.calculateAndDisplayScore();
                }
            }
        });
    }

    /**
     * Analyze the current page for car specifications
     */
    async analyzeCurrentPage() {
        if (this.isProcessing) {
            console.log('Already processing, skipping...');
            return;
        }

        try {
            this.isProcessing = true;
            console.log('Car Efficiency Extension: Starting analysis...');

            // Remove existing overlay
            this.removeOverlay();

            // Choose appropriate extractor
            const extractor = this.getExtractor();
            if (!extractor) {
                console.log('No suitable extractor found');
                return;
            }

            // Extract specifications
            console.log(`Using ${extractor.name} extractor`);
            this.currentSpec = extractor.extract();

            if (!this.currentSpec) {
                console.log('No specifications extracted');
                return;
            }

            console.log('Extracted specifications:', this.currentSpec);

            // Calculate score
            this.calculateAndDisplayScore();

            // Fetch Gemini insights in background
            this.fetchGeminiInsights();

        } catch (error) {
            console.error('Error analyzing page:', error);
            this.showError('Failed to analyze car specifications');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get appropriate extractor for current page
     */
    getExtractor() {
        const extractors = [
            new CarEfficiencyExtractors.CarDekhoExtractor(),
            new CarEfficiencyExtractors.CarWaleExtractor(),
            new CarEfficiencyExtractors.GenericExtractor()
        ];

        for (const extractor of extractors) {
            if (extractor.canExtract()) {
                return extractor;
            }
        }

        return null;
    }

    /**
     * Calculate score and display overlay
     */
    calculateAndDisplayScore() {
        if (!this.currentSpec || !this.settings) {
            return;
        }

        try {
            // Calculate composite score
            this.currentScore = CarEfficiencyScoring.calculateCompositeScore(
                this.currentSpec,
                this.settings.weights,
                this.settings.fuelPrices
            );

            console.log('Calculated score:', this.currentScore);

            // Display overlay with score
            this.displayOverlay();

        } catch (error) {
            console.error('Error calculating score:', error);
            this.showError('Failed to calculate efficiency score');
        }
    }

    /**
     * Fetch Gemini insights asynchronously
     */
    async fetchGeminiInsights() {
        try {
            console.log('Fetching Gemini insights...');

            const geminiData = await CarEfficiencyGemini.fetchGeminiInsights(
                this.currentSpec,
                this.currentSpec._rawText || document.body.textContent
            );

            console.log('Gemini insights received:', geminiData);

            // Enhance spec with Gemini data
            if (geminiData.normalized) {
                const enhancedSpec = CarEfficiencyGemini.enhanceSpecWithGemini(
                    this.currentSpec,
                    geminiData
                );

                // Recalculate score with enhanced data
                if (JSON.stringify(enhancedSpec) !== JSON.stringify(this.currentSpec)) {
                    this.currentSpec = enhancedSpec;
                    this.calculateAndDisplayScore();
                }
            }

            // Add insights to overlay
            if (geminiData.insights && geminiData.insights.length > 0) {
                this.addInsightsToOverlay(geminiData.insights);
            }

        } catch (error) {
            console.error('Error fetching Gemini insights:', error);
            // Don't show error to user, just log it
        }
    }

    /**
     * Display the efficiency overlay
     */
    displayOverlay() {
        if (!this.currentScore || !this.currentSpec) {
            return;
        }

        // Remove existing overlay
        this.removeOverlay();

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.className = 'car-efficiency-overlay';

        // Build overlay content
        overlay.innerHTML = this.buildOverlayHTML();

        // Add to page
        document.body.appendChild(overlay);

        // Add click handler for close button
        const closeBtn = overlay.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.removeOverlay();
            });
        }

        // Add click handler for refresh button
        const refreshBtn = overlay.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.debouncedAnalyze();
            });
        }
    }

    /**
     * Build HTML content for overlay
     */
    buildOverlayHTML() {
        const score = this.currentScore;
        const spec = this.currentSpec;

        const scoreColor = this.getScoreColor(score.composite);

        return `
      <div class="overlay-header">
        <div class="overlay-title">
          <span class="car-icon">🚗</span>
          <span>Car Efficiency Score</span>
        </div>
        <div class="overlay-controls">
          <button class="refresh-btn" title="Refresh Analysis">🔄</button>
          <button class="close-btn" title="Close">✕</button>
        </div>
      </div>
      
      <div class="overlay-content">
        <div class="main-score" style="color: ${scoreColor}">
          <div class="score-value">${score.composite}</div>
          <div class="score-label">Overall Score</div>
        </div>
        
        <div class="score-breakdown">
          <div class="score-item">
            <span class="score-name">Efficiency</span>
            <div class="score-bar">
              <div class="score-fill" style="width: ${score.breakdown.efficiency}%"></div>
            </div>
            <span class="score-percent">${score.breakdown.efficiency}%</span>
          </div>
          
          <div class="score-item">
            <span class="score-name">Safety</span>
            <div class="score-bar">
              <div class="score-fill" style="width: ${score.breakdown.safety}%"></div>
            </div>
            <span class="score-percent">${score.breakdown.safety}%</span>
          </div>
          
          <div class="score-item">
            <span class="score-name">Value</span>
            <div class="score-bar">
              <div class="score-fill" style="width: ${score.breakdown.valueForMoney}%"></div>
            </div>
            <span class="score-percent">${score.breakdown.valueForMoney}%</span>
          </div>
          
          <div class="score-item">
            <span class="score-name">Perf/Eff</span>
            <div class="score-bar">
              <div class="score-fill" style="width: ${score.breakdown.performancePerEfficiency}%"></div>
            </div>
            <span class="score-percent">${score.breakdown.performancePerEfficiency}%</span>
          </div>
        </div>
        
        <div class="metrics">
          ${score.metrics.costPerKm ? `
            <div class="metric">
              <span class="metric-label">Cost/km:</span>
              <span class="metric-value">${CarEfficiencyUtils.formatCurrency(score.metrics.costPerKm)}</span>
            </div>
          ` : ''}
          
          ${score.metrics.powerToWeight ? `
            <div class="metric">
              <span class="metric-label">Power/Weight:</span>
              <span class="metric-value">${score.metrics.powerToWeight} kW/t</span>
            </div>
          ` : ''}
          
          ${spec.displacement ? `
            <div class="metric">
              <span class="metric-label">Engine:</span>
              <span class="metric-value">${spec.displacement}cc${spec.cylinders ? ` ${spec.cylinders}cyl` : ''}</span>
            </div>
          ` : ''}
          
          ${spec.transmissionType ? `
            <div class="metric">
              <span class="metric-label">Transmission:</span>
              <span class="metric-value">${spec.transmissionType.toUpperCase()}${spec.gears ? ` ${spec.gears}sp` : ''}</span>
            </div>
          ` : ''}
          
          ${spec.bodyType ? `
            <div class="metric">
              <span class="metric-label">Body:</span>
              <span class="metric-value">${spec.bodyType.charAt(0).toUpperCase() + spec.bodyType.slice(1)}</span>
            </div>
          ` : ''}
          
          ${spec.carName ? `
            <div class="metric">
              <span class="metric-label">Model:</span>
              <span class="metric-value">${spec.carName}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="insights-container" id="insights-container">
          <div class="insights-loading">Loading AI insights...</div>
        </div>
      </div>
    `;
    }

    /**
     * Add Gemini insights to overlay
     */
    addInsightsToOverlay(insights) {
        const container = document.getElementById('insights-container');
        if (!container) return;

        const formattedInsights = CarEfficiencyGemini.formatInsights(insights);

        if (formattedInsights.length === 0) {
            container.innerHTML = '<div class="no-insights">No AI insights available</div>';
            return;
        }

        let insightsHTML = '<div class="insights-title">AI Insights</div><ul class="insights-list">';

        formattedInsights.forEach(insight => {
            insightsHTML += `
        <li class="insight-item">
          <strong>${insight.title}:</strong> ${insight.detail}
        </li>
      `;
        });

        insightsHTML += '</ul>';
        container.innerHTML = insightsHTML;
    }

    /**
     * Get color for score display
     */
    getScoreColor(score) {
        if (score >= 80) return '#4CAF50'; // Green
        if (score >= 60) return '#FF9800'; // Orange
        return '#F44336'; // Red
    }

    /**
     * Remove overlay from page
     */
    removeOverlay() {
        const existing = document.getElementById(this.overlayId);
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        // Remove existing overlay
        this.removeOverlay();

        // Create error overlay
        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.className = 'car-efficiency-overlay error';

        overlay.innerHTML = `
      <div class="overlay-header">
        <div class="overlay-title">
          <span class="car-icon">⚠️</span>
          <span>Car Efficiency Extension</span>
        </div>
        <button class="close-btn" title="Close">✕</button>
      </div>
      <div class="overlay-content">
        <div class="error-message">${message}</div>
        <button class="retry-btn">Try Again</button>
      </div>
    `;

        document.body.appendChild(overlay);

        // Add event listeners
        overlay.querySelector('.close-btn').addEventListener('click', () => {
            this.removeOverlay();
        });

        overlay.querySelector('.retry-btn').addEventListener('click', () => {
            this.debouncedAnalyze();
        });
    }
}

// Initialize extension when script loads
let extensionInstance = null;

// Wait for all dependencies to load
function initializeExtension() {
    if (window.CarEfficiencyUtils &&
        window.CarEfficiencyScoring &&
        window.CarEfficiencyGemini &&
        window.CarEfficiencyExtractors) {

        if (!extensionInstance) {
            extensionInstance = new CarEfficiencyExtension();
            extensionInstance.init();
        }
    } else {
        // Retry after a short delay
        setTimeout(initializeExtension, 100);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
    initializeExtension();
}

