// extractors/generic.js - Generic car specification extractor

/**
 * Generic extractor for car specifications from any website
 */
class GenericExtractor {
    constructor() {
        this.name = 'generic';
    }

    /**
     * Check if this extractor can handle the current page
     */
    canExtract() {
        return CarEfficiencyUtils.isCarSpecPage();
    }

    /**
     * Extract car specifications from the page
     */
    extract() {
        const pageText = document.body.textContent;
        const pageHTML = document.body.innerHTML;

        const spec = {
            // Basic info
            carName: this.extractCarName(),
            fuelType: this.extractFuelType(pageText),

            // Efficiency metrics
            mileage: this.extractMileage(pageText),
            range: this.extractRange(pageText),
            batteryCapacity: this.extractBatteryCapacity(pageText),

            // Engine specifications
            displacement: this.extractDisplacement(pageText),
            cylinders: this.extractCylinders(pageText),
            power: this.extractPower(pageText),
            torque: this.extractTorque(pageText),

            // Transmission specifications
            transmissionType: this.extractTransmissionType(pageText),
            gears: this.extractGears(pageText),

            // Physical specifications
            kerbWeight: this.extractKerbWeight(pageText),
            length: this.extractLength(pageText),
            width: this.extractWidth(pageText),
            height: this.extractHeight(pageText),
            groundClearance: this.extractGroundClearance(pageText),
            bodyType: this.extractBodyType(pageText),

            // Safety metrics
            ncapStars: this.extractNCAPStars(pageText),
            airbags: this.extractAirbags(pageText),
            esc: this.extractESC(pageText),
            isofix: this.extractISOFIX(pageText),

            // Pricing
            price: this.extractPrice(pageText),

            // Additional metadata
            _rawText: CarEfficiencyUtils.truncateText(pageText, 15000),
            _url: window.location.href,
            _timestamp: Date.now()
        };

        return CarEfficiencyScoring.validateSpec(spec);
    }

    /**
     * Extract car name from page title or headings
     */
    extractCarName() {
        // Try page title first
        const title = document.title;
        if (title) {
            // Clean up title
            const cleaned = title.replace(/\s*[-|]\s*.*/g, '').trim();
            if (cleaned.length > 0) return cleaned;
        }

        // Try main headings
        const headings = document.querySelectorAll('h1, h2, .car-name, .model-name');
        for (const heading of headings) {
            const text = heading.textContent.trim();
            if (text.length > 0 && text.length < 100) {
                return text;
            }
        }

        return 'Unknown Car';
    }

    /**
     * Extract fuel type from page text
     */
    extractFuelType(text) {
        return CarEfficiencyUtils.guessFuelType(text);
    }

    /**
     * Extract mileage/fuel efficiency
     */
    extractMileage(text) {
        const mileageLabels = [
            'mileage', 'fuel efficiency', 'fuel economy', 'kmpl', 'km/l',
            'arai mileage', 'city mileage', 'highway mileage', 'combined mileage'
        ];

        return CarEfficiencyUtils.extractByLabels(text, mileageLabels);
    }

    /**
     * Extract electric vehicle range
     */
    extractRange(text) {
        const rangeLabels = [
            'range', 'driving range', 'electric range', 'ev range',
            'arai range', 'claimed range', 'real world range'
        ];

        const range = CarEfficiencyUtils.extractByLabels(text, rangeLabels);

        // Look for km specifically
        if (!range) {
            const kmMatch = text.match(/(\d+)\s*km/gi);
            if (kmMatch) {
                const values = kmMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                // Return the largest reasonable range value (100-1000 km)
                const reasonableRanges = values.filter(v => v >= 100 && v <= 1000);
                if (reasonableRanges.length > 0) {
                    return Math.max(...reasonableRanges);
                }
            }
        }

        return range;
    }

