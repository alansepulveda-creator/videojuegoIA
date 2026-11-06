
/* =========================================
   ASTRO ESCAPE 3.0
   Juego espacial estilo DANMAKU / TOUHOU
   - Patrones de meteoritos
   - Hitbox central pequeña
   - Movimiento de precisión con SHIFT
   - Combustible y objetos bonus
   - Dificultad progresiva
========================================= */


/* =========================================
   ELEMENTOS HTML
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const messageElement = document.getElementById("message");
const startButton = document.getElementById("startButton");

const fuelBar = document.getElementById("fuelBar");
const fuelText = document.getElementById("fuelText");

const difficultySelect = document.getElementById("difficulty");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const upButton = document.getElementById("upButton");
const downButton = document.getElementById("downButton");


/* =========================================
   CONFIGURACIÓN DE DIFICULTADES
========================================= */

const difficulties = {

    easy: {
        meteorInterval: 1.8,
        meteorSpeedMin: 120,
        meteorSpeedMax: 180,
        fuelDrain: 1.5,
        objectInterval: 4,
        objectSpeed: 120
    },

    normal: {
        meteorInterval: 1.4,
        meteorSpeedMin: 180,
        meteorSpeedMax: 280,
        fuelDrain: 2.5,
        objectInterval: 4.5,
        objectSpeed: 150
    },

    hard: {
        meteorInterval: 1.1,
        meteorSpeedMin: 250,
        meteorSpeedMax: 350,
        fuelDrain: 3.5,
        objectInterval: 4,
        objectSpeed: 180
    },

    nightmare: {
        meteorInterval: 0.9,
        meteorSpeedMin: 320,
        meteorSpeedMax: 430,
        fuelDrain: 4.5,
        objectInterval: 3.8,
        objectSpeed: 210
    },

    lunatic: {
        meteorInterval: 0.75,
        meteorSpeedMin: 400,
        meteorSpeedMax: 520,
        fuelDrain: 5.5,
        objectInterval: 3.5,
        objectSpeed: 250
    }

};

let currentDifficulty = "normal";

let difficultyMultiplier = 1;
let survivalTime = 0;


/* =========================================
   ESTADO DEL JUEGO
========================================= */

let gameState = "ready";

let score = 0;
let fuel = 100;

let meteorites = [];
let objects = [];

let lastTime = 0;

let meteorTimer = 0;
let objectTimer = 0;

let spiralAngle = 0;


/* =========================================
   NAVE ESPACIAL
========================================= */

const player = {

    x: 220,
    y: 550,

    width: 40,
    height: 45,

    speed: 480,

    // Hitbox central de estilo Touhou
    hitboxRadius: 4

};


/* =========================================
   CONTROLES
========================================= */

const keys = {

    left: false,
    right: false,
    up: false,
    down: false,
    shift: false

};


/* =========================================
   ESTRELLAS DEL FONDO
========================================= */

const stars = Array.from({ length: 80 }, () => ({

    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,

    size: Math.random() * 2 + 1,

    opacity: 0.4 + Math.random() * 0.6

}));


/* =========================================
   ACTUALIZAR BARRA DE COMBUSTIBLE
========================================= */

function updateFuelBar() {

    fuel = Math.max(0, Math.min(100, fuel));

    fuelBar.style.width = fuel + "%";

    fuelText.textContent = Math.ceil(fuel) + "%";

    if (fuel <= 25) {

        fuelBar.classList.add("low");

    } else {

        fuelBar.classList.remove("low");

    }

}


/* =========================================
   FONDO ESPACIAL
========================================= */

function drawBackground() {

    ctx.fillStyle = "#070b20";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    stars.forEach(star => {

        ctx.fillStyle = "white";
        ctx.globalAlpha = star.opacity;

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.size,
            0,
            Math.PI * 2
        );

        ctx.fill();

    });

    ctx.globalAlpha = 1;

}


/* =========================================
   DIBUJAR NAVE
========================================= */

