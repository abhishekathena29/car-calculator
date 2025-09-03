// scoring.js - Car efficiency and value scoring model

/**
 * Normalization ranges for different metrics
 */
const NORMALIZATION_RANGES = {
    // Fuel efficiency ranges
    ice_kmpl: { min: 10, max: 25 },
    cng_kmkg: { min: 18, max: 32 },
    hybrid_kmpl: { min: 18, max: 28 },
    ev_kmkwh: { min: 5, max: 9 },

    // Engine parameters
    displacement: { min: 800, max: 2500 }, // cc
    cylinders: { min: 3, max: 8 },
    power: { min: 50, max: 300 }, // bhp
    torque: { min: 80, max: 500 }, // Nm

    // Transmission parameters
    gears: { min: 4, max: 10 },

    // Physical parameters
    weight: { min: 800, max: 2500 }, // kg
    length: { min: 3500, max: 5500 }, // mm
    width: { min: 1500, max: 2000 }, // mm
    height: { min: 1400, max: 1900 }, // mm
    ground_clearance: { min: 140, max: 220 }, // mm

    // Power to weight ratio (kW/tonne)
    power_to_weight: { min: 50, max: 120 },

    // Price range (₹ lakh)
    price_lakh: { min: 6, max: 50 }
};

/**
 * Real-world correction factors
 */
const REAL_WORLD_FACTORS = {
    ice: 0.8,
    hybrid: 0.85,
    cng: 0.8,
    ev: 0.75 // Applied to range, then divided by battery capacity
};

/**
 * Efficiency calculation weights for different parameters
 */
const EFFICIENCY_WEIGHTS = {
    // Engine parameters (40% total weight)
    displacement: 0.20,     // Larger displacement = lower efficiency (major factor)
    cylinders: 0.10,        // More cylinders = lower efficiency
    power_density: 0.06,    // Power per liter of displacement
    torque_efficiency: 0.04, // Torque per unit displacement

    // Transmission parameters (15% total weight)
    transmission_type: 0.10, // Manual vs Auto vs CVT efficiency
    gear_count: 0.05,       // More gears = better optimization

    // Physical design parameters (25% total weight)
    weight_factor: 0.15,    // Lighter = more efficient (major factor)
    aerodynamic_factor: 0.06, // Length/width ratio, ground clearance
    body_type_factor: 0.04, // Hatchback vs SUV vs Sedan

    // Fuel system parameters (20% total weight)
    fuel_type_advantage: 0.20 // Diesel > Hybrid > Petrol > CNG efficiency
};

/**
 * Transmission efficiency multipliers (more conservative)
 */
const TRANSMISSION_EFFICIENCY = {
    'manual': 1.0,
    'amt': 0.97,
    'cvt': 1.03,
    'automatic': 0.92,
    'dct': 0.96,
    'hybrid': 1.08
};

/**
 * Body type efficiency factors (more conservative)
 */
const BODY_TYPE_EFFICIENCY = {
    'hatchback': 1.0,
    'sedan': 0.96,
    'suv': 0.80,
    'mpv': 0.85,
    'crossover': 0.88,
    'coupe': 0.94,
    'convertible': 0.86
};

/**
 * Calculate efficiency penalty based on car parameters
 * Uses a penalty-based system where cars start from baseline and lose points
 */