    /**
     * Extract battery capacity
     */
    extractBatteryCapacity(text) {
        const batteryLabels = [
            'battery capacity', 'battery', 'kwh', 'kWh', 'battery pack',
            'lithium ion', 'li-ion battery'
        ];

        const capacity = CarEfficiencyUtils.extractByLabels(text, batteryLabels);

        // Look for kWh specifically
        if (!capacity) {
            const kwhMatch = text.match(/(\d+(?:\.\d+)?)\s*kwh/gi);
            if (kwhMatch) {
                const values = kwhMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                // Return the largest reasonable battery capacity (10-200 kWh)
                const reasonableCapacities = values.filter(v => v >= 10 && v <= 200);
                if (reasonableCapacities.length > 0) {
                    return Math.max(...reasonableCapacities);
                }
            }
        }

        return capacity;
    }

    /**
     * Extract engine power
     */
    extractPower(text) {
        const powerLabels = [
            'power', 'max power', 'peak power', 'bhp', 'hp', 'kw',
            'horsepower', 'brake horsepower'
        ];

        let power = CarEfficiencyUtils.extractByLabels(text, powerLabels);

        // Convert HP to kW if needed (1 HP = 0.746 kW)
        if (power && text.toLowerCase().includes('hp') && !text.toLowerCase().includes('kw')) {
            power = power * 0.746;
        }

        return power;
    }

    /**
     * Extract kerb weight
     */
    extractKerbWeight(text) {
        const weightLabels = [
            'kerb weight', 'curb weight', 'weight', 'gross weight',
            'unladen weight', 'dry weight'
        ];

        return CarEfficiencyUtils.extractByLabels(text, weightLabels);
    }

    /**
     * Extract NCAP safety rating
     */
    extractNCAPStars(text) {
        const ncapLabels = [
            'ncap rating', 'ncap stars', 'safety rating', 'star rating',
            'global ncap', 'euro ncap', 'iihs rating'
        ];

        let stars = CarEfficiencyUtils.extractByLabels(text, ncapLabels);

        // Look for "X star" pattern
        if (!stars) {
            const starMatch = text.match(/(\d)\s*star/gi);
            if (starMatch) {
                const values = starMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                const validRatings = values.filter(v => v >= 1 && v <= 5);
                if (validRatings.length > 0) {
                    stars = Math.max(...validRatings);
                }
            }
        }

        return stars;
    }

    /**
     * Extract number of airbags
     */
    extractAirbags(text) {
        const airbagLabels = [
            'airbags', 'air bags', 'airbag', 'dual airbags',
            'front airbags', 'side airbags', 'curtain airbags'
        ];

        let airbags = CarEfficiencyUtils.extractByLabels(text, airbagLabels);

        // Look for "X airbags" pattern
        if (!airbags) {
            const airbagMatch = text.match(/(\d+)\s*airbags?/gi);
            if (airbagMatch) {
                const values = airbagMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                const validCounts = values.filter(v => v >= 1 && v <= 10);
                if (validCounts.length > 0) {
                    airbags = Math.max(...validCounts);
                }
            }
        }

        return airbags;
    }

