// utils.js - Utility functions for the Car Efficiency extension

/**
 * Clamp a value between min and max
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Normalize a value from one range to 0-1
 */
function normalize(value, min, max) {
    if (max === min) return 0;
    return clamp((value - min) / (max - min), 0, 1);
}

/**
 * Parse a number from text, handling various formats
 */
function parseNumber(text) {
    if (!text) return null;

    // Remove common non-numeric characters but keep decimal points
    const cleaned = text.toString()
        .replace(/[^\d.-]/g, '')
        .replace(/,/g, '');

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

/**
 * Extract values by looking for labels in text
 */
function extractByLabels(text, labels, options = {}) {
    if (!text || !labels) return null;

    const {
        caseSensitive = false,
        multipleValues = false,
        numberOnly = true
    } = options;

    const searchText = caseSensitive ? text : text.toLowerCase();
    const results = [];

    for (const label of labels) {
        const searchLabel = caseSensitive ? label : label.toLowerCase();
        const regex = new RegExp(`${searchLabel}[\\s:]*([\\d.,]+(?:\\s*[a-zA-Z/]+)?)`, 'gi');

        let match;
        while ((match = regex.exec(searchText)) !== null) {
            const value = numberOnly ? parseNumber(match[1]) : match[1].trim();
            if (value !== null) {
                results.push(value);
                if (!multipleValues) break;
            }
        }

        if (results.length > 0 && !multipleValues) break;
    }

    return multipleValues ? results : (results[0] || null);
}

/**
 * Guess fuel type from text content
 */
function guessFuelType(text) {
    if (!text) return 'petrol'; // default

    const lowerText = text.toLowerCase();

    if (lowerText.includes('electric') || lowerText.includes('ev') || lowerText.includes('battery')) {
        return 'electric';
    }
    if (lowerText.includes('hybrid')) {
        return 'hybrid';
    }
    if (lowerText.includes('cng') || lowerText.includes('compressed natural gas')) {
        return 'cng';
    }
    if (lowerText.includes('diesel')) {
        return 'diesel';
    }

    return 'petrol';
}

/**
 * Get default settings
 */
function getDefaultSettings() {
    return {
        weights: {
            efficiency: 35,
            safety: 30,
            valueForMoney: 25,
            performancePerEfficiency: 10
        },
        fuelPrices: {
            petrol: 110, // ₹/litre
            diesel: 95,  // ₹/litre
            cng: 80,     // ₹/kg
            electricity: 9 // ₹/kWh
        }
    };
}

/**
 * Load settings from chrome storage
 */
async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get(['carEfficiencySettings']);
        const stored = result.carEfficiencySettings || {};
        const defaults = getDefaultSettings();

        // Merge with defaults
        return {
            weights: { ...defaults.weights, ...stored.weights },
            fuelPrices: { ...defaults.fuelPrices, ...stored.fuelPrices }
        };
    } catch (error) {
        console.error('Error loading settings:', error);
        return getDefaultSettings();
    }
}

/**
 * Save settings to chrome storage
 */
async function saveSettings(settings) {
    try {
        await chrome.storage.sync.set({ carEfficiencySettings: settings });
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 10000) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Clean and normalize text for processing
 */
function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s.,:-]/g, '')
        .trim();
}

/**
 * Extract numeric value with unit from text
 */
function extractValueWithUnit(text, units) {
    if (!text || !units) return null;

    const unitsPattern = units.join('|');
    const regex = new RegExp(`([\\d.,]+)\\s*(${unitsPattern})`, 'gi');
    const match = regex.exec(text);

    if (match) {
        return {
            value: parseNumber(match[1]),
            unit: match[2].toLowerCase()
        };
    }

    return null;
}

/**
 * Format number with Indian currency
 */
function formatCurrency(amount) {
    if (amount == null) return 'N/A';
    return `₹${amount.toFixed(2)}`;
}

/**
 * Format percentage
 */
function formatPercentage(value) {
    if (value == null) return 'N/A';
    return `${Math.round(value)}%`;
}

/**
 * Debounce function to limit API calls
 */
function debounce(func, wait) {
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
 * Check if current page is a car specification page
 */
function isCarSpecPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const content = document.body.textContent.toLowerCase();

    // Check for car-related keywords
    const carKeywords = [
        'specifications', 'specs', 'mileage', 'engine', 'fuel',
        'safety', 'features', 'price', 'variant', 'model'
    ];

    const hasCarKeywords = carKeywords.some(keyword =>
        title.includes(keyword) || content.includes(keyword)
    );

    // Check for car site URLs
    const isCarSite = url.includes('cardekho') || url.includes('carwale') ||
        url.includes('car') || url.includes('auto');

    return hasCarKeywords && isCarSite;
}

// Export functions for use in other modules
window.CarEfficiencyUtils = {
    clamp,
    normalize,
    parseNumber,
    extractByLabels,
    guessFuelType,
    getDefaultSettings,
    loadSettings,
    saveSettings,
    truncateText,
    cleanText,
    extractValueWithUnit,
    formatCurrency,
    formatPercentage,
    debounce,
    isCarSpecPage
};

