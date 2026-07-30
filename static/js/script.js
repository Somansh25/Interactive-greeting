// --- DOM & Canvas Setup ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const messageInput = document.getElementById('messageInput');
const themeSelect = document.getElementById('themeSelect');
const audioBtn = document.getElementById('audioBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const shareBtn = document.getElementById('shareBtn');
const popScoreEl = document.getElementById('popScore');
const toast = document.getElementById('toast');

let GREETING_TEXT = canvas.dataset.message || "HAPPY BIRTHDAY! to You";
let CURRENT_THEME = canvas.dataset.theme || "neon";

let width, height, dpr;
let popScore = 0;
let isPaused = false;

// High-DPI Display Canvas Scaling
function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
}

// --- Web Audio API Synthesizer ---
let audioCtx = null;
let audioEnabled = false;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPopSound() {
    if (!audioEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
}

function playBurstSound() {
    if (!audioEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

function playChimeSound() {
    if (!audioEnabled || !audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.08, audioCtx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(audioCtx.currentTime + idx * 0.08);
        osc.stop(audioCtx.currentTime + idx * 0.08 + 0.6);
    });
}

// --- Color Themes ---
const THEMES = {
    neon: (x, totalWidth) => {
        const hue = (x / totalWidth) * 360;
        return { main: `hsl(${hue}, 85%, 55%)`, light: `hsl(${hue}, 85%, 75%)`, hue };
    },
    cyberpunk: (x, totalWidth) => {
        const colors = [
            { main: '#00f3ff', light: '#80f9ff', hue: 185 },
            { main: '#ff0055', light: '#ff6699', hue: 340 },
            { main: '#9d00ff', light: '#ce80ff', hue: 275 },
            { main: '#ffee00', light: '#fff566', hue: 55 }
        ];
        return colors[Math.floor((x / totalWidth) * colors.length) % colors.length];
    },
    pastel: (x, totalWidth) => {
        const hue = (x / totalWidth) * 360;
        return { main: `hsl(${hue}, 70%, 75%)`, light: `hsl(${hue}, 80%, 90%)`, hue };
    },
    fire: (x, totalWidth) => {
        const hue = 10 + (x / totalWidth) * 45;
        return { main: `hsl(${hue}, 95%, 55%)`, light: `hsl(${hue}, 95%, 75%)`, hue };
    }
};

// --- Ambient Starry Background ---
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 70; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5,
            alpha: Math.random()
        });
    }
}