    /**
     * Extract ESC/ESP availability
     */
    extractESC(text) {
        const escKeywords = [
            'esc', 'esp', 'electronic stability', 'stability control',
            'electronic stability control', 'electronic stability program',
            'vehicle stability', 'traction control'
        ];

        const lowerText = text.toLowerCase();
        return escKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Extract ISOFIX availability
     */
    extractISOFIX(text) {
        const isofixKeywords = [
            'isofix', 'iso fix', 'child seat anchor', 'latch system',
            'child seat mounting', 'isofix anchor'
        ];

        const lowerText = text.toLowerCase();
        return isofixKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
 * Extract engine displacement
 */
    extractDisplacement(text) {
        const displacementLabels = [
            'displacement', 'engine capacity', 'cc', 'cubic capacity',
            'engine size', 'capacity'
        ];

        let displacement = CarEfficiencyUtils.extractByLabels(text, displacementLabels);

        // Look for cc pattern specifically
        if (!displacement) {
            const ccMatch = text.match(/(\d{3,4})\s*cc/gi);
            if (ccMatch) {
                const values = ccMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                const reasonableDisplacements = values.filter(v => v >= 800 && v <= 3000);
                if (reasonableDisplacements.length > 0) {
                    displacement = reasonableDisplacements[0];
                }
            }
        }

        return displacement;
    }

    /**
     * Extract number of cylinders
     */
    extractCylinders(text) {
        const cylinderLabels = [
            'cylinders', 'cylinder', 'no. of cylinders', 'number of cylinders'
        ];

        let cylinders = CarEfficiencyUtils.extractByLabels(text, cylinderLabels);

        // Look for "X cylinder" pattern
        if (!cylinders) {
            const cylinderMatch = text.match(/(\d)\s*cylinder/gi);
            if (cylinderMatch) {
                const values = cylinderMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                const validCylinders = values.filter(v => v >= 3 && v <= 8);
                if (validCylinders.length > 0) {
                    cylinders = validCylinders[0];
                }
            }
        }

        return cylinders;
    }

    /**
     * Extract torque
     */
    extractTorque(text) {
        const torqueLabels = [
            'torque', 'max torque', 'peak torque', 'maximum torque', 'nm'
        ];

        let torque = CarEfficiencyUtils.extractByLabels(text, torqueLabels);

        // Look for Nm pattern specifically
        if (!torque) {
            const nmMatch = text.match(/(\d+(?:\.\d+)?)\s*nm/gi);
            if (nmMatch) {
                const values = nmMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                const reasonableTorque = values.filter(v => v >= 80 && v <= 600);
                if (reasonableTorque.length > 0) {
                    torque = Math.max(...reasonableTorque);
                }
            }
        }

        return torque;
    }

    /**
     * Extract transmission type
     */
    extractTransmissionType(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('cvt')) return 'cvt';
        if (lowerText.includes('amt')) return 'amt';
        if (lowerText.includes('dct') || lowerText.includes('dual clutch')) return 'dct';
        if (lowerText.includes('automatic')) return 'automatic';
        if (lowerText.includes('manual')) return 'manual';
        if (lowerText.includes('hybrid')) return 'hybrid';

        return 'manual'; // Default assumption
    }

    /**
     * Extract number of gears
     */
    extractGears(text) {
        const gearLabels = [
            'gears', 'gear', 'speed', 'transmission'
        ];

        let gears = CarEfficiencyUtils.extractByLabels(text, gearLabels);

        // Look for "X speed" or "X gear" pattern
        if (!gears) {
            const gearMatch = text.match(/(\d)\s*(?:speed|gear)/gi);
            if (gearMatch) {
                const values = gearMatch.map(m => CarEfficiencyUtils.parseNumber(m));
                const validGears = values.filter(v => v >= 4 && v <= 10);
                if (validGears.length > 0) {
                    gears = Math.max(...validGears);
                }
            }
        }

        return gears;
    }

    /**
     * Extract vehicle length
     */
    extractLength(text) {
        const lengthLabels = [
            'length', 'overall length', 'l x w x h', 'dimensions'
        ];

        let length = CarEfficiencyUtils.extractByLabels(text, lengthLabels);

        // Look for dimensions pattern (L x W x H)
        if (!length) {
            const dimMatch = text.match(/(\d{4})\s*(?:x|\*|×)\s*\d{4}\s*(?:x|\*|×)\s*\d{4}/gi);
            if (dimMatch) {
                const lengthValue = CarEfficiencyUtils.parseNumber(dimMatch[0].split(/[x*×]/)[0]);
                if (lengthValue >= 3000 && lengthValue <= 6000) {
                    length = lengthValue;
                }
            }
        }

        return length;
    }

    /**
     * Extract vehicle width
     */
    extractWidth(text) {
        const widthLabels = [
            'width', 'overall width'
        ];

        let width = CarEfficiencyUtils.extractByLabels(text, widthLabels);

        // Look for dimensions pattern (L x W x H)
        if (!width) {
            const dimMatch = text.match(/\d{4}\s*(?:x|\*|×)\s*(\d{4})\s*(?:x|\*|×)\s*\d{4}/gi);
            if (dimMatch) {
                const widthValue = CarEfficiencyUtils.parseNumber(dimMatch[0].split(/[x*×]/)[1]);
                if (widthValue >= 1500 && widthValue <= 2200) {
                    width = widthValue;
                }
            }
        }

        return width;
    }

    /**
     * Extract vehicle height
     */
    extractHeight(text) {
        const heightLabels = [
            'height', 'overall height'
        ];

        let height = CarEfficiencyUtils.extractByLabels(text, heightLabels);

        // Look for dimensions pattern (L x W x H)
        if (!height) {
            const dimMatch = text.match(/\d{4}\s*(?:x|\*|×)\s*\d{4}\s*(?:x|\*|×)\s*(\d{4})/gi);
            if (dimMatch) {
                const heightValue = CarEfficiencyUtils.parseNumber(dimMatch[0].split(/[x*×]/)[2]);
                if (heightValue >= 1300 && heightValue <= 2000) {
                    height = heightValue;
                }
            }
        }

        return height;
    }

    /**
     * Extract ground clearance
     */
    extractGroundClearance(text) {
        const clearanceLabels = [
            'ground clearance', 'clearance', 'minimum ground clearance'
        ];

        return CarEfficiencyUtils.extractByLabels(text, clearanceLabels);
    }

    /**
     * Extract body type
     */
    extractBodyType(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('hatchback')) return 'hatchback';
        if (lowerText.includes('sedan')) return 'sedan';
        if (lowerText.includes('suv')) return 'suv';
        if (lowerText.includes('mpv') || lowerText.includes('muv')) return 'mpv';
        if (lowerText.includes('crossover')) return 'crossover';
        if (lowerText.includes('coupe')) return 'coupe';
        if (lowerText.includes('convertible')) return 'convertible';

        // Try to infer from URL or title
        const url = window.location.href.toLowerCase();
        const title = document.title.toLowerCase();

        if (url.includes('hatchback') || title.includes('hatchback')) return 'hatchback';
        if (url.includes('sedan') || title.includes('sedan')) return 'sedan';
        if (url.includes('suv') || title.includes('suv')) return 'suv';

        return 'sedan'; // Default assumption
    }

    /**
     * Extract price
     */
    extractPrice(text) {
        const priceLabels = [
            'price', 'cost', 'starting price', 'ex-showroom',
            'on-road price', 'launch price', 'expected price'
        ];

        let price = CarEfficiencyUtils.extractByLabels(text, priceLabels);

        // Look for ₹ symbol with numbers
        if (!price) {
            const rupeeMatch = text.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh|crore)?/gi);
            if (rupeeMatch) {
                const values = rupeeMatch.map(match => {
                    const numStr = match.replace(/[₹,]/g, '').trim();
                    const num = CarEfficiencyUtils.parseNumber(numStr);

                    // Convert crore to lakh
                    if (match.toLowerCase().includes('crore')) {
                        return num * 100;
                    }

                    return num;
                });

                // Return the most reasonable price (3-100 lakh)
                const reasonablePrices = values.filter(v => v >= 3 && v <= 100);
                if (reasonablePrices.length > 0) {
                    price = Math.min(...reasonablePrices); // Take the lowest price (base variant)
                }
            }
        }

        return price;
    }
}

// Export the generic extractor
window.CarEfficiencyExtractors = window.CarEfficiencyExtractors || {};
window.CarEfficiencyExtractors.GenericExtractor = GenericExtractor;