function drawPlayer() {

    ctx.save();

    ctx.translate(
        player.x + player.width / 2,
        player.y + player.height / 2
    );

    // Motor
    ctx.fillStyle = "#ff9d35";

    ctx.beginPath();

    ctx.moveTo(-9, 15);
    ctx.lineTo(0, 38 + Math.random() * 5);
    ctx.lineTo(9, 15);

    ctx.fill();

    // Cuerpo
    ctx.fillStyle = "#55eaff";

    ctx.beginPath();

    ctx.moveTo(0, -23);
    ctx.lineTo(19, 18);
    ctx.lineTo(0, 10);
    ctx.lineTo(-19, 18);

    ctx.closePath();
    ctx.fill();

    // Ventana
    ctx.fillStyle = "white";

    ctx.beginPath();

    ctx.arc(
        0,
        -5,
        6,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

}


/* =========================================
   MOSTRAR HITBOX (OPCIONAL)
========================================= */

// Cambia a true si quieres visualizar
// el pequeño círculo vulnerable.

const showHitbox = false;

function drawHitbox() {

    if (!showHitbox) return;

    ctx.save();

    ctx.beginPath();

    ctx.arc(
        player.x + player.width / 2,
        player.y + player.height / 2,
        player.hitboxRadius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "red";
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;

    ctx.stroke();

    ctx.restore();

}


/* =========================================
   CREAR METEORITOS
========================================= */

function createMeteorite(x, y, angle = 0) {

    const difficulty = difficulties[currentDifficulty];

    const baseSpeed =
        Math.random() *
        (difficulty.meteorSpeedMax - difficulty.meteorSpeedMin) +
        difficulty.meteorSpeedMin;

    const speed = baseSpeed * difficultyMultiplier;

    meteorites.push({

        x: x,
        y: y,

        radius: 15 + Math.random() * 8,

        speed: speed,

        // Dirección del movimiento
        vx: Math.sin(angle) * speed,
        vy: Math.cos(angle) * speed,

        passed: false,
        nearMissChecked: false

    });

}


/* =========================================
   PATRONES DE METEORITOS
   ESTILO TOUHOU / DANMAKU
========================================= */

function createMeteorPattern() {

    const meteorCount = {

        easy: 3,
        normal: 4,
        hard: 5,
        nightmare: 6,
        lunatic: 7

    };

    const count = meteorCount[currentDifficulty];

    const baseX =
        40 + Math.random() * (canvas.width - 80);

    const baseY = -25;

    const pattern = Math.random();


    /* -------------------------------------
       PATRÓN 1: ABANICO
    ------------------------------------- */

    if (pattern < 0.4) {

        for (let i = 0; i < count; i++) {

            const angle =
                -0.75 + (i / (count - 1)) * 1.5;

            createMeteorite(
                baseX + angle * 10,
                baseY,
                angle
            );

        }

    }


    /* -------------------------------------
       PATRÓN 2: DIRIGIDOS A LA NAVE
    ------------------------------------- */

    else if (pattern < 0.75) {

        const targetX =
            player.x + player.width / 2;

        const targetY =
            player.y + player.height / 2;

        const angle = Math.atan2(
            targetX - baseX,
            targetY - baseY
        );

        const spread = 0.20;

        for (let i = 0; i < 3; i++) {

            const offset = (i - 1) * spread;

            createMeteorite(
                baseX + offset * 15,
                baseY,
                angle + offset
            );

        }

    }


    /* -------------------------------------
       PATRÓN 3: ABANICO GIRATORIO
    ------------------------------------- */

    else {

        spiralAngle += 0.45;

        for (let i = 0; i < count; i++) {

            const position = i / (count - 1);

            const angle =
                -1.0 +
                position * 2.0 +
                Math.sin(spiralAngle) * 0.35;

            createMeteorite(
                baseX,
                baseY,
                angle
            );

        }

    }

}


/* =========================================
   CREAR OBJETOS BONUS
========================================= */

function createObject() {

    const difficulty = difficulties[currentDifficulty];

    // Más posibilidades de combustible
    // en dificultades altas.

    const fuelChance = {

        easy: 0.50,
        normal: 0.50,
        hard: 0.55,
        nightmare: 0.60,
        lunatic: 0.65

    };

    const type =
        Math.random() < fuelChance[currentDifficulty]
            ? "fuel"
            : "star";

    objects.push({

        type: type,

        x: 30 + Math.random() * (canvas.width - 60),

        y: -30,

        speed:
            difficulty.objectSpeed *
            Math.sqrt(difficultyMultiplier),

        collected: false

    });

}


/* =========================================
   DIBUJAR METEORITOS
========================================= */

function drawMeteorites() {

    meteorites.forEach(meteor => {

        ctx.save();

        ctx.font = "36px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "☄️",
            meteor.x,
            meteor.y + 12
        );

        ctx.restore();

    });

}


/* =========================================
   DIBUJAR OBJETOS BONUS
========================================= */

function drawObjects() {

    objects.forEach(object => {

        ctx.font = "35px Arial";
        ctx.textAlign = "center";

        if (object.type === "fuel") {

            ctx.fillText(
                "⛽",
                object.x,
                object.y + 12
            );

        }

        if (object.type === "star") {

            ctx.fillText(
                "⭐",
                object.x,
                object.y + 12
            );

        }

    });

    ctx.textAlign = "left";

}


/* =========================================
   HITBOX CENTRAL ESTILO TOUHOU
========================================= */

function checkCollision(meteor) {

    const playerCenterX =
        player.x + player.width / 2;

    const playerCenterY =
        player.y + player.height / 2;

    const dx = meteor.x - playerCenterX;
    const dy = meteor.y - playerCenterY;

    // Hitbox visual del meteorito reducida
    const meteorHitboxRadius = meteor.radius * 0.55;

    const collisionDistance =
        player.hitboxRadius + meteorHitboxRadius;

    return (
        dx * dx + dy * dy <
        collisionDistance * collisionDistance
    );

}


/* =========================================
   DISTANCIA ENTRE METEORITO Y NAVE
========================================= */

function distanceToPlayer(meteor) {

    const playerCenterX =
        player.x + player.width / 2;

    const playerCenterY =
        player.y + player.height / 2;

    const dx = meteor.x - playerCenterX;
    const dy = meteor.y - playerCenterY;

    return Math.sqrt(dx * dx + dy * dy);

}


/* =========================================
   MOVER NAVE
========================================= */

function movePlayer(deltaTime) {

    const normalSpeed = 480;
    const slowSpeed = 170;

    // SHIFT activa el movimiento de precisión
    const currentSpeed = keys.shift
        ? slowSpeed
        : normalSpeed;

    let moveX = 0;
    let moveY = 0;

    if (keys.left) moveX--;
    if (keys.right) moveX++;

    if (keys.up) moveY--;
    if (keys.down) moveY++;

    // Normalizar movimiento diagonal
    const magnitude = Math.sqrt(
        moveX * moveX + moveY * moveY
    );

    if (magnitude > 0) {

        moveX /= magnitude;
        moveY /= magnitude;

    }

    player.x += moveX * currentSpeed * deltaTime;
    player.y += moveY * currentSpeed * deltaTime;

    // Limitar movimiento al canvas
    player.x = Math.max(
        0,
        Math.min(
            canvas.width - player.width,
            player.x
        )
    );

    player.y = Math.max(
        0,
        Math.min(
            canvas.height - player.height,
            player.y
        )
    );

}


/* =========================================
   ACTUALIZAR METEORITOS
========================================= */

function updateMeteorites(deltaTime) {

    const difficulty = difficulties[currentDifficulty];

    meteorTimer += deltaTime;

    // Intervalo de aparición progresivo
    const currentInterval = Math.max(
        0.7,
        difficulty.meteorInterval /
        Math.sqrt(difficultyMultiplier)
    );

    if (meteorTimer >= currentInterval) {

        createMeteorPattern();

        meteorTimer = 0;

    }


    for (const meteor of meteorites) {

        // Movimiento horizontal y vertical
        meteor.x += meteor.vx * deltaTime;
        meteor.y += meteor.vy * deltaTime;


        // Comprobar colisión
        if (checkCollision(meteor)) {

            endGame("¡Chocaste contra un meteorito!");

            return;

        }


        // BONUS POR PASAR CERCA
        if (
            !meteor.nearMissChecked &&
            !meteor.passed
        ) {

            const distance = distanceToPlayer(meteor);

            const nearMissDistance =
                meteor.radius +
                player.hitboxRadius +
                18;

            if (
                distance <= nearMissDistance &&
                distance > meteor.radius * 0.55 +
                player.hitboxRadius
            ) {

                meteor.nearMissChecked = true;

                score += 15;

                scoreElement.textContent = score;

                messageElement.textContent =
                    "🔥 ¡MANIOBRA PERFECTA! +15 puntos";

            }

        }


        // PUNTO POR ESQUIVAR
        if (
            !meteor.passed &&
            meteor.y - meteor.radius >
            player.y + player.height
        ) {

            meteor.passed = true;

            score++;

            scoreElement.textContent = score;

        }

    }


    // Eliminar meteoritos fuera del canvas
    meteorites = meteorites.filter(meteor =>

        meteor.y > -100 &&
        meteor.y < canvas.height + 100 &&
        meteor.x > -100 &&
        meteor.x < canvas.width + 100

    );

}


/* =========================================
   ACTUALIZAR OBJETOS BONUS
========================================= */

function updateObjects(deltaTime) {

    const difficulty = difficulties[currentDifficulty];

    objectTimer += deltaTime;

    const currentObjectInterval =
        difficulty.objectInterval /
        Math.sqrt(difficultyMultiplier);

    if (objectTimer >= currentObjectInterval) {

        createObject();

        objectTimer = 0;

    }


    objects.forEach(object => {

        object.y += object.speed * deltaTime;

        const playerCenterX =
            player.x + player.width / 2;

        const playerCenterY =
            player.y + player.height / 2;

        const dx = object.x - playerCenterX;
        const dy = object.y - playerCenterY;

        const distance = Math.sqrt(
            dx * dx + dy * dy
        );


        // RECOGER OBJETOS
        if (distance < 32 && !object.collected) {

            object.collected = true;

            if (object.type === "fuel") {

                fuel = Math.min(100, fuel + 30);

                updateFuelBar();

                messageElement.textContent =
                    "⛽ ¡COMBUSTIBLE RECARGADO! +30%";

            }

            if (object.type === "star") {

                score += 50;

                scoreElement.textContent = score;

                messageElement.textContent =
                    "⭐ ¡ESTRELLA BONUS! +50 PUNTOS";

            }

        }

    });


    // Eliminar objetos recogidos o fuera de pantalla
    objects = objects.filter(object =>

        !object.collected &&
        object.y < canvas.height + 40

    );

}


/* =========================================
   CONSUMO DE COMBUSTIBLE
========================================= */

function updateFuel(deltaTime) {

    const difficulty = difficulties[currentDifficulty];

    const fuelMultiplier = Math.min(
        1.25,
        1 + Math.floor(survivalTime / 30) * 0.03
    );

    fuel -=
        difficulty.fuelDrain *
        fuelMultiplier *
        deltaTime;

    updateFuelBar();

    if (fuel <= 0) {

        fuel = 0;

        updateFuelBar();

        endGame("¡Te quedaste sin combustible!");

    }

}


/* =========================================
   PANTALLAS DEL JUEGO
========================================= */

function drawOverlay(title, subtitle) {

    ctx.fillStyle = "rgba(5, 8, 30, 0.88)";

    ctx.fillRect(
        25,
        235,
        430,
        160
    );

    ctx.textAlign = "center";

    ctx.fillStyle = "#55eaff";
    ctx.font = "bold 34px Arial";

    ctx.fillText(
        title,
        canvas.width / 2,
        290
    );

    ctx.fillStyle = "white";
    ctx.font = "17px Arial";

    ctx.fillText(
        subtitle,
        canvas.width / 2,
        335
    );

    ctx.textAlign = "left";

}


/* =========================================
   LIMPIAR CONTROLES
========================================= */

function clearControls() {

    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.down = false;
    keys.shift = false;

}


/* =========================================
   FINALIZAR PARTIDA
========================================= */

function endGame(reason) {

    if (gameState !== "playing") return;

    gameState = "over";

    messageElement.textContent =
        reason + " Puntuación final: " + score;

    startButton.textContent = "VOLVER A JUGAR";

    // Desbloquear dificultad
    difficultySelect.disabled = false;

    clearControls();

}


/* =========================================
   INICIAR O REINICIAR PARTIDA
========================================= */

function startGame() {

    currentDifficulty = difficultySelect.value;

    difficultySelect.disabled = true;

    score = 0;
    fuel = 100;

    meteorites = [];
    objects = [];

    meteorTimer = 0;
    objectTimer = 0;

    spiralAngle = 0;

    difficultyMultiplier = 1;
    survivalTime = 0;

    // Reiniciar posición de la nave
    player.x =
        (canvas.width - player.width) / 2;

    player.y = 550;

    clearControls();

    scoreElement.textContent = score;

    updateFuelBar();

    messageElement.textContent =
        "¡Esquiva, recoge combustible y consigue puntos!";

    startButton.textContent = "JUGANDO...";

    gameState = "playing";

    lastTime = 0;

}


/* =========================================
   DIBUJAR TODO
========================================= */

function drawGame() {

    drawBackground();

    drawObjects();

    drawMeteorites();

    drawPlayer();

    drawHitbox();

    if (gameState === "ready") {

        drawOverlay(
            "ASTRO ESCAPE",
            "¡Prepárate para despegar!"
        );

    }

    if (gameState === "over") {

        drawOverlay(
            "GAME OVER",
            "Puntuación: " + score
        );

    }

}


/* =========================================
   BUCLE PRINCIPAL
========================================= */

function gameLoop(timestamp) {

    const deltaTime = lastTime
        ? Math.min(
            (timestamp - lastTime) / 1000,
            0.05
        )
        : 0;

    lastTime = timestamp;

    if (gameState === "playing") {

        // Tiempo de supervivencia
        survivalTime += deltaTime;

        // Cada 15 segundos aumenta un 10%
        // Máximo: 2.5 veces la dificultad inicial
        difficultyMultiplier = Math.min(
            2.5,
            1 + Math.floor(survivalTime / 15) * 0.10
        );

        movePlayer(deltaTime);

        updateFuel(deltaTime);

        if (gameState === "playing") {

            updateMeteorites(deltaTime);

        }

        if (gameState === "playing") {

            updateObjects(deltaTime);

        }

    }

    drawGame();

    requestAnimationFrame(gameLoop);

}


/* =========================================
   CONTROLES DE TECLADO
   WASD Y FLECHAS + SHIFT
========================================= */

document.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    if (
        [
            "w", "a", "s", "d",
            "arrowup", "arrowdown",
            "arrowleft", "arrowright",
            "shift"
        ].includes(key)
    ) {

        event.preventDefault();

    }

    if (key === "w" || key === "arrowup") {
        keys.up = true;
    }

    if (key === "s" || key === "arrowdown") {
        keys.down = true;
    }

    if (key === "a" || key === "arrowleft") {
        keys.left = true;
    }

    if (key === "d" || key === "arrowright") {
        keys.right = true;
    }

    if (key === "shift") {
        keys.shift = true;
    }

});