function updateStars() {
    ctx.save();
    stars.forEach(star => {
        star.alpha += (Math.random() - 0.5) * 0.02;
        star.alpha = Math.max(0.1, Math.min(0.8, star.alpha));
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

// --- Confetti Engine ---
let confetti = [];
function triggerConfetti() {
    for (let i = 0; i < 60; i++) {
        confetti.push({
            x: width / 2,
            y: height / 2,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.7) * 10,
            size: Math.random() * 6 + 4,
            color: `hsl(${Math.random() * 360}, 80%, 60%)`,
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 10,
            alpha: 1
        });
    }
}

function updateConfetti() {
    for (let i = confetti.length - 1; i >= 0; i--) {
        const c = confetti[i];
        c.x += c.vx;
        c.y += c.vy;
        c.vy += 0.2;
        c.rotation += c.vRot;
        c.alpha -= 0.015;

        if (c.alpha <= 0) {
            confetti.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = c.alpha;
        ctx.translate(c.x, c.y);
        ctx.rotate((c.rotation * Math.PI) / 180);
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
        ctx.restore();
    }
}

// --- Shockwave & Spark Particles ---
function ExplosionRing(x, y, hue) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.maxRadius = 35 + Math.random() * 15;
    this.alpha = 0.8;
    this.hue = hue;
}

ExplosionRing.prototype.update = function() {
    this.radius += (this.maxRadius - this.radius) * 0.12;
    this.alpha -= 0.035;
};

ExplosionRing.prototype.draw = function() {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0, this.radius), 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${Math.max(0, this.alpha)})`;
    ctx.fill();
    ctx.restore();
};

function Spark(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.color = color;
    this.friction = 0.95;
    this.gravity = 0.08;
}

Spark.prototype.update = function() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.022;
};

Spark.prototype.draw = function() {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};

// --- Cursor & Touch Wind Interaction ---
let mouse = { x: -1000, y: -1000 };

function updatePointerPos(e) {
    mouse.x = e.clientX || (e.touches && e.touches[0].clientX) || -1000;
    mouse.y = e.clientY || (e.touches && e.touches[0].clientY) || -1000;
}

window.addEventListener('mousemove', updatePointerPos);
window.addEventListener('touchmove', updatePointerPos);
window.addEventListener('mouseleave', () => { mouse.x = -1000; mouse.y = -1000; });

// --- Main Letter & Balloon Class ---
const opts = {
    charSize: Math.min(32, window.innerWidth / 12),
    lineHeight: 48,
    fireworkSpeed: 10,
    sparkCount: 25,
    holdDuration: 180,
    balloonSpeed: 2.2
};

function Letter(char, x, y) {
    this.char = char;
    this.x = x;
    this.targetX = x;
    this.firework0y = y;

    this.applyTheme();
    this.reset();
}

Letter.prototype.applyTheme = function() {
    const palette = THEMES[CURRENT_THEME](this.targetX, width);
    this.color = palette.main;
    this.lightColor = palette.light;
    this.hue = palette.hue || 200;
};

Letter.prototype.reset = function() {
    this.phase = "firework";
    this.x = this.targetX;
    this.currentY = height + 50 + Math.random() * 150;
    this.vy = -opts.fireworkSpeed - Math.random() * 3;
    this.sparks = [];
    this.rings = [];
    this.holdTimer = 0;
    
    this.balloonDelay = Math.floor(Math.random() * 35);
    this.balloonStringLen = 35;
    this.swayOffset = Math.random() * 100;
};

Letter.prototype.pop = function() {
    playPopSound();
    popScore++;
    popScoreEl.innerText = popScore;

    for (let i = 0; i < 15; i++) {
        this.sparks.push(new Spark(this.x, this.currentY - this.balloonStringLen - 12, this.lightColor));
    }
    this.reset();
};

Letter.prototype.update = function() {
    if (this.phase === "firework") {
        this.currentY += this.vy;
        if (this.currentY <= this.firework0y) {
            this.currentY = this.firework0y;
            this.phase = "hold";
            playBurstSound();
            
            this.rings.push(new ExplosionRing(this.x, this.currentY, this.hue));
            for (let i = 0; i < opts.sparkCount; i++) {
                this.sparks.push(new Spark(this.x, this.currentY, this.lightColor));
            }
        }
    } else if (this.phase === "hold") {
        this.holdTimer++;
        if (this.holdTimer > opts.holdDuration + this.balloonDelay) {
            this.phase = "balloon";
        }
    } else if (this.phase === "balloon") {
        this.currentY -= opts.balloonSpeed;
        this.swayOffset += 0.04;
        
        let vx = Math.sin(this.swayOffset) * 0.7;

        // Wind force interaction
        const balloonY = this.currentY - this.balloonStringLen - 12;
        const dx = this.x - mouse.x;
        const dy = balloonY - mouse.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 90) {
            const force = (90 - dist) / 90;
            vx += (dx / dist) * force * 4;
        }

        this.x += vx;
    }

    this.rings.forEach(r => r.update());
    this.sparks.forEach(s => s.update());
    this.rings = this.rings.filter(r => r.alpha > 0);
    this.sparks = this.sparks.filter(s => s.alpha > 0);
};

Letter.prototype.draw = function() {
    this.rings.forEach(r => r.draw());
    this.sparks.forEach(s => s.draw());

    if (this.phase === "firework") {
        ctx.fillStyle = this.lightColor;
        ctx.beginPath();
        ctx.arc(this.x, this.currentY, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.save();
        
        if (this.phase === "balloon") {
            const balloonY = this.currentY - this.balloonStringLen;
            
            // Balloon String
            ctx.beginPath();
            ctx.strokeStyle = this.lightColor;
            ctx.lineWidth = 1.5;
            ctx.moveTo(this.x, this.currentY - 15);
            ctx.lineTo(this.x, balloonY);
            ctx.stroke();

            // Balloon Body
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(this.x, balloonY - 12, 10, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Balloon Knot
            ctx.beginPath();
            ctx.arc(this.x, balloonY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Render Character
        ctx.fillStyle = this.color;
        ctx.font = `bold ${opts.charSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, this.x, this.currentY);
        
        ctx.restore();
    }
};

