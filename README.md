# Car Efficiency & Value Score Chrome Extension

A production-ready Chrome MV3 extension that analyzes car specification pages and computes a comprehensive 0-100 efficiency and value score with AI-powered insights from Google Gemini.

## 🚗 Features

- **User-Controlled Analysis**: Click to analyze any car specification page when you need it
- **Smart Page Detection**: Automatically detects CarDekho, CarWale, and generic car specification pages
- **Comprehensive Scoring**: 4-factor composite score (Efficiency, Safety, Value-for-Money, Performance-per-Efficiency)
- **Real-World Calculations**: Applies correction factors to manufacturer claims for realistic efficiency estimates
- **AI-Powered Insights**: Direct Gemini API integration for enhanced analysis and missing data inference
- **Cost Analysis**: Calculates real-world cost per kilometer based on current fuel prices
- **Customizable Weights**: Adjust scoring priorities through popup interface
- **Local Price Updates**: Configure fuel prices for accurate cost calculations
- **Modern UI**: Clean, responsive overlay with dark mode support
- **Privacy-Focused**: Only runs when you explicitly trigger it

## 📊 Advanced Scoring Model

### Composite Score Calculation
- **Efficiency**: 35% (default weight) - Uses comprehensive parameter analysis
- **Safety**: 30% (default weight) - NCAP ratings + safety features
- **Value-for-Money**: 25% (default weight) - Features vs price analysis
- **Performance-per-Efficiency**: 10% (default weight) - Power optimization

### Comprehensive Efficiency Analysis

The extension uses a sophisticated mathematical model that analyzes **10 key parameters** to calculate efficiency:

#### Engine Parameters (40% weight)
- **Displacement Factor (15%)**: Larger engines typically less efficient
- **Cylinder Count (8%)**: More cylinders generally reduce efficiency  
- **Power Density (10%)**: Power per liter (kW/L) - modern high-density engines can be more efficient
- **Torque Efficiency (7%)**: Torque per displacement ratio (Nm/L)

#### Transmission Parameters (15% weight)
- **Transmission Type (10%)**: CVT > Manual > AMT > DCT > Automatic
- **Gear Count (5%)**: More gears allow better engine optimization

#### Physical Design Parameters (25% weight)
- **Weight Factor (12%)**: Lighter vehicles are more efficient (major impact)
- **Aerodynamic Factor (8%)**: Length/width ratio + ground clearance effects
- **Body Type Factor (5%)**: Hatchback > Sedan > Crossover > MPV > SUV

#### Fuel System Parameters (20% weight)
- **Fuel Type Advantage (20%)**: Electric > Hybrid > Diesel > Petrol > CNG

### Mathematical Formula

```
Efficiency Score = Base × ∏(1 + (Parameter_Score - 0.5) × Weight)

Where Parameter_Score is normalized between 0-1 for each factor
```

### Real-World Corrections
- **ICE**: ARAI × 0.8
- **Hybrid**: ARAI × 0.85  
- **CNG**: Quoted × 0.8
- **EV**: (Range × 0.75) ÷ Battery kWh

### Parameter Ranges
- **Engine**: 800-2500cc, 3-8 cylinders, 50-300 bhp, 80-500 Nm
- **Transmission**: 4-10 gears, Manual/AMT/CVT/DCT/Automatic
- **Physical**: 800-2500kg weight, 3500-5500mm length, 140-220mm clearance
- **Price**: ₹6-50 lakh normalization range

## 🛠️ Installation

### Prerequisites
- Google Chrome browser (version 88+)
- Gemini API key (for AI insights)

### Steps
1. **Download Extension**
   ```bash
   # Clone or download this repository
   git clone <repository-url>
   cd car-efficiency-extension
   ```

2. **Configure Gemini API Key**
   - Open `src/gemini.js`
   - Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key:
   ```javascript
   const GEMINI_API_KEY = 'your-actual-api-key-here';
   ```

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the extension folder
   - Extension should appear with car icon

4. **Verify Installation**
   - Visit a car specification page (e.g., CarDekho, CarWale)
   - Look for the efficiency score overlay in bottom-right corner
   - Click extension icon to access settings

## 🔧 Configuration

### Getting Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and paste it in `src/gemini.js`

### Customizing Settings
1. Click the extension icon in Chrome toolbar
2. Adjust scoring weights (must total 100%)
3. Update fuel prices for your region
4. Click "Save Settings"

### Default Fuel Prices (India)
- **Petrol**: ₹110/litre
- **Diesel**: ₹95/litre
- **CNG**: ₹80/kg
- **Electricity**: ₹9/kWh

## 🎯 Usage

### User-Initiated Analysis
1. **Navigate to a car specification page** (CarDekho, CarWale, or any car review site)
2. **Click the extension icon** in Chrome toolbar to open popup
3. **Click "Analyze Current Page"** button in the popup
4. **View results** in the overlay that appears on the page
5. **Refresh analysis** using the refresh button (🔄) in overlay header if needed

### Quick Start
- Extension icon shows when you're on a supported page
- Green indicator in popup means page is ready for analysis
- Red indicator means the page is not a car specification page

