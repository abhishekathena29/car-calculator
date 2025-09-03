// extractors/cardekho.js - CarDekho specific extractor

/**
 * CarDekho specific extractor that extends the generic extractor
 */
class CarDekhoExtractor extends CarEfficiencyExtractors.GenericExtractor {
    constructor() {
        super();
        this.name = 'cardekho';
    }

    /**
     * Check if this extractor can handle the current page
     */
    canExtract() {
        return window.location.hostname.includes('cardekho.com');
    }

    /**
     * Extract car specifications with CarDekho-specific selectors
     */
    extract() {
        // Start with generic extraction
        const spec = super.extract();

        // Enhance with CarDekho-specific extraction
        this.enhanceWithCarDekhoData(spec);

        return spec;
    }

    /**
     * Enhance specification data with CarDekho-specific selectors
     */
    enhanceWithCarDekhoData(spec) {
        // Try to get car name from CarDekho specific elements
        const carNameElement = document.querySelector('.car-name, .model-name, .car-title, h1.heading');
        if (carNameElement && !spec.carName) {
            spec.carName = carNameElement.textContent.trim();
        }

        // Extract mileage from CarDekho specification tables
        const mileage = this.extractFromSpecTable(['Mileage', 'ARAI Mileage', 'City Mileage', 'Highway Mileage']);
        if (mileage && !spec.mileage) {
            spec.mileage = mileage;
        }

        // Extract range for electric vehicles
        const range = this.extractFromSpecTable(['Range', 'Driving Range', 'ARAI Range', 'Electric Range']);
        if (range && !spec.range) {
            spec.range = range;
        }

        // Extract battery capacity
        const battery = this.extractFromSpecTable(['Battery Capacity', 'Battery', 'Battery Pack', 'kWh']);
        if (battery && !spec.batteryCapacity) {
            spec.batteryCapacity = battery;
        }

        // Extract power
        const power = this.extractFromSpecTable(['Max Power', 'Power', 'Peak Power', 'Maximum Power']);
        if (power && !spec.power) {
            spec.power = this.convertPowerToKW(power);
        }

        // Extract kerb weight
        const weight = this.extractFromSpecTable(['Kerb Weight', 'Curb Weight', 'Weight', 'Unladen Weight']);
        if (weight && !spec.kerbWeight) {
            spec.kerbWeight = weight;
        }

        // Extract safety features
        const airbags = this.extractFromSpecTable(['Airbags', 'No. of Airbags', 'Total Airbags', 'Air Bags']);
        if (airbags && !spec.airbags) {
            spec.airbags = airbags;
        }

        // Extract price from CarDekho price elements
        const price = this.extractCarDekhoPrice();
        if (price && !spec.price) {
            spec.price = price;
        }

        // Extract NCAP rating
        const ncap = this.extractFromSpecTable(['NCAP Rating', 'Safety Rating', 'Star Rating', 'Global NCAP']);
        if (ncap && !spec.ncapStars) {
            spec.ncapStars = ncap;
        }

        // Check for ESC/ESP in safety features
        if (!spec.esc) {
            spec.esc = this.checkSafetyFeature(['ESC', 'ESP', 'Electronic Stability Control', 'Electronic Stability Program']);
        }

        // Check for ISOFIX
        if (!spec.isofix) {
            spec.isofix = this.checkSafetyFeature(['ISOFIX', 'ISO FIX', 'Child Seat Anchor', 'ISOFIX Anchor Points']);
        }
    }

