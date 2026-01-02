// Cryptocurrency data
        const cryptoData = [
            { rank: 1, name: 'Bitcoin', symbol: 'BTC', icon: '₿', price: 67842.50, change: 1.85, marketCap: 1.32, volume: 45.2, trend: [65000, 66000, 65500, 67000, 66500, 67500, 67842] },
            { rank: 2, name: 'Ethereum', symbol: 'ETH', icon: 'Ξ', price: 3456.78, change: 2.34, marketCap: 415.3, volume: 28.7, trend: [3300, 3350, 3400, 3420, 3380, 3450, 3456] },
            { rank: 3, name: 'Tether', symbol: 'USDT', icon: '₮', price: 1.00, change: -0.01, marketCap: 95.8, volume: 82.1, trend: [1.00, 1.00, 0.99, 1.00, 1.00, 1.00, 1.00] },
            { rank: 4, name: 'BNB', symbol: 'BNB', icon: '🔶', price: 612.45, change: 3.67, marketCap: 94.2, volume: 3.8, trend: [580, 590, 595, 600, 605, 610, 612] },
            { rank: 5, name: 'Solana', symbol: 'SOL', icon: '◎', price: 178.92, change: 8.45, marketCap: 78.5, volume: 6.2, trend: [160, 165, 168, 172, 175, 177, 178] },
            { rank: 6, name: 'XRP', symbol: 'XRP', icon: '✕', price: 0.6234, change: -1.23, marketCap: 34.1, volume: 2.1, trend: [0.65, 0.64, 0.63, 0.62, 0.63, 0.62, 0.623] },
            { rank: 7, name: 'Cardano', symbol: 'ADA', icon: '₳', price: 0.5821, change: 4.21, marketCap: 20.4, volume: 1.8, trend: [0.55, 0.56, 0.57, 0.575, 0.58, 0.581, 0.582] },
            { rank: 8, name: 'Dogecoin', symbol: 'DOGE', icon: 'Ð', price: 0.1245, change: -2.87, marketCap: 18.2, volume: 2.4, trend: [0.13, 0.128, 0.127, 0.126, 0.125, 0.125, 0.124] },
            { rank: 9, name: 'Polygon', symbol: 'MATIC', icon: '⬡', price: 0.8934, change: 5.67, marketCap: 8.3, volume: 0.9, trend: [0.82, 0.84, 0.86, 0.87, 0.88, 0.89, 0.893] },
            { rank: 10, name: 'Avalanche', symbol: 'AVAX', icon: '🔺', price: 42.18, change: 6.32, marketCap: 15.6, volume: 1.2, trend: [38, 39, 40, 41, 41.5, 42, 42.18] }
        ];

        let currentFilter = 'all';
        let chart = null;
        let currentTimeframe = '7D';
        let currentCrypto = cryptoData[0]; // Default to Bitcoin
        let chartData = [];
        let chartLabels = [];
        let hoverIndex = -1;

        // Generate data for different timeframes
        function generateTimeframeData(timeframe, basePrice) {
            let dataPoints;
            let baseValue = basePrice;
            
            switch(timeframe) {
                case '1H':
                    dataPoints = 12; // 5-minute intervals
                    break;
                case '24H':
                    dataPoints = 24; // hourly
                    break;
                case '7D':
                    dataPoints = 7; // daily
                    break;
                case '30D':
                    dataPoints = 30; // daily
                    break;
                case '1Y':
                    dataPoints = 12; // monthly
                    break;
            }
            
            const data = [];
            for (let i = 0; i < dataPoints; i++) {
                const variation = (Math.random() - 0.5) * baseValue * 0.05;
                baseValue += variation;
                data.push(baseValue);
            }
            return data;
        }

        // Initialize
        window.addEventListener('load', () => {
            renderMarketTable();
            renderTrendingList();
            initChart();
            startLiveUpdates();
        });

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
                    <td>$${crypto.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>
                        <span class="price-change ${crypto.change > 0 ? 'positive' : 'negative'}">
                            ${crypto.change > 0 ? '↑' : '↓'} ${Math.abs(crypto.change).toFixed(2)}%
                        </span>
                    </td>
                    <td>$${crypto.marketCap.toFixed(1)}B</td>
                    <td>$${crypto.volume.toFixed(1)}B</td>
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
                        <div class="price">$${crypto.price.toLocaleString()}</div>
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

            chartData = generateTimeframeData(currentTimeframe, currentCrypto.price);
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
            const range = max - min;

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
            
            const labels = getChartLabels(timeframe, data.length);
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
            const range = max - min;

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
        function changeTimeframe(timeframe) {
            currentTimeframe = timeframe;
            hoverIndex = -1; // Reset hover
            
            document.querySelectorAll('.timeframe-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Redraw chart with new timeframe for current crypto
            const canvas = document.getElementById('price-chart');
            const ctx = canvas.getContext('2d');
            chartData = generateTimeframeData(timeframe, currentCrypto.price);
            chartLabels = getChartLabels(timeframe, chartData.length);
            drawChart(ctx, canvas.width, canvas.height, chartData, timeframe);
            
            showToast(`Switched to ${timeframe} timeframe`);
        }

        // Select Crypto
        function selectCrypto(symbol) {
            const crypto = cryptoData.find(c => c.symbol === symbol);
            if (!crypto) return;
            
            currentCrypto = crypto;
            hoverIndex = -1; // Reset hover
            
            // Update chart title and price
            document.querySelector('.chart-title').textContent = `${crypto.name} (${crypto.symbol})`;
            document.getElementById('current-price').textContent = 
                crypto.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            // Update price change indicator
            const priceChangeEl = document.querySelector('.chart-header .price-change');
            const changeAmount = (crypto.price * crypto.change / 100).toFixed(2);
            priceChangeEl.className = `price-change ${crypto.change > 0 ? 'positive' : 'negative'}`;
            priceChangeEl.innerHTML = `${crypto.change > 0 ? '↑' : '↓'} $${Math.abs(changeAmount)} (${Math.abs(crypto.change).toFixed(2)}%)`;
            
            // Redraw chart with selected crypto
            const canvas = document.getElementById('price-chart');
            const ctx = canvas.getContext('2d');
            chartData = generateTimeframeData(currentTimeframe, crypto.price);
            chartLabels = getChartLabels(currentTimeframe, chartData.length);
            drawChart(ctx, canvas.width, canvas.height, chartData, currentTimeframe);
            
            showToast(`Now viewing ${crypto.name} (${symbol})`);
        }

        // Add to Watchlist
        function addToWatchlist(symbol) {
            showToast(`Added ${symbol} to watchlist ⭐`);
        }

        // Refresh Data
        function refreshData() {
            const btn = document.getElementById('refresh-text');
            btn.innerHTML = '<span class="loading"></span>';
            
            setTimeout(() => {
                // Simulate price updates with more realistic changes
                cryptoData.forEach(crypto => {
                    const change = (Math.random() - 0.5) * 5; // -2.5% to +2.5%
                    crypto.price *= (1 + change / 100);
                    // Update change but keep it realistic
                    crypto.change += change * 0.3; // Gradual change
                    // Keep change within reasonable bounds
                    crypto.change = Math.max(-15, Math.min(15, crypto.change));
                });
                
                renderMarketTable();
                renderTrendingList();
                btn.innerHTML = '🔄 Refresh';
                showToast('Data refreshed successfully! 🎉');
            }, 1000);
        }

        // Live Updates
        function startLiveUpdates() {
            setInterval(() => {
                // Simulate small price changes
                cryptoData.forEach(crypto => {
                    const change = (Math.random() - 0.5) * 0.5;
                    crypto.price *= (1 + change / 100);
                });
                
                // Update current price display for the currently viewed crypto
                if (currentCrypto) {
                    document.getElementById('current-price').textContent = 
                        currentCrypto.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                }
            }, 3000);
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