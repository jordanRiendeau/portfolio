const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game state
let gameState = 'start'; // start, playing, paused, gameover
let score = 0;
let lives = 3;
let level = 1;
let enemiesDestroyed = 0;

// Player
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    speed: 5,
    dx: 0
};

// Arrays
const bullets = [];
const enemies = [];
const particles = [];
const powerups = [];
const stars = [];

// Power-up state
let powerupActive = {
    rapidFire: false,
    shield: false,
    multiShot: false
};

let powerupTimers = {};

// Controls
const keys = {};

// Initialize stars background
function initStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 2 + 1
        });
    }
}

// Draw stars
function drawStars() {
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

// Draw player
function drawPlayer() {
    // Player ship (triangle)
    ctx.fillStyle = powerupActive.shield ? '#00ff88' : '#00ffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = powerupActive.shield ? '#00ff88' : '#00ffff';
    
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 20, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

// Create bullet
function shoot() {
    if (powerupActive.multiShot) {
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            speed: 7,
            dx: -2
        });
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            speed: 7,
            dx: 0
        });
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            speed: 7,
            dx: 2
        });
    } else {
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y,
            width: 4,
            height: 15,
            speed: 7,
            dx: 0
        });
    }
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00ff';
    
    bullets.forEach((bullet, index) => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        bullet.y -= bullet.speed;
        bullet.x += bullet.dx;
        
        if (bullet.y < 0 || bullet.x < 0 || bullet.x > canvas.width) {
            bullets.splice(index, 1);
        }
    });
    
    ctx.shadowBlur = 0;
}

// Create enemies
function spawnEnemy() {
    const types = ['basic', 'fast', 'tough'];
    const type = types[Math.floor(Math.random() * Math.min(types.length, Math.floor(level / 2) + 1))];
    
    let enemy = {
        x: Math.random() * (canvas.width - 40),
        y: -50,
        width: 40,
        height: 40,
        speed: 1 + level * 0.2,
        type: type,
        health: 1,
        color: '#ff4757'
    };
    
    if (type === 'fast') {
        enemy.speed *= 1.5;
        enemy.color = '#ffa502';
    } else if (type === 'tough') {
        enemy.health = 3;
        enemy.color = '#ff6348';
        enemy.width = 50;
        enemy.height = 50;
    }
    
    enemies.push(enemy);
}

// Draw enemies
function drawEnemies() {
    enemies.forEach((enemy, index) => {
        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;
        
        // Enemy ship (inverted triangle)
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.closePath();
        ctx.fill();
        
        // Health bar for tough enemies
        if (enemy.type === 'tough') {
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(enemy.x, enemy.y - 10, (enemy.width / 3) * enemy.health, 3);
        }
        
        enemy.y += enemy.speed;
        
        // Remove if off screen
        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
            if (!powerupActive.shield) {
                lives--;
                updateStats();
                if (lives <= 0) {
                    gameOver();
                }
            }
        }
    });
    
    ctx.shadowBlur = 0;
}

// Create particle effect
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            color: color
        });
    }
}

// Draw particles
function drawParticles() {
    particles.forEach((particle, index) => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        ctx.fillRect(particle.x, particle.y, 3, 3);
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
    ctx.globalAlpha = 1;
}

// Spawn power-up
function spawnPowerup(x, y) {
    if (Math.random() < 0.3) { // 30% chance
        const types = ['rapidFire', 'shield', 'multiShot'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerups.push({
            x: x,
            y: y,
            width: 30,
            height: 30,
            speed: 2,
            type: type,
            icon: type === 'rapidFire' ? '⚡' : type === 'shield' ? '🛡️' : '🔱'
        });
    }
}

// Draw power-ups
function drawPowerups() {
    powerups.forEach((powerup, index) => {
        ctx.font = '30px Arial';
        ctx.fillText(powerup.icon, powerup.x, powerup.y);
        
        powerup.y += powerup.speed;
        
        // Check collision with player
        if (powerup.x < player.x + player.width &&
            powerup.x + powerup.width > player.x &&
            powerup.y < player.y + player.height &&
            powerup.y + powerup.height > player.y) {
            
            activatePowerup(powerup.type);
            powerups.splice(index, 1);
        }
        
        if (powerup.y > canvas.height) {
            powerups.splice(index, 1);
        }
    });
}

// Activate power-up
function activatePowerup(type) {
    powerupActive[type] = true;
    
    if (powerupTimers[type]) {
        clearTimeout(powerupTimers[type]);
    }
    
    powerupTimers[type] = setTimeout(() => {
        powerupActive[type] = false;
    }, 10000); // 10 seconds
    
    updatePowerupDisplay();
}

// Update power-up display
function updatePowerupDisplay() {
    // This would be handled by the UI
}

// Collision detection
function checkCollisions() {
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                
                enemy.health--;
                bullets.splice(bIndex, 1);
                
                if (enemy.health <= 0) {
                    createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);
                    spawnPowerup(enemy.x, enemy.y);
                    enemies.splice(eIndex, 1);
                    score += enemy.type === 'tough' ? 30 : enemy.type === 'fast' ? 20 : 10;
                    enemiesDestroyed++;
                    updateStats();
                    
                    // Level up every 10 enemies
                    if (enemiesDestroyed % 10 === 0) {
                        level++;
                        updateStats();
                    }
                }
            }
        });
    });
    
    // Check enemy-player collision
    if (!powerupActive.shield) {
        enemies.forEach((enemy, index) => {
            if (enemy.x < player.x + player.width &&
                enemy.x + enemy.width > player.x &&
                enemy.y < player.y + player.height &&
                enemy.y + enemy.height > player.y) {
                
                enemies.splice(index, 1);
                lives--;
                createParticles(player.x + player.width / 2, player.y + player.height / 2, '#00ffff');
                updateStats();
                
                if (lives <= 0) {
                    gameOver();
                }
            }
        });
    }
}

// Update player position
function updatePlayer() {
    player.x += player.dx;
    
    // Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
}

// Update stats display
function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = lives;
    document.getElementById('level').textContent = level;
}

// Game loop
let lastShot = 0;
function gameLoop() {
    if (gameState !== 'playing') return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawStars();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawParticles();
    drawPowerups();
    
    updatePlayer();
    checkCollisions();
    
    // Auto shoot
    const shootDelay = powerupActive.rapidFire ? 150 : 300;
    if (keys['Space'] && Date.now() - lastShot > shootDelay) {
        shoot();
        lastShot = Date.now();
    }
    
    // Spawn enemies
    if (Math.random() < 0.02 + level * 0.005) {
        spawnEnemy();
    }
    
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    gameState = 'playing';
    score = 0;
    lives = 3;
    level = 1;
    enemiesDestroyed = 0;
    bullets.length = 0;
    enemies.length = 0;
    particles.length = 0;
    powerups.length = 0;
    powerupActive = { rapidFire: false, shield: false, multiShot: false };
    
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 80;
    
    updateStats();
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    gameLoop();
}

// Game over
function gameOver() {
    gameState = 'gameover';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'ArrowLeft') player.dx = -player.speed;
    if (e.code === 'ArrowRight') player.dx = player.speed;
    if (e.code === 'Escape' && gameState === 'playing') {
        gameState = 'paused';
        // Show pause overlay
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        player.dx = 0;
    }
});

// Initialize
initStars();
updateStats();
