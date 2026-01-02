// OpenWeatherMap API - Get your free key at openweathermap.org
const API_KEY = 'e30eefc022cd5a8ea857bb2bd1cfc260'; // Replace with your actual API key
const API_BASE = 'https://api.openweathermap.org/data/2.5';

// DOM elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const errorMessage = document.getElementById('errorMessage');
const loading = document.getElementById('loading');
const weatherContainer = document.getElementById('weatherContainer');
const suggestionsDiv = document.getElementById('suggestions');

// Unit state
let currentUnit = 'metric'; // metric = Celsius, imperial = Fahrenheit
let currentCity = 'New York';
let searchTimeout;
// Weather icon mapping
const weatherIcons = {
    '01d': '☀️', '01n': '🌙',
    '02d': '⛅', '02n': '☁️',
    '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️',
    '09d': '🌧️', '09n': '🌧️',
    '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️',
    '13d': '❄️', '13n': '❄️',
    '50d': '🌫️', '50n': '🌫️'
};

// Event listeners
searchBtn.addEventListener('click', searchWeather);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeather();
});

// Autocomplete functionality
cityInput.addEventListener('input', async (e) => {
    const value = e.target.value.trim();
    
    // Clear previous timeout
    clearTimeout(searchTimeout);
    
    if (value.length < 2) {
        suggestionsDiv.classList.remove('show');
        return;
    }
    
    // Debounce API calls - wait 300ms after user stops typing
    searchTimeout = setTimeout(async () => {
        try {
            // Use OpenWeatherMap Geocoding API to search for cities
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${value}&limit=10&appid=${API_KEY}`
            );
            
            if (!response.ok) return;
            
            const cities = await response.json();
            
            if (cities.length > 0) {
                suggestionsDiv.innerHTML = cities.map(city => {
                    const cityName = city.name;
                    const state = city.state ? `, ${city.state}` : '';
                    const country = city.country;
                    const fullName = `${cityName}${state}, ${country}`;
                    
                    return `<div class="suggestion-item" data-city="${cityName}" data-country="${country}">
                        ${cityName}${state} <span style="color: #999;">${country}</span>
                    </div>`;
                }).join('');
                suggestionsDiv.classList.add('show');
            } else {
                suggestionsDiv.classList.remove('show');
            }
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
        }
    }, 300);
});

// Click on suggestion
suggestionsDiv.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (item) {
        const city = item.dataset.city;
        cityInput.value = city;
        suggestionsDiv.classList.remove('show');
        getWeather(city);
    }
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
        suggestionsDiv.classList.remove('show');
    }
});

// Unit toggle
document.querySelectorAll('.unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentUnit = btn.dataset.unit;
        getWeather(currentCity);
    });
});

// Load default city on page load
window.addEventListener('load', () => {
    getWeather('New York');
});

async function searchWeather() {
    const city = cityInput.value.trim();
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    await getWeather(city);
}

async function getWeather(city) {
    showLoading(true);
    hideError();
    currentCity = city;
    
    try {
        // Fetch current weather
        const currentResponse = await fetch(
            `${API_BASE}/weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        );
        
        if (!currentResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentData = await currentResponse.json();
        
        // Fetch 5-day forecast
        const forecastResponse = await fetch(
            `${API_BASE}/forecast?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        );
        
        const forecastData = await forecastResponse.json();
        
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
        
        weatherContainer.classList.add('show');
        
    } catch (error) {
        showError(error.message === 'City not found' 
            ? 'City not found. Try another one.' 
            : 'Something went wrong. Try again later.');
        weatherContainer.classList.remove('show');
    } finally {
        showLoading(false);
    }
}

function displayCurrentWeather(data) {
    const { name, sys, main, weather, wind, clouds } = data;
    const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
    
    // Location and date
    document.getElementById('cityName').textContent = `${name}, ${sys.country}`;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Main weather
    const icon = weatherIcons[weather[0].icon] || '🌡️';
    document.getElementById('weatherIcon').textContent = icon;
    document.getElementById('temperature').textContent = Math.round(main.temp);
    document.getElementById('tempUnit').textContent = unitSymbol;
    document.getElementById('weatherDesc').textContent = weather[0].description;
    document.getElementById('feelsLike').textContent = Math.round(main.feels_like) + unitSymbol;
    
    // Stats
    const speedUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    const windSpeed = currentUnit === 'metric' ? Math.round(wind.speed * 3.6) : Math.round(wind.speed);
    document.getElementById('humidity').textContent = `${main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${windSpeed} ${speedUnit}`;
    document.getElementById('pressure').textContent = `${main.pressure} hPa`;
    document.getElementById('clouds').textContent = `${clouds.all}%`;
}

function displayForecast(data) {
    const forecastGrid = document.getElementById('forecastGrid');
    forecastGrid.innerHTML = '';
    const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';
    
    // Get one forecast per day (at 12:00)
    const dailyForecasts = data.list.filter(item => 
        item.dt_txt.includes('12:00:00')
    ).slice(0, 5);
    
    dailyForecasts.forEach(day => {
        const date = new Date(day.dt * 1000);
        const icon = weatherIcons[day.weather[0].icon] || '🌡️';
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-day';
        forecastCard.innerHTML = `
            <div class="forecast-date">${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <div class="forecast-icon">${icon}</div>
            <div class="forecast-temp">
                <span class="temp-high">${Math.round(day.main.temp_max)}${unitSymbol}</span>
                <span class="temp-low">${Math.round(day.main.temp_min)}${unitSymbol}</span>
            </div>
        `;
        
        forecastGrid.appendChild(forecastCard);
    });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function hideError() {
    errorMessage.classList.remove('show');
}

function showLoading(show) {
    if (show) {
        loading.classList.add('show');
        searchBtn.disabled = true;
    } else {
        loading.classList.remove('show');
        searchBtn.disabled = false;
    }
}