document.addEventListener("keyup", event => {

    const key = event.key.toLowerCase();

    if (key === "w" || key === "arrowup") {
        keys.up = false;
    }

    if (key === "s" || key === "arrowdown") {
        keys.down = false;
    }

    if (key === "a" || key === "arrowleft") {
        keys.left = false;
    }

    if (key === "d" || key === "arrowright") {
        keys.right = false;
    }

    if (key === "shift") {
        keys.shift = false;
    }

});


/* =========================================
   CONTROLES TÁCTILES
========================================= */

function setupTouchButton(button, direction) {

    if (!button) return;

    button.addEventListener("pointerdown", event => {

        event.preventDefault();

        keys[direction] = true;

    });

    button.addEventListener("pointerup", event => {

        event.preventDefault();

        keys[direction] = false;

    });

    button.addEventListener("pointerleave", () => {

        keys[direction] = false;

    });

    button.addEventListener("pointercancel", () => {

        keys[direction] = false;

    });

}


// Configurar botones
setupTouchButton(leftButton, "left");
setupTouchButton(rightButton, "right");
setupTouchButton(upButton, "up");
setupTouchButton(downButton, "down");


/* =========================================
   EVITAR CONTROLES ATASCADOS
========================================= */

window.addEventListener("blur", clearControls);

document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        clearControls();

    }

});


/* =========================================
   BOTÓN DE INICIO
========================================= */

startButton.addEventListener("click", () => {

    if (gameState !== "playing") {

        startGame();

    }

});


/* =========================================
   INICIALIZAR JUEGO
========================================= */

updateFuelBar();

drawGame();

requestAnimationFrame(gameLoop);
