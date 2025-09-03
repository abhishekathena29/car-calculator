// extractors/carwale.js - CarWale specific extractor

/**
 * CarWale specific extractor that extends the generic extractor
 */
class CarWaleExtractor extends CarEfficiencyExtractors.GenericExtractor {
    constructor() {
        super();
        this.name = 'carwale';
    }

    /**
     * Check if this extractor can handle the current page
     */
    canExtract() {
        return window.location.hostname.includes('carwale.com');
    }

    /**
     * Extract car specifications with CarWale-specific selectors
     */
    extract() {
        // Start with generic extraction
        const spec = super.extract();

        // Enhance with CarWale-specific extraction
        this.enhanceWithCarWaleData(spec);

        return spec;
    }

    /**
     * Enhance specification data with CarWale-specific selectors
     */
    enhanceWithCarWaleData(spec) {
        // Try to get car name from CarWale specific elements
        const carNameElement = document.querySelector('.car-name, .model-name, .car-header h1, .vehicle-name');
        if (carNameElement && !spec.carName) {
            spec.carName = carNameElement.textContent.trim();
        }

        // Extract specifications from CarWale's structured data
        this.extractFromCarWaleSpecs(spec);

        // Extract price from CarWale price sections
        const price = this.extractCarWalePrice();
        if (price && !spec.price) {
            spec.price = price;
        }

        // Extract mileage from CarWale specific sections
        const mileage = this.extractCarWaleMileage();
        if (mileage && !spec.mileage) {
            spec.mileage = mileage;
        }

        // Extract safety rating from CarWale reviews
        const rating = this.extractCarWaleRating();
        if (rating && !spec.ncapStars) {
            spec.ncapStars = rating;
        }
    }