// --- Global Engine Manager ---
let letters = [];
let hasPlayedChime = false;

function initLetters() {
    letters = [];
    hasPlayedChime = false;
    opts.charSize = Math.min(36, width / (GREETING_TEXT.length > 15 ? 16 : 10));

    const lines = GREETING_TEXT.split(" ");
    const startY = height / 2 - (lines.length * opts.lineHeight) / 2;

    lines.forEach((line, lineIdx) => {
        const charCount = line.length;
        const letterSpacing = opts.charSize * 0.8;
        const lineTotalWidth = charCount * letterSpacing;
        const startX = (width - lineTotalWidth) / 2 + letterSpacing / 2;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const x = startX + i * letterSpacing;
            const y = startY + lineIdx * opts.lineHeight;

            if (char.trim() !== "") {
                letters.push(new Letter(char, x, y));
            }
        }
    });
}

function checkStateEvents() {
    const allHolding = letters.length > 0 && letters.every(l => l.phase === "hold" || l.phase === "balloon");
    if (allHolding && !hasPlayedChime) {
        hasPlayedChime = true;
        triggerConfetti();
        playChimeSound();
    }

    const allOffscreen = letters.length > 0 && letters.every(l => l.phase === "balloon" && l.currentY < -100);
    if (allOffscreen) {
        initLetters();
    }
}

// --- Click / Tap Balloon Popping Mechanic ---
function handlePointerDown(e) {
    if (isPaused) return;
    initAudio();
    const clickX = e.clientX || (e.touches && e.touches[0].clientX);
    const clickY = e.clientY || (e.touches && e.touches[0].clientY);

    letters.forEach(letter => {
        if (letter.phase === "balloon") {
            const balloonY = letter.currentY - letter.balloonStringLen - 12;
            const dist = Math.hypot(clickX - letter.x, clickY - balloonY);
            if (dist < 26) {
                letter.pop();
            }
        }
    });
}

window.addEventListener('click', handlePointerDown);
window.addEventListener('touchstart', handlePointerDown);

// --- Live Debounced Typing Handler ---
let debounceTimer;

messageInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const val = e.target.value.trim();
        if (val.length > 0 && val !== GREETING_TEXT) {
            GREETING_TEXT = val;
            initAudio();
            initLetters();
        }
    }, 400);
});

messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        clearTimeout(debounceTimer);
        const val = e.target.value.trim();
        if (val.length > 0) {
            GREETING_TEXT = val;
            initAudio();
            initLetters();
            messageInput.blur();
        }
    }
});

// --- UI Controls ---
themeSelect.value = CURRENT_THEME;
themeSelect.addEventListener('change', (e) => {
    CURRENT_THEME = e.target.value;
    letters.forEach(letter => letter.applyTheme());
});

audioBtn.addEventListener('click', () => {
    initAudio();
    audioEnabled = !audioEnabled;
    audioBtn.innerHTML = audioEnabled 
        ? '<i class="fa-solid fa-volume-high"></i> <span>Sound</span>' 
        : '<i class="fa-solid fa-volume-xmark"></i> <span>Muted</span>';
});

playPauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Play</span>';
        playPauseBtn.classList.add('paused');
    } else {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pause</span>';
        playPauseBtn.classList.remove('paused');
    }
});

shareBtn.addEventListener('click', () => {
    const url = `${window.location.origin}${window.location.pathname}?message=${encodeURIComponent(GREETING_TEXT)}&theme=${CURRENT_THEME}`;
    navigator.clipboard.writeText(url).then(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    });
});

window.addEventListener('resize', () => {
    resizeCanvas();
    initStars();
    initLetters();
});

// --- Render Animation Loop ---
function animate() {
    if (!isPaused) {
        ctx.fillStyle = 'rgba(5, 5, 5, 0.22)';
        ctx.fillRect(0, 0, width, height);

        updateStars();
        updateConfetti();

        letters.forEach(letter => {
            letter.update();
            letter.draw();
        });

        checkStateEvents();
    }
    requestAnimationFrame(animate);
}

// --- Start Engine ---
resizeCanvas();
initStars();
initLetters();
animate();