### Supported Websites
- **CarDekho.com**: Enhanced extraction with site-specific selectors
- **CarWale.com**: Optimized for CarWale's specification format
- **Generic Sites**: Works on most car specification pages

## 📱 Interface

### Popup Interface
- **Analyze Button**: Start analysis of current car specification page
- **Page Status**: Shows if current page is supported for analysis
- **Scoring Weights**: Adjust importance of each factor (must total 100%)
- **Fuel Prices**: Update local pricing for accurate cost calculations
- **API Status**: Check Gemini integration status
- **Settings Management**: Save/Reset configuration

### Page Overlay (After Analysis)
- **Main Score**: 0-100 composite efficiency score with color coding
- **Score Breakdown**: Individual component scores with progress bars
- **Key Metrics**: Cost/km, Power-to-Weight ratio, car name
- **AI Insights**: 2-5 Gemini-generated insights about efficiency/safety/value tradeoffs
- **Controls**: Refresh analysis and close overlay buttons

## 🔒 Security Notice

**⚠️ IMPORTANT SECURITY WARNING**

This extension stores the Gemini API key directly in the source code (`src/gemini.js`) for demonstration purposes only. This approach has significant security implications:

### Security Risks
- **API Key Exposure**: Anyone can view the extension source and extract your API key
- **Usage Abuse**: Exposed keys can be used by others, potentially exhausting your quota
- **Billing Risk**: Unauthorized usage could result in unexpected charges

### Production Recommendations
For production deployment, implement proper API key management:

1. **Backend Proxy**: Route API calls through your own server
2. **Environment Variables**: Use secure configuration management
3. **Key Rotation**: Implement regular API key rotation
4. **Usage Monitoring**: Set up quotas and alerts
5. **Authentication**: Add user authentication to your backend

### Demo Usage Only
This extension is designed for:
- Personal testing and evaluation
- Development and learning purposes
- Proof-of-concept demonstrations

**DO NOT** use this extension with production API keys or in commercial environments without implementing proper security measures.

## 🏗️ Architecture

### File Structure
```
car-efficiency/
├── manifest.json              # Extension configuration
├── src/
│   ├── content.js            # Main content script
│   ├── overlay.css           # UI styling
│   ├── scoring.js            # Scoring algorithm
│   ├── utils.js              # Utility functions
│   ├── gemini.js             # AI integration
│   └── extractors/
│       ├── generic.js        # Generic extractor
│       ├── cardekho.js       # CarDekho-specific
│       └── carwale.js        # CarWale-specific
├── popup/
│   ├── popup.html            # Settings interface
│   └── popup.js              # Settings logic
├── service_worker.js         # Background tasks
└── README.md                 # This file
```

### Data Flow
1. **Content Script** detects car specification page
2. **Extractor** parses page content for car specs
3. **Scoring Engine** calculates composite score
4. **Gemini API** enhances data and provides insights
5. **Overlay** displays results to user
6. **Settings** persist via Chrome storage API

## 🧪 Development

### Testing
- Test on various car specification pages
- Verify scoring calculations manually
- Check API integration with sample data
- Test settings persistence across browser sessions

### Debugging
- Open Chrome DevTools on car pages
- Check Console for extension logs
- Inspect Network tab for API calls
- Use Chrome extension debugging tools

### Common Issues
1. **No Overlay Appearing**
   - Check if page is detected as car specification page
   - Verify content script injection in DevTools
   - Look for JavaScript errors in console

2. **API Insights Not Loading**
   - Verify API key configuration in `src/gemini.js`
   - Check Network tab for failed API requests
   - Ensure proper CORS and API permissions

3. **Settings Not Saving**
   - Check Chrome storage permissions
   - Verify popup script execution
   - Look for storage quota issues

## 📈 Performance

### Optimization Features
- **Debounced Analysis**: Prevents multiple rapid API calls
- **Async Loading**: AI insights load without blocking main score
- **Efficient Parsing**: Optimized DOM traversal and text processing
- **Storage Management**: Automatic cleanup of old cached data

### Resource Usage
- **Memory**: ~2-5MB per active tab
- **Network**: 1-2 API calls per page analysis
- **CPU**: Minimal impact, analysis runs in background

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Make changes to source files
3. Test thoroughly on target websites
4. Update documentation if needed
5. Submit pull request with detailed description

### Code Style
- Use ES6+ features where supported
- Follow existing naming conventions
- Add comments for complex logic
- Maintain consistent indentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

### Getting Help
- Check the troubleshooting section above
- Review Chrome extension documentation
- Open an issue on the repository

### Known Limitations
- Requires manual API key configuration
- Limited to Chrome browser (MV3)
- Dependent on page structure for extraction
- API rate limits may apply

## 🔄 Version History

### v1.0.0 (Current)
- Initial release with full feature set
- Support for CarDekho, CarWale, and generic sites
- Gemini AI integration
- Comprehensive scoring model
- Settings management interface

---

**Made with ❤️ for car enthusiasts and efficiency-conscious buyers**