    /**
     * Extract value from CarDekho specification tables
     */
    extractFromSpecTable(labels) {
        // Try different table structures used by CarDekho
        const tableSelectors = [
            '.spec-table tr',
            '.specifications-table tr',
            '.car-specs-table tr',
            '.feature-table tr',
            'table tr'
        ];

        for (const selector of tableSelectors) {
            const rows = document.querySelectorAll(selector);

            for (const row of rows) {
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const labelCell = cells[0];
                    const valueCell = cells[1];

                    const labelText = labelCell.textContent.trim().toLowerCase();
                    const valueText = valueCell.textContent.trim();

                    for (const label of labels) {
                        if (labelText.includes(label.toLowerCase())) {
                            const numValue = CarEfficiencyUtils.parseNumber(valueText);
                            if (numValue !== null) {
                                return numValue;
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Extract price from CarDekho price elements
     */
    extractCarDekhoPrice() {
        const priceSelectors = [
            '.price-value',
            '.car-price',
            '.price-range',
            '.starting-price',
            '.ex-showroom-price',
            '[data-price]'
        ];

        for (const selector of priceSelectors) {
            const priceElement = document.querySelector(selector);
            if (priceElement) {
                const priceText = priceElement.textContent || priceElement.getAttribute('data-price');
                if (priceText) {
                    const price = this.parseCarDekhoPrice(priceText);
                    if (price) return price;
                }
            }
        }

        // Try to find price in structured data
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        for (const script of scripts) {
            try {
                const data = JSON.parse(script.textContent);
                if (data.offers && data.offers.price) {
                    const price = CarEfficiencyUtils.parseNumber(data.offers.price);
                    if (price && price > 100000) { // Convert to lakhs
                        return price / 100000;
                    }
                }
            } catch (e) {
                // Ignore JSON parsing errors
            }
        }

        return null;
    }

    /**
     * Parse CarDekho price format
     */
    parseCarDekhoPrice(priceText) {
        if (!priceText) return null;

        // Remove currency symbols and clean text
        let cleaned = priceText.replace(/[₹$,]/g, '').trim();

        // Handle "X.XX Lakh" or "X.XX Crore" format
        const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*lakh/i);
        if (lakhMatch) {
            return CarEfficiencyUtils.parseNumber(lakhMatch[1]);
        }

        const croreMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*crore/i);
        if (croreMatch) {
            return CarEfficiencyUtils.parseNumber(croreMatch[1]) * 100;
        }

        // Handle plain numbers (assume lakhs if reasonable range)
        const plainNumber = CarEfficiencyUtils.parseNumber(cleaned);
        if (plainNumber && plainNumber >= 3 && plainNumber <= 100) {
            return plainNumber;
        }

        return null;
    }

    /**
     * Convert power to kW if needed
     */
    convertPowerToKW(power) {
        if (!power) return null;

        // If the page text around power mentions HP/BHP, convert to kW
        const powerElements = document.querySelectorAll('*');
        for (const element of powerElements) {
            const text = element.textContent;
            if (text.includes(power.toString()) && (text.includes('hp') || text.includes('bhp'))) {
                return power * 0.746; // Convert HP to kW
            }
        }

        return power; // Assume already in kW
    }

    /**
     * Check if a safety feature is present
     */
    checkSafetyFeature(featureNames) {
        const safetyElements = document.querySelectorAll('.safety-features, .features-list, .spec-table, .car-features');

        for (const element of safetyElements) {
            const text = element.textContent.toLowerCase();
            for (const featureName of featureNames) {
                if (text.includes(featureName.toLowerCase())) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Extract fuel type with CarDekho-specific logic
     */
    extractFuelType(text) {
        // Try to get fuel type from CarDekho specific elements
        const fuelElements = document.querySelectorAll('.fuel-type, .engine-type, [data-fuel-type]');

        for (const element of fuelElements) {
            const fuelText = element.textContent || element.getAttribute('data-fuel-type');
            if (fuelText) {
                const fuelType = CarEfficiencyUtils.guessFuelType(fuelText);
                if (fuelType !== 'petrol') { // Only use if we found something specific
                    return fuelType;
                }
            }
        }

        // Fall back to generic extraction
        return super.extractFuelType(text);
    }
}

// Export the CarDekho extractor
window.CarEfficiencyExtractors = window.CarEfficiencyExtractors || {};
window.CarEfficiencyExtractors.CarDekhoExtractor = CarDekhoExtractor;