function calculateEfficiencyPenalty(spec) {
    const {
        displacement, cylinders, power, torque, gears,
        transmissionType, kerbWeight, length, width, height,
        groundClearance, bodyType, fuelType
    } = spec;

    let totalPenalty = 0; // Start with no penalty

    // 1. Displacement Penalty (Major Factor)
    if (displacement) {
        if (displacement > 1500) {
            totalPenalty += Math.min((displacement - 1500) / 100 * 2.5, 25); // Up to 25 point penalty
        } else if (displacement > 1200) {
            totalPenalty += (displacement - 1200) / 100 * 1.5; // Penalty even for 1.2L+ engines
        } else if (displacement < 1000) {
            totalPenalty -= Math.min((1000 - displacement) / 100 * 2, 10); // Up to 10 point bonus for small engines
        }
    }

    // 2. Weight Penalty (Major Factor)
    if (kerbWeight) {
        if (kerbWeight > 1200) {
            totalPenalty += Math.min((kerbWeight - 1200) / 100 * 4, 30); // Up to 30 point penalty
        } else if (kerbWeight > 1000) {
            totalPenalty += (kerbWeight - 1000) / 100 * 2; // Penalty even for 1000kg+ cars
        } else if (kerbWeight < 900) {
            totalPenalty -= Math.min((900 - kerbWeight) / 100 * 3, 12); // Up to 12 point bonus for very light cars
        }
    }

    // 3. Cylinder Penalty
    if (cylinders) {
        if (cylinders > 4) {
            totalPenalty += (cylinders - 4) * 3; // 3 points per extra cylinder
        }
    }

    // 4. Body Type Penalty
    const bodyTypePenalties = {
        'hatchback': 2,  // Even hatchbacks get small penalty (only Alto K10 gets 0)
        'sedan': 5,
        'crossover': 10,
        'mpv': 15,
        'suv': 20,
        'coupe': 7,
        'convertible': 12
    };
    const bodyTypeKey = (bodyType || 'sedan').toLowerCase();
    totalPenalty += bodyTypePenalties[bodyTypeKey] || 7;

    // 5. Transmission Penalty
    const transmissionPenalties = {
        'manual': 0,
        'amt': 2,
        'cvt': -1, // CVT gets small bonus
        'dct': 3,
        'automatic': 5,
        'hybrid': -3 // Hybrid gets bonus
    };
    const transmissionKey = (transmissionType || 'manual').toLowerCase();
    totalPenalty += transmissionPenalties[transmissionKey] || 2;

    // 6. Power-to-Weight Penalty (for overpowered cars)
    if (power && kerbWeight) {
        const powerToWeight = (power * 0.746) / (kerbWeight / 1000); // kW per tonne
        if (powerToWeight > 80) {
            totalPenalty += Math.min((powerToWeight - 80) / 10 * 2, 12); // Penalty for excessive power
        }
    }

    // 7. Ground Clearance Penalty (aerodynamics)
    if (groundClearance) {
        if (groundClearance > 180) {
            totalPenalty += Math.min((groundClearance - 180) / 10, 8); // High SUV penalty
        }
    }

    // 8. Gear Count Bonus (more gears = better optimization)
    if (gears && gears >= 6) {
        totalPenalty -= Math.min((gears - 5), 3); // Small bonus for 6+ gears
    }

    return Math.max(0, totalPenalty); // Don't allow negative total penalty
}

/**
 * Calculate real-world efficiency
 */
function calculateRealWorldEfficiency(spec) {
    const { fuelType, mileage, range, batteryCapacity } = spec;

    // If we have actual mileage data, use it with corrections
    if (mileage) {
        switch (fuelType) {
            case 'petrol':
            case 'diesel':
                return mileage * REAL_WORLD_FACTORS.ice;
            case 'hybrid':
                return mileage * REAL_WORLD_FACTORS.hybrid;
            case 'cng':
                return mileage * REAL_WORLD_FACTORS.cng;
            default:
                return mileage * REAL_WORLD_FACTORS.ice;
        }
    }

    // For electric vehicles with range and battery data
    if (fuelType === 'electric' && range && batteryCapacity) {
        const realWorldRange = range * REAL_WORLD_FACTORS.ev;
        return realWorldRange / batteryCapacity;
    }

    // If no mileage data, estimate using penalty-based system
    const efficiencyPenalty = calculateEfficiencyPenalty(spec);

    // Base efficiency estimates by fuel type (km/l or km/kg or km/kWh)
    // These are realistic baseline values for well-optimized cars of each fuel type
    const baseEfficiency = {
        'petrol': 16,    // Good petrol car baseline (like Swift)
        'diesel': 20,    // Good diesel car baseline
        'hybrid': 23,    // Good hybrid car baseline
        'cng': 25,       // Good CNG car baseline
        'electric': 6.0  // Good EV baseline km/kWh
    };

    const baseFuelEfficiency = baseEfficiency[fuelType] || baseEfficiency['petrol'];

    // Apply penalty (each penalty point reduces efficiency by ~1.5%)
    const penaltyFactor = Math.max(0.4, 1 - (efficiencyPenalty * 0.015));
    const estimatedEfficiency = baseFuelEfficiency * penaltyFactor;

    // Apply real-world corrections
    const correctionFactor = REAL_WORLD_FACTORS[fuelType] || REAL_WORLD_FACTORS.ice;
    return estimatedEfficiency * correctionFactor;
}

/**
 * Calculate cost per kilometer
 */
function calculateCostPerKm(spec, fuelPrices) {
    const { fuelType } = spec;
    const realWorldEff = calculateRealWorldEfficiency(spec);

    if (!realWorldEff) return null;

    switch (fuelType) {
        case 'petrol':
            return fuelPrices.petrol / realWorldEff;

        case 'diesel':
            return fuelPrices.diesel / realWorldEff;

        case 'cng':
            return fuelPrices.cng / realWorldEff;

        case 'hybrid':
            return fuelPrices.petrol / realWorldEff; // Assuming petrol hybrid

        case 'electric':
            return fuelPrices.electricity / realWorldEff;

        default:
            return null;
    }
}

