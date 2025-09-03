// gemini.js - Direct Gemini AI API integration

// WARNING: This API key is embedded in the extension source code for demo purposes only.
// In production, this would be a major security risk as users can extract the key.
// For production use, implement proper API key management through a backend service.
const GEMINI_API_KEY = 'AIzaSyAIgEfjjaySo1BqyPyxrqsEXmQcJKbUveA'; // Replace with actual API key

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Create the prompt for Gemini API
 */
function createGeminiPrompt(spec, rawText) {
    const truncatedText = CarEfficiencyUtils.truncateText(rawText, 8000);

    return `You are assisting a car specification analyzer for India.

Return STRICT JSON only, no other text:
{
  "normalized": {
    "fuelType": string|null,
    "realWorld": {
      "kmpl": number|null,
      "kmkg": number|null,
      "kmPerKWh": number|null
    },
    "kwPerTonne": number|null,
    "segment": string|null,
    "missing": [string]
  },
  "insights": [
    {
      "title": string,
      "detail": string
    }
  ]
}

Guidelines:
- Don't hallucinate values. Leave fields null if uncertain.
- For insights, provide 2-5 practical points about efficiency/safety/value tradeoffs.
- Keep insights concise and India-specific.
- Missing array should list important specs that couldn't be found.

Current extracted spec:
${JSON.stringify(spec, null, 2)}

Raw page text (truncated):
${truncatedText}`;
}

/**
 * Call Gemini API to get insights and normalized data
 */
async function fetchGeminiInsights(spec, rawText) {
    try {
        // Check if API key is configured
        if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            console.warn('Gemini API key not configured');
            return {
                normalized: {
                    fuelType: null,
                    realWorld: { kmpl: null, kmkg: null, kmPerKWh: null },
                    kwPerTonne: null,
                    segment: null,
                    missing: ['API key not configured']
                },
                insights: [
                    {
                        title: 'API Configuration Required',
                        detail: 'Gemini API key needs to be configured for AI insights. Check README for setup instructions.'
                    }
                ]
            };
        }

        const prompt = createGeminiPrompt(spec, rawText);

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.1,
                topK: 1,
                topP: 0.8,
                maxOutputTokens: 1000,
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };

        console.log('Calling Gemini API...');

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from Gemini API');
        }

        const textResponse = data.candidates[0].content.parts[0].text;

        // Parse JSON response
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Gemini response');
        }

        const parsedResponse = JSON.parse(jsonMatch[0]);

        // Validate response structure
        if (!parsedResponse.normalized || !parsedResponse.insights) {
            throw new Error('Invalid response structure from Gemini');
        }

        console.log('Gemini insights received successfully');
        return parsedResponse;

    } catch (error) {
        console.error('Error fetching Gemini insights:', error);

        // Return fallback response
        return {
            normalized: {
                fuelType: null,
                realWorld: { kmpl: null, kmkg: null, kmPerKWh: null },
                kwPerTonne: null,
                segment: null,
                missing: ['AI analysis failed']
            },
            insights: [
                {
                    title: 'AI Analysis Unavailable',
                    detail: `Unable to fetch AI insights: ${error.message}. Using local analysis only.`
                }
            ]
        };
    }
}

/**
 * Apply Gemini normalized data to enhance local spec
 */
function enhanceSpecWithGemini(localSpec, geminiData) {
    if (!geminiData || !geminiData.normalized) {
        return localSpec;
    }

    const enhanced = { ...localSpec };
    const normalized = geminiData.normalized;

    // Apply normalized fuel type if not detected locally
    if (!enhanced.fuelType && normalized.fuelType) {
        enhanced.fuelType = normalized.fuelType;
    }

    // Apply real-world efficiency if missing locally
    if (!enhanced.mileage && normalized.realWorld) {
        if (normalized.realWorld.kmpl) {
            enhanced.mileage = normalized.realWorld.kmpl;
        } else if (normalized.realWorld.kmkg) {
            enhanced.mileage = normalized.realWorld.kmkg;
        } else if (normalized.realWorld.kmPerKWh && enhanced.batteryCapacity) {
            // Convert km/kWh to range if we have battery capacity
            enhanced.range = normalized.realWorld.kmPerKWh * enhanced.batteryCapacity;
        }
    }

    // Apply power-to-weight if missing
    if (!enhanced.power && !enhanced.kerbWeight && normalized.kwPerTonne) {
        // Can't reverse engineer without one of the values
        // But we can store it as metadata
        enhanced._geminiPowerToWeight = normalized.kwPerTonne;
    }

    // Store segment information
    if (normalized.segment) {
        enhanced._segment = normalized.segment;
    }

    // Store missing fields info
    if (normalized.missing && normalized.missing.length > 0) {
        enhanced._missingFields = normalized.missing;
    }

    return enhanced;
}

/**
 * Format insights for display
 */
function formatInsights(insights) {
    if (!insights || !Array.isArray(insights)) {
        return [];
    }

    return insights.map(insight => ({
        title: insight.title || 'Insight',
        detail: insight.detail || 'No details available'
    }));
}

/**
 * Test Gemini API connection
 */
async function testGeminiConnection() {
    try {
        const testSpec = {
            fuelType: 'petrol',
            mileage: 15,
            price: 10
        };

        const result = await fetchGeminiInsights(testSpec, 'Test car specification page');
        return result.insights.length > 0;
    } catch (error) {
        console.error('Gemini connection test failed:', error);
        return false;
    }
}

// Export Gemini integration functions
window.CarEfficiencyGemini = {
    fetchGeminiInsights,
    enhanceSpecWithGemini,
    formatInsights,
    testGeminiConnection
};

