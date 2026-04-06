// Cryptocurrency data
const COIN_CONFIG = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
    { id: 'tether', name: 'Tether', symbol: 'USDT', icon: '₮' },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', icon: '🔶' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', icon: '◎' },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', icon: '✕' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', icon: '₳' },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', icon: 'Ð' },
    { id: 'polygon', name: 'Polygon', symbol: 'MATIC', icon: '⬡' },
    { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', icon: '🔺' }
];

const COIN_MAP = new Map(COIN_CONFIG.map(coin => [coin.id, coin]));
const SYMBOL_TO_ID = new Map(COIN_CONFIG.map(coin => [coin.symbol, coin.id]));

const API_BASE = 'https://api.coingecko.com/api/v3';
const LIVE_POLL_INTERVAL_MS = 30000;

let cryptoData = COIN_CONFIG.map((coin, index) => ({
    rank: index + 1,
    name: coin.name,
    symbol: coin.symbol,
    icon: coin.icon,
    price: 0,
    change: 0,
    marketCap: 0,
    volume: 0,
    trend: [0, 0, 0, 0, 0, 0, 0],
    coinId: coin.id
}));

let currentFilter = 'all';
let currentTimeframe = '7D';
let currentCrypto = cryptoData[0];
let chartData = [];
let chartLabels = [];
let hoverIndex = -1;
let pollTimer = null;
let isFetching = false;

function formatMarketBillions(value) {
    return (value / 1_000_000_000).toFixed(1);
}