/**
 * Calculate efficiency score (0-1) using realistic benchmarking
 */
function calculateEfficiencyScore(spec) {
    const { fuelType } = spec;
    const realWorldEff = calculateRealWorldEfficiency(spec);

    if (!realWorldEff) {
        // If no efficiency data, use penalty-based estimation
        const efficiencyPenalty = calculateEfficiencyPenalty(spec);
        // Start from 60% baseline, reduce by penalty
        const baseScore = 0.60;
        const penaltyReduction = Math.min(efficiencyPenalty * 0.02, 0.45); // Max 45% penalty
        return Math.max(0.15, baseScore - penaltyReduction);
    }

    // Use very strict efficiency benchmarks - only truly exceptional cars get high scores
    let excellentThreshold, goodThreshold, averageThreshold, poorThreshold;

    switch (fuelType) {
        case 'petrol':
            excellentThreshold = 20; // Only Alto K10, i10 NIOS top variants
            goodThreshold = 17;      // Very good cars like Swift top variants
            averageThreshold = 14;   // Good cars like Swift base, Baleno
            poorThreshold = 11;      // Average cars, compact SUVs
            break;
        case 'diesel':
            excellentThreshold = 25; // Only best diesel hatchbacks
            goodThreshold = 22;      // Very good diesel cars
            averageThreshold = 19;   // Good diesel cars
            poorThreshold = 16;      // Average diesel cars
            break;
        case 'hybrid':
            excellentThreshold = 28; // Only best hybrids like Camry Hybrid
            goodThreshold = 24;      // Good hybrids
            averageThreshold = 20;   // Average hybrid
            poorThreshold = 17;      // Entry level hybrid
            break;
        case 'cng':
            excellentThreshold = 30; // Only best CNG cars
            goodThreshold = 26;      // Very good CNG
            averageThreshold = 22;   // Good CNG
            poorThreshold = 18;      // Average CNG
            break;
        case 'electric':
            excellentThreshold = 8.0; // Only best EVs like Nexon EV Max
            goodThreshold = 6.5;      // Good EVs
            averageThreshold = 5.0;   // Average EVs
            poorThreshold = 3.5;      // Entry level EVs
            break;
        default:
            excellentThreshold = 20;
            goodThreshold = 17;
            averageThreshold = 14;
            poorThreshold = 11;
    }

    // Calculate score based on very strict thresholds
    let score;
    if (realWorldEff >= excellentThreshold) {
        // Excellent: 75-90% (only truly exceptional cars)
        // Even excellent cars cap at 90%, need to be significantly above threshold for higher scores
        const excessEfficiency = realWorldEff - excellentThreshold;
        const maxExcess = excellentThreshold * 0.3; // 30% above excellent threshold for max score
        score = 0.75 + Math.min(excessEfficiency / maxExcess, 1.0) * 0.15;
    } else if (realWorldEff >= goodThreshold) {
        // Good: 55-75%
        score = 0.55 + (realWorldEff - goodThreshold) / (excellentThreshold - goodThreshold) * 0.20;
    } else if (realWorldEff >= averageThreshold) {
        // Average: 35-55%
        score = 0.35 + (realWorldEff - averageThreshold) / (goodThreshold - averageThreshold) * 0.20;
    } else if (realWorldEff >= poorThreshold) {
        // Below Average: 20-35%
        score = 0.20 + (realWorldEff - poorThreshold) / (averageThreshold - poorThreshold) * 0.15;
    } else {
        // Poor: 5-20%
        score = Math.max(0.05, 0.20 * (realWorldEff / poorThreshold));
    }

    // Apply penalty-based adjustment for design choices
    const penalty = calculateEfficiencyPenalty(spec);
    const penaltyAdjustment = Math.min(penalty * 0.012, 0.25); // Max 25% penalty, more impactful
    score = Math.max(0.05, score - penaltyAdjustment);

    return Math.min(1.0, score);
}

/**
 * Calculate safety score (0-1)
 */
function calculateSafetyScore(spec) {
    const { ncapStars, airbags, esc, isofix } = spec;

    // If NCAP stars are available, use them
    if (ncapStars && ncapStars > 0) {
        return Math.min(ncapStars / 5, 1);
    }

    // Otherwise, infer from safety features (max 0.6)
    let score = 0;

    // 6+ airbags: +0.4
    if (airbags && airbags >= 6) {
        score += 0.4;
    } else if (airbags && airbags >= 2) {
        score += 0.2;
    }

    // ESC/ESP: +0.2
    if (esc) {
        score += 0.2;
    }

    // ISOFIX: +0.2 (but cap total at 0.6)
    if (isofix) {
        score += 0.2;
    }

    return Math.min(score, 0.6);
}

/**
 * Calculate value-for-money score (0-1)
 */
function calculateValueScore(spec, efficiencyScore, safetyScore) {
    const { price } = spec;

    if (!price) return 0;

    // Normalize price (lower is better for value)
    const priceScore = 1 - CarEfficiencyUtils.normalize(
        price,
        NORMALIZATION_RANGES.price_lakh.min,
        NORMALIZATION_RANGES.price_lakh.max
    );

    // Combine efficiency + safety + features vs price
    const featuresScore = (efficiencyScore + safetyScore) / 2;

    // Weight: 60% features, 40% price advantage
    return (featuresScore * 0.6) + (priceScore * 0.4);
}

/**
 * Calculate performance per efficiency score (0-1)
 */
function calculatePerformancePerEfficiencyScore(spec, efficiencyScore) {
    const { power, kerbWeight } = spec;

    if (!power || !kerbWeight) {
        // If we can't calculate power-to-weight, use efficiency only
        return efficiencyScore;
    }

    // Calculate kW per tonne
    const powerToWeight = power / (kerbWeight / 1000);

    // Normalize power-to-weight ratio
    const powerScore = CarEfficiencyUtils.normalize(
        powerToWeight,
        NORMALIZATION_RANGES.power_to_weight.min,
        NORMALIZATION_RANGES.power_to_weight.max
    );

    // 70% power-to-weight + 30% efficiency
    return (powerScore * 0.7) + (efficiencyScore * 0.3);
}

/**
 * Calculate composite score
 */
function calculateCompositeScore(spec, weights, fuelPrices) {
    // Calculate individual scores
    const efficiencyScore = calculateEfficiencyScore(spec);
    const safetyScore = calculateSafetyScore(spec);
    const valueScore = calculateValueScore(spec, efficiencyScore, safetyScore);
    const perfEffScore = calculatePerformancePerEfficiencyScore(spec, efficiencyScore);

    // Calculate weighted composite score
    const composite = (
        (efficiencyScore * weights.efficiency) +
        (safetyScore * weights.safety) +
        (valueScore * weights.valueForMoney) +
        (perfEffScore * weights.performancePerEfficiency)
    ) / 100;

    // Calculate additional metrics
    const costPerKm = calculateCostPerKm(spec, fuelPrices);
    const powerToWeight = (spec.power && spec.kerbWeight) ?
        spec.power / (spec.kerbWeight / 1000) : null;

    return {
        composite: Math.round(composite * 100),
        breakdown: {
            efficiency: Math.round(efficiencyScore * 100),
            safety: Math.round(safetyScore * 100),
            valueForMoney: Math.round(valueScore * 100),
            performancePerEfficiency: Math.round(perfEffScore * 100)
        },
        metrics: {
            costPerKm: costPerKm ? Math.round(costPerKm * 100) / 100 : null,
            powerToWeight: powerToWeight ? Math.round(powerToWeight * 10) / 10 : null,
            realWorldEfficiency: calculateRealWorldEfficiency(spec)
        }
    };
}

/**
 * Validate and clean specification data
 */
function validateSpec(rawSpec) {
    const spec = { ...rawSpec };

    // Ensure numeric fields are numbers
    const numericFields = ['mileage', 'range', 'batteryCapacity', 'power', 'kerbWeight', 'price', 'ncapStars', 'airbags'];
    numericFields.forEach(field => {
        if (spec[field] !== null && spec[field] !== undefined) {
            const num = CarEfficiencyUtils.parseNumber(spec[field]);
            spec[field] = num;
        }
    });

    // Ensure boolean fields are booleans
    const booleanFields = ['esc', 'isofix'];
    booleanFields.forEach(field => {
        if (spec[field] !== null && spec[field] !== undefined) {
            spec[field] = Boolean(spec[field]);
        }
    });

    // Normalize fuel type
    if (spec.fuelType) {
        spec.fuelType = spec.fuelType.toLowerCase();
    }

    return spec;
}

// Export scoring functions
window.CarEfficiencyScoring = {
    calculateCompositeScore,
    calculateEfficiencyPenalty,
    calculateRealWorldEfficiency,
    calculateCostPerKm,
    calculateEfficiencyScore,
    validateSpec,
    NORMALIZATION_RANGES,
    REAL_WORLD_FACTORS,
    EFFICIENCY_WEIGHTS,
    TRANSMISSION_EFFICIENCY,
    BODY_TYPE_EFFICIENCY
};