    /**
     * Extract specifications from CarWale's specification sections
     */
    extractFromCarWaleSpecs(spec) {
        // CarWale often uses definition lists for specifications
        const dlElements = document.querySelectorAll('dl, .spec-list, .specifications');

        for (const dl of dlElements) {
            const terms = dl.querySelectorAll('dt, .spec-term, .label');
            const definitions = dl.querySelectorAll('dd, .spec-value, .value');

            for (let i = 0; i < Math.min(terms.length, definitions.length); i++) {
                const term = terms[i].textContent.trim().toLowerCase();
                const value = definitions[i].textContent.trim();

                this.mapCarWaleSpec(spec, term, value);
            }
        }

        // Also try table format
        const tables = document.querySelectorAll('.specs-table, .specification-table, table');
        for (const table of tables) {
            const rows = table.querySelectorAll('tr');

            for (const row of rows) {
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const term = cells[0].textContent.trim().toLowerCase();
                    const value = cells[1].textContent.trim();

                    this.mapCarWaleSpec(spec, term, value);
                }
            }
        }
    }

    /**
     * Map CarWale specification terms to our spec object
     */
    mapCarWaleSpec(spec, term, value) {
        const numValue = CarEfficiencyUtils.parseNumber(value);

        // Mileage/Efficiency
        if (term.includes('mileage') || term.includes('fuel efficiency') || term.includes('arai')) {
            if (!spec.mileage && numValue) spec.mileage = numValue;
        }

        // Range (for EVs)
        else if (term.includes('range') || term.includes('driving range')) {
            if (!spec.range && numValue) spec.range = numValue;
        }

        // Battery capacity
        else if (term.includes('battery') && (term.includes('capacity') || term.includes('kwh'))) {
            if (!spec.batteryCapacity && numValue) spec.batteryCapacity = numValue;
        }

        // Power
        else if (term.includes('power') && (term.includes('max') || term.includes('peak'))) {
            if (!spec.power && numValue) {
                // Convert HP to kW if needed
                spec.power = value.toLowerCase().includes('hp') ? numValue * 0.746 : numValue;
            }
        }

        // Weight
        else if (term.includes('weight') && (term.includes('kerb') || term.includes('curb'))) {
            if (!spec.kerbWeight && numValue) spec.kerbWeight = numValue;
        }

        // Airbags
        else if (term.includes('airbag')) {
            if (!spec.airbags && numValue) spec.airbags = numValue;
        }

        // Safety features
        else if (term.includes('esc') || term.includes('esp') || term.includes('stability')) {
            if (!spec.esc) spec.esc = true;
        }

        else if (term.includes('isofix')) {
            if (!spec.isofix) spec.isofix = true;
        }
    }

    /**
     * Extract price from CarWale price sections
     */
    extractCarWalePrice() {
        const priceSelectors = [
            '.price-value',
            '.car-price',
            '.price-section .price',
            '.starting-price',
            '.price-range .from',
            '[data-price]'
        ];

        for (const selector of priceSelectors) {
            const priceElement = document.querySelector(selector);
            if (priceElement) {
                const priceText = priceElement.textContent || priceElement.getAttribute('data-price');
                if (priceText) {
                    const price = this.parseCarWalePrice(priceText);
                    if (price) return price;
                }
            }
        }

        // Look for price in script tags (structured data)
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            const content = script.textContent;
            if (content.includes('price') && content.includes('lakh')) {
                const priceMatch = content.match(/price['":\s]*(\d+(?:\.\d+)?)['":\s]*lakh/i);
                if (priceMatch) {
                    return CarEfficiencyUtils.parseNumber(priceMatch[1]);
                }
            }
        }

        return null;
    }

    /**
     * Parse CarWale price format
     */
    parseCarWalePrice(priceText) {
        if (!priceText) return null;

        // Clean the price text
        let cleaned = priceText.replace(/[₹$,]/g, '').trim();

        // Handle "Rs X.XX Lakh" format
        const rsLakhMatch = cleaned.match(/rs\.?\s*(\d+(?:\.\d+)?)\s*lakh/i);
        if (rsLakhMatch) {
            return CarEfficiencyUtils.parseNumber(rsLakhMatch[1]);
        }

        // Handle "X.XX Lakh" format
        const lakhMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*lakh/i);
        if (lakhMatch) {
            return CarEfficiencyUtils.parseNumber(lakhMatch[1]);
        }

        // Handle "X.XX Crore" format
        const croreMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*crore/i);
        if (croreMatch) {
            return CarEfficiencyUtils.parseNumber(croreMatch[1]) * 100;
        }

        // Handle plain numbers in reasonable range
        const plainNumber = CarEfficiencyUtils.parseNumber(cleaned);
        if (plainNumber && plainNumber >= 3 && plainNumber <= 100) {
            return plainNumber;
        }

        return null;
    }

    /**
     * Extract mileage from CarWale specific sections
     */
    extractCarWaleMileage() {
        // Look for mileage in CarWale's key specs section
        const keySpecs = document.querySelector('.key-specs, .quick-specs, .overview-specs');
        if (keySpecs) {
            const mileageElement = keySpecs.querySelector('[data-mileage], .mileage-value, .fuel-efficiency');
            if (mileageElement) {
                const mileageText = mileageElement.textContent || mileageElement.getAttribute('data-mileage');
                return CarEfficiencyUtils.parseNumber(mileageText);
            }
        }

        // Look in comparison tables
        const compTables = document.querySelectorAll('.comparison-table, .compare-specs');
        for (const table of compTables) {
            const mileageRow = table.querySelector('tr:contains("Mileage"), tr:contains("Fuel Efficiency")');
            if (mileageRow) {
                const valueCell = mileageRow.querySelector('td:last-child');
                if (valueCell) {
                    return CarEfficiencyUtils.parseNumber(valueCell.textContent);
                }
            }
        }

        return null;
    }

    /**
     * Extract safety rating from CarWale
     */
    extractCarWaleRating() {
        // Look for NCAP ratings in CarWale reviews/safety sections
        const safetySection = document.querySelector('.safety-rating, .ncap-rating, .star-rating');
        if (safetySection) {
            const ratingText = safetySection.textContent;
            const starMatch = ratingText.match(/(\d)\s*star/i);
            if (starMatch) {
                return CarEfficiencyUtils.parseNumber(starMatch[1]);
            }
        }

        // Look for ratings in structured data
        const ratingElements = document.querySelectorAll('[data-rating], .rating-value');
        for (const element of ratingElements) {
            const rating = element.textContent || element.getAttribute('data-rating');
            const numRating = CarEfficiencyUtils.parseNumber(rating);
            if (numRating && numRating >= 1 && numRating <= 5) {
                return numRating;
            }
        }

        return null;
    }

    /**
     * Extract fuel type with CarWale-specific logic
     */
    extractFuelType(text) {
        // Look for fuel type in CarWale's variant selector or specs
        const fuelElements = document.querySelectorAll('.fuel-type, .variant-fuel, .engine-fuel');

        for (const element of fuelElements) {
            const fuelText = element.textContent;
            if (fuelText) {
                const fuelType = CarEfficiencyUtils.guessFuelType(fuelText);
                if (fuelType !== 'petrol') { // Only use if we found something specific
                    return fuelType;
                }
            }
        }

        // Check variant dropdown options
        const variantOptions = document.querySelectorAll('.variant-option, option[value*="fuel"]');
        for (const option of variantOptions) {
            const optionText = option.textContent || option.value;
            if (optionText) {
                const fuelType = CarEfficiencyUtils.guessFuelType(optionText);
                if (fuelType !== 'petrol') {
                    return fuelType;
                }
            }
        }

        // Fall back to generic extraction
        return super.extractFuelType(text);
    }
}

// Export the CarWale extractor
window.CarEfficiencyExtractors = window.CarEfficiencyExtractors || {};
window.CarEfficiencyExtractors.CarWaleExtractor = CarWaleExtractor;