function formatCryptoPrice(value) {
    if (value >= 1000) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (value >= 1) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function getLabelFormatter(timeframe) {
    switch (timeframe) {
        case '1H':
            return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        case '24H':
            return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        case '7D':
            return new Intl.DateTimeFormat('en-US', { weekday: 'short' });
        case '30D':
            return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
        case '1Y':
            return new Intl.DateTimeFormat('en-US', { month: 'short' });
        default:
            return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    }
}

function downSamplePoints(points, targetCount) {
    if (!Array.isArray(points) || points.length <= targetCount) {
        return points || [];
    }

    const sampled = [];
    const step = (points.length - 1) / (targetCount - 1);
    for (let i = 0; i < targetCount; i++) {
        sampled.push(points[Math.round(i * step)]);
    }
    return sampled;
}

function getTargetPointCount(timeframe) {
    switch (timeframe) {
        case '1H':
            return 12;
        case '24H':
            return 24;
        case '7D':
            return 7;
        case '30D':
            return 30;
        case '1Y':
            return 12;
        default:
            return 30;
    }
}

function updateChartHeader(crypto) {
    if (!crypto) return;

    document.querySelector('.chart-title').textContent = `${crypto.name} (${crypto.symbol})`;
    document.getElementById('current-price').textContent = formatCryptoPrice(crypto.price);

    const priceChangeEl = document.querySelector('.chart-header .price-change');
    const changeAmount = (crypto.price * crypto.change) / 100;
    priceChangeEl.className = `price-change ${crypto.change >= 0 ? 'positive' : 'negative'}`;
    priceChangeEl.innerHTML = `${crypto.change >= 0 ? '↑' : '↓'} $${Math.abs(changeAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.abs(crypto.change).toFixed(2)}%)`;
}

async function fetchGlobalStats() {
    try {
        const response = await fetch(`${API_BASE}/global`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Global API failed with status ${response.status}`);
        }

        const payload = await response.json();
        const data = payload.data;

        document.getElementById('market-cap').textContent = `$${(data.total_market_cap.usd / 1_000_000_000_000).toFixed(2)}T`;
        document.getElementById('volume-24h').textContent = `$${(data.total_volume.usd / 1_000_000_000).toFixed(1)}B`;
        document.getElementById('btc-dominance').textContent = `${data.market_cap_percentage.btc.toFixed(1)}%`;
        document.getElementById('active-cryptos').textContent = data.active_cryptocurrencies.toLocaleString('en-US');

        const marketCapChange = Number.isFinite(data.market_cap_change_percentage_24h_usd)
            ? data.market_cap_change_percentage_24h_usd
            : 0;
        const marketCapChangeEl = document.getElementById('market-cap-change');
        marketCapChangeEl.className = `stat-change ${marketCapChange >= 0 ? 'positive' : 'negative'}`;
        marketCapChangeEl.textContent = `${marketCapChange >= 0 ? '↑' : '↓'} ${Math.abs(marketCapChange).toFixed(2)}%`;
    } catch (error) {
        console.error('Failed to fetch global market stats:', error);
    }
}

async function fetchMarketSnapshot() {
    const ids = COIN_CONFIG.map(c => c.id).join(',');
    const url = `${API_BASE}/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
        throw new Error(`Market API failed with status ${response.status}`);
    }

    const coins = await response.json();

    cryptoData = coins.map((coin, index) => {
        const config = COIN_MAP.get(coin.id);
        return {
            rank: coin.market_cap_rank || index + 1,
            name: config?.name || coin.name,
            symbol: (config?.symbol || coin.symbol || '').toUpperCase(),
            icon: config?.icon || '◈',
            price: coin.current_price || 0,
            change: coin.price_change_percentage_24h || 0,
            marketCap: coin.market_cap || 0,
            volume: coin.total_volume || 0,
            trend: downSamplePoints(coin.sparkline_in_7d?.price || [], 7),
            coinId: coin.id
        };
    });

    const selectedId = currentCrypto?.coinId;
    currentCrypto = cryptoData.find(c => c.coinId === selectedId) || cryptoData[0];
}

async function fetchChartData(coinId, timeframe) {
    const formatter = getLabelFormatter(timeframe);
    const now = Math.floor(Date.now() / 1000);
    let prices = [];

    if (timeframe === '1H') {
        const from = now - 60 * 60;
        const response = await fetch(
            `${API_BASE}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${from}&to=${now}`,
            { cache: 'no-store' }
        );

        if (!response.ok) {
            throw new Error(`Range chart API failed with status ${response.status}`);
        }

        const payload = await response.json();
        prices = payload.prices || [];
    } else {
        const days = timeframe === '24H' ? 1 : timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : 365;
        const interval = timeframe === '24H' ? 'hourly' : 'daily';
        const response = await fetch(
            `${API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`,
            { cache: 'no-store' }
        );

        if (!response.ok) {
            throw new Error(`Chart API failed with status ${response.status}`);
        }

        const payload = await response.json();
        prices = payload.prices || [];
    }

    const sampled = downSamplePoints(prices, getTargetPointCount(timeframe));
    chartData = sampled.map(point => point[1]);
    chartLabels = sampled.map(point => formatter.format(new Date(point[0])));
}

async function refreshAllData(showSuccessToast = false) {
    if (isFetching) {
        return;
    }

    isFetching = true;
    try {
        await Promise.all([fetchMarketSnapshot(), fetchGlobalStats()]);
        renderMarketTable();
        renderTrendingList();
        updateChartHeader(currentCrypto);
        await refreshChartForCurrentSelection();

        if (showSuccessToast) {
            showToast('Live prices updated');
        }
    } catch (error) {
        console.error('Failed to refresh crypto data:', error);
        showToast('Unable to fetch live prices right now');
    } finally {
        isFetching = false;
    }
}

async function refreshChartForCurrentSelection() {
    if (!currentCrypto) return;

    const canvas = document.getElementById('price-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    try {
        await fetchChartData(currentCrypto.coinId, currentTimeframe);
    } catch (error) {
        console.error('Failed to fetch chart data:', error);
        if (currentTimeframe === '7D' && currentCrypto.trend?.length) {
            chartData = currentCrypto.trend;
            chartLabels = getChartLabels(currentTimeframe, chartData.length);
        }
    }

    if (!chartData.length) {
        chartData = currentCrypto.trend || [currentCrypto.price];
        chartLabels = getChartLabels(currentTimeframe, chartData.length);
    }

    drawChart(ctx, canvas.width, canvas.height, chartData, currentTimeframe);
}

async function initializeApp() {
    initChart();
    renderMarketTable();
    renderTrendingList();
    await refreshAllData(false);
    startLiveUpdates();
}

// Initialize
window.addEventListener('load', initializeApp);

        // Render Market Table
        function renderMarketTable() {
            const tbody = document.getElementById('market-tbody');
            let data = [...cryptoData];

            // Apply filters
            if (currentFilter === 'gainers') {
                data = data.filter(c => c.change > 0).sort((a, b) => b.change - a.change);
            } else if (currentFilter === 'losers') {
                data = data.filter(c => c.change < 0).sort((a, b) => a.change - b.change);
            } else if (currentFilter === 'volume') {
                data = data.sort((a, b) => b.volume - a.volume);
            }

            tbody.innerHTML = data.map(crypto => `
                <tr onclick="selectCrypto('${crypto.symbol}')" style="cursor: pointer;">
                    <td>${crypto.rank}</td>
                    <td>
                        <div class="coin-info">
                            <div class="coin-icon" style="background: linear-gradient(135deg, ${getRandomColor()}, ${getRandomColor()})">
                                ${crypto.icon}
                            </div>
                            <div>
                                <div class="coin-name">${crypto.name}</div>
                                <div class="coin-symbol">${crypto.symbol}</div>
                            </div>
                        </div>
                    </td>
                    <td>$${formatCryptoPrice(crypto.price)}</td>
                    <td>
                        <span class="price-change ${crypto.change > 0 ? 'positive' : 'negative'}">
                            ${crypto.change > 0 ? '↑' : '↓'} ${Math.abs(crypto.change).toFixed(2)}%
                        </span>
                    </td>
                    <td>$${formatMarketBillions(crypto.marketCap)}B</td>
                    <td>$${formatMarketBillions(crypto.volume)}B</td>
                    <td>
                        <canvas class="sparkline" id="spark-${crypto.symbol}" width="100" height="40"></canvas>
                    </td>
                    <td>
                        <button class="action-btn" onclick="addToWatchlist('${crypto.symbol}')">
                            ⭐ Watch
                        </button>
                    </td>
                </tr>
            `).join('');

            // Draw sparklines
            setTimeout(() => {
                data.forEach(crypto => {
                    drawSparkline(`spark-${crypto.symbol}`, crypto.trend, crypto.change > 0);
                });
            }, 0);
        }

        // Render Trending List
        function renderTrendingList() {
            const trendingList = document.getElementById('trending-list');
            // Sort by change and take top 5 gainers
            const trending = [...cryptoData]
                .sort((a, b) => b.change - a.change)
                .slice(0, 5);

            trendingList.innerHTML = trending.map(crypto => `
                <div class="trending-item" onclick="selectCrypto('${crypto.symbol}')">
                    <div class="trending-info">
                        <div class="trending-icon">${crypto.icon}</div>
                        <div class="trending-details">
                            <h4>${crypto.name}</h4>
                            <p>${crypto.symbol}</p>
                        </div>
                    </div>
                    <div class="trending-price">
                        <div class="price">$${formatCryptoPrice(crypto.price)}</div>
                        <div class="price-change ${crypto.change > 0 ? 'positive' : 'negative'}">
                            ${crypto.change > 0 ? '↑' : '↓'} ${Math.abs(crypto.change).toFixed(2)}%
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Initialize Chart
        function initChart() {
            const canvas = document.getElementById('price-chart');
            const ctx = canvas.getContext('2d');
            
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            chartData = currentCrypto.trend.length ? currentCrypto.trend : [currentCrypto.price];
            chartLabels = getChartLabels(currentTimeframe, chartData.length);
            drawChart(ctx, canvas.width, canvas.height, chartData, currentTimeframe);
            
            // Setup hover listeners
            setupChartHover(canvas, ctx);
        }
        
        // Setup chart hover interaction
        function setupChartHover(canvas, ctx) {
            const tooltip = document.getElementById('chart-tooltip');
            
            canvas.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const padding = 40;
                const chartWidth = canvas.width - padding * 2;
                
                // Check if mouse is within chart area
                if (x >= padding && x <= canvas.width - padding && y >= padding && y <= canvas.height - padding) {
                    // Find closest data point
                    const pointWidth = chartWidth / (chartData.length - 1);
                    const index = Math.round((x - padding) / pointWidth);
                    
                    if (index >= 0 && index < chartData.length) {
                        hoverIndex = index;
                        
                        // Update tooltip
                        const price = chartData[index];
                        const label = chartLabels[index];
                        
                        tooltip.querySelector('.tooltip-price').textContent = 
                            `$${price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                        tooltip.querySelector('.tooltip-label').textContent = label;
                        
                        // Position tooltip
                        tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
                        tooltip.style.top = (e.clientY - rect.top - 50) + 'px';
                        tooltip.classList.add('visible');
                        
                        // Redraw chart with hover indicator
                        drawChart(ctx, canvas.width, canvas.height, chartData, currentTimeframe);
                    }
                } else {
                    hoverIndex = -1;
                    tooltip.classList.remove('visible');
                    drawChart(ctx, canvas.width, canvas.height, chartData, currentTimeframe);
                }
            });
            
            canvas.addEventListener('mouseleave', () => {
                hoverIndex = -1;
                tooltip.classList.remove('visible');
                drawChart(ctx, canvas.width, canvas.height, chartData, currentTimeframe);
            });
        }

        // Draw Chart
        function drawChart(ctx, width, height, data, timeframe) {
            ctx.clearRect(0, 0, width, height);

            const padding = 40;
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding * 2;

            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;

            // Draw grid lines and Y-axis labels
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillStyle = '#8b93b8';
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            ctx.lineWidth = 1;
            
            for (let i = 0; i <= 5; i++) {
                const y = padding + (chartHeight / 5) * i;
                const priceValue = max - (range / 5) * i;
                
                // Draw grid line
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
                
                // Draw Y-axis price label
                ctx.fillText(
                    `$${priceValue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`,
                    padding - 10,
                    y + 4
                );
            }

            // Draw gradient area
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(79, 172, 254, 0.3)');
            gradient.addColorStop(1, 'rgba(79, 172, 254, 0)');

            ctx.beginPath();
            ctx.moveTo(padding, height - padding);

            data.forEach((value, index) => {
                const x = padding + (chartWidth / (data.length - 1)) * index;
                const y = height - padding - ((value - min) / range) * chartHeight;
                
                if (index === 0) {
                    ctx.lineTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.lineTo(width - padding, height - padding);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw line
            ctx.beginPath();
            ctx.strokeStyle = '#4facfe';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';

            data.forEach((value, index) => {
                const x = padding + (chartWidth / (data.length - 1)) * index;
                const y = height - padding - ((value - min) / range) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();

            // Draw points
            data.forEach((value, index) => {
                const x = padding + (chartWidth / (data.length - 1)) * index;
                const y = height - padding - ((value - min) / range) * chartHeight;
                
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#4facfe';
                ctx.fill();
                ctx.strokeStyle = '#0a0e27';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
            
            // Draw hover indicator
            if (hoverIndex >= 0 && hoverIndex < data.length) {
                const x = padding + (chartWidth / (data.length - 1)) * hoverIndex;
                const y = height - padding - ((data[hoverIndex] - min) / range) * chartHeight;
                
                // Draw vertical line
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(79, 172, 254, 0.5)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.moveTo(x, padding);
                ctx.lineTo(x, height - padding);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw highlighted point
                ctx.beginPath();
                ctx.arc(x, y, 6, 0, Math.PI * 2);
                ctx.fillStyle = '#4facfe';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw outer glow
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(79, 172, 254, 0.3)';
                ctx.lineWidth = 4;
                ctx.stroke();
            }

            // Draw labels
            ctx.fillStyle = '#8b93b8';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            
            const labels = chartLabels.length === data.length
                ? chartLabels
                : getChartLabels(timeframe, data.length);
            const labelStep = Math.ceil(labels.length / 7); // Show max 7 labels
            labels.forEach((label, index) => {
                if (index % labelStep === 0 || index === labels.length - 1) {
                    const x = padding + (chartWidth / (labels.length - 1)) * index;
                    ctx.fillText(label, x, height - 10);
                }
            });
        }
        
        // Get appropriate labels for timeframe
        function getChartLabels(timeframe, dataLength) {
            switch(timeframe) {
                case '1H':
                    return Array.from({length: dataLength}, (_, i) => `${i * 5}m`);
                case '24H':
                    return Array.from({length: dataLength}, (_, i) => `${i}:00`);
                case '7D':
                    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                case '30D':
                    return Array.from({length: dataLength}, (_, i) => `Day ${i + 1}`);
                case '1Y':
                    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                default:
                    return Array.from({length: dataLength}, (_, i) => i.toString());
            }
        }

        // Draw Sparkline
        function drawSparkline(canvasId, data, isPositive) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;

            ctx.beginPath();
            ctx.strokeStyle = isPositive ? '#00ff88' : '#ff4757';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';

            data.forEach((value, index) => {
                const x = (width / (data.length - 1)) * index;
                const y = height - ((value - min) / range) * height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
        }

        // Filter Market
        function filterMarket(filter) {
            currentFilter = filter;
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            renderMarketTable();
        }

        // Change Timeframe
        async function changeTimeframe(timeframe) {
            currentTimeframe = timeframe;
            hoverIndex = -1; // Reset hover
            
            document.querySelectorAll('.timeframe-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            await refreshChartForCurrentSelection();
            
            showToast(`Switched to ${timeframe} timeframe`);
        }

        // Select Crypto
        async function selectCrypto(symbol) {
            const crypto = cryptoData.find(c => c.symbol === symbol);
            if (!crypto) return;
            
            currentCrypto = crypto;
            hoverIndex = -1; // Reset hover

            updateChartHeader(crypto);
            await refreshChartForCurrentSelection();
            
            showToast(`Now viewing ${crypto.name} (${symbol})`);
        }

        // Add to Watchlist
        function addToWatchlist(symbol) {
            showToast(`Added ${symbol} to watchlist ⭐`);
        }

        // Refresh Data
        async function refreshData() {
            const btn = document.getElementById('refresh-text');
            btn.innerHTML = '<span class="loading"></span>';

            await refreshAllData(true);
            btn.textContent = 'Refresh';
        }

        // Live Updates
        function startLiveUpdates() {
            if (pollTimer) {
                clearInterval(pollTimer);
            }

            pollTimer = setInterval(() => {
                refreshAllData(false);
            }, LIVE_POLL_INTERVAL_MS);
        }

        // Search Functionality
        document.getElementById('search-input').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#market-tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });

        // Show Toast
        function showToast(message) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toast-message');
            
            toastMessage.textContent = message;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Helper Functions
        function getRandomColor() {
            const colors = ['#4facfe', '#a855f7', '#00ff88', '#ff4757', '#f59e0b'];
            return colors[Math.floor(Math.random() * colors.length)];
        }

        // Responsive chart resize
        window.addEventListener('resize', () => {
            initChart();
        });