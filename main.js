import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Stage Checkpoint Data ---
// Street (Stage 1)
const streetCheckpointData = [
    { position: new THREE.Vector3(-3943,35,-3032), question: "What color do you get when you mix red and white?", answers: ["Pink", "Purple", "Orange"], correct: "Pink" },
    { position: new THREE.Vector3(-4193,35,-1446), question: "Which animal is known as the 'King of the Jungle'?", answers: ["Lion", "Tiger", "Elephant"], correct: "Lion" },
    { position: new THREE.Vector3(-5679,35,-92), question: "What is the largest planet in our solar system?", answers: ["Earth", "Jupiter", "Mars"], correct: "Jupiter"}
];

// Warehouse (Stage 2)
const warehouseCheckpointData = [
    { position: new THREE.Vector3(494,35,-294), question: "Who wrote the play Romeo and Juliet?", answers: ["William Shakespeare", "Mark Twain", "Charles Dickens"], correct: "William Shakespeare" },
    { position: new THREE.Vector3(668,35,-294), question: "Who developed the theory of relativity?", answers: ["Newton","Einstein","Tesla"], correct: "Einstein" },
    { position: new THREE.Vector3(632,35,-222), question: "In which country would you find the city of Kyoto?", answers: ["Japan", "China", "South Korea"], correct: "Japan" }
];

// Apartment (Stage 3)
const apartmentCheckpointData = [
    { position: new THREE.Vector3(-120, 35, 10), question: "What is the capital of Mongolia?", answers: ["Ulaanbaatar", "Astana", "Tashkent"], correct: "Ulaanbaatar" },
    { position: new THREE.Vector3(-145, 35, -240), question: "Who painted the Garden of Earthly Delights?", answers: ["Hieronymus Bosch", "Leonardo da Vinci", "Michelangelo"], correct: "Hieronymus Bosch" },
    { position: new THREE.Vector3(-375, 35, -200), question: "What is the rarest naturally occurring element on Earth?", answers: ["Astatine", "Platinum", "Uranium"], correct: "Astatine" }
];

// --- Global Variables ---
let scene, camera, renderer;
let player, playerSpeed = 2;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;
let debugDiv, menuDiv, ballCounterDiv;
let isMenuOpen = false;

// Stage tracking
let stage = 1;

// Timer
let timerDiv;
let totalTime = 180; // 3 minutes for street stage
let remainingTime = totalTime;
let timerInterval;
let isTimerRunning = false;

// Player spawn point
const spawnPoint = new THREE.Vector3(-2265, 0, -32);

// Ball counter
let ballsCollected = 0;

// --- Init ---
init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(5, 3, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    // Load Scenes
    const loader = new GLTFLoader();
    loader.load('public/street/scene.gltf', function(gltf) {
        const street = gltf.scene;
        street.scale.set(600, 600, 600);
        street.position.set(-4000, 0, 0);
        scene.add(street);

        loader.load('public/warehouse/scene.gltf', function(gltf2) {
            const warehouse = gltf2.scene;
            warehouse.scale.set(50, 50, 50);
            warehouse.position.set(500, 0, 0);
            scene.add(warehouse);

            loader.load('public/apartment/scene.gltf', function(gltf3) {
                const apartment = gltf3.scene;
                apartment.scale.set(1, 1, 1);
                apartment.position.set(0, 0, 0);
                scene.add(apartment);

                loadPlayer();
                createCheckpoints(streetCheckpointData);
                createDebugOverlay();
                createMenu();
                createTimer();
                startTimer();
            });
        });
    });

    // Input
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === "Escape") toggleMenu();
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- Player ---
function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load('scene.gltf', function(gltf) {
        player = gltf.scene;
        player.scale.set(20,20,20);
        player.position.copy(spawnPoint);
        player.rotation.y = Math.PI;
        scene.add(player);

        if(gltf.animations.length > 0){
            mixer = new THREE.AnimationMixer(player);
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
            action.paused = true;
        }
    });
}

// --- Checkpoints ---
function createCheckpoints(data) {
    checkpoints = [];
    ballsCollected = 0;
    updateBallCounter();
    data.forEach(d => {
        const geometry = new THREE.SphereGeometry(3,32,32);
        const material = new THREE.MeshStandardMaterial({color:0xffff00});
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(d.position);
        sphere.trivia = { question: d.question, answers: d.answers, correct: d.correct };
        scene.add(sphere);
        checkpoints.push(sphere);
    });
}

// --- Trivia ---
function showTrivia(sphere){
    isTriviaActive = true;
    currentCheckpoint = sphere;
    const data = sphere.trivia;

    const triviaDiv = document.createElement('div');
    triviaDiv.id = "triviaDiv";
    triviaDiv.style.position = 'absolute';
    triviaDiv.style.top = '50%';
    triviaDiv.style.left = '50%';
    triviaDiv.style.transform = 'translate(-50%, -50%)';
    triviaDiv.style.padding = '20px';
    triviaDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    triviaDiv.style.color = 'white';
    triviaDiv.style.fontFamily = 'Arial';
    triviaDiv.style.fontSize = '20px';
    triviaDiv.style.textAlign = 'center';
    triviaDiv.style.borderRadius = '10px';
    triviaDiv.innerHTML = `<p>${data.question}</p>`;

    data.answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.innerText = ans;
        btn.style.margin = '5px';
        btn.style.padding = '10px';
        btn.onclick = () => {
            if(ans === data.correct){
                alert("Correct!");
                ballsCollected++;
                updateBallCounter();
                isTriviaActive = false;
                scene.remove(sphere);
                const idx = checkpoints.indexOf(sphere);
                if(idx !== -1) checkpoints.splice(idx,1);
                triviaDiv.remove();

                if(checkpoints.length === 0 && isTimerRunning){
                    if(stage === 1) enterWarehouse();
                    else if(stage === 2) enterApartment();
                    else if(stage === 3) finalWin();
                }
            } else {
                alert("Incorrect, try again!");
            }
        };
        triviaDiv.appendChild(btn);
    });

    document.body.appendChild(triviaDiv);
}

// --- Stage Progression ---
function enterWarehouse() {
    stage = 2;
    player.position.set(515,0,-87);
    createCheckpoints(warehouseCheckpointData);
    clearInterval(timerInterval);
    totalTime = 120; // 2 minutes
    remainingTime = totalTime;
    startTimer();
    alert("Welcome to the Warehouse! Collect 3 balls!");
}

function enterApartment() {
    stage = 3;
    player.position.set(-145,0,0);
    createCheckpoints(apartmentCheckpointData);
    clearInterval(timerInterval);
    totalTime = 60; // 1 minute
    remainingTime = totalTime;
    startTimer();
    alert("Final Stage: The Apartment! Collect 3 balls!");
}

// --- Win/Lose ---
function finalWin() {
    isTriviaActive = true;
    clearInterval(timerInterval);
    isTimerRunning = false;

    const winDiv = document.createElement('div');
    winDiv.id = 'winDiv';
    winDiv.style.position = 'absolute';
    winDiv.style.top = '50%';
    winDiv.style.left = '50%';
    winDiv.style.transform = 'translate(-50%, -50%)';
    winDiv.style.padding = '20px';
    winDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    winDiv.style.color = 'white';
    winDiv.style.fontFamily = 'Arial';
    winDiv.style.fontSize = '24px';
    winDiv.style.textAlign = 'center';
    winDiv.style.borderRadius = '10px';
    winDiv.style.zIndex = '300';
    winDiv.innerHTML = "<p>Congratulations! You completed all stages!</p>";

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => location.reload();

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    winDiv.appendChild(restartBtn);
    winDiv.appendChild(quitBtn);
    document.body.appendChild(winDiv);
}

function handleDeath() {
    isTriviaActive = true;
    const deathDiv = document.createElement('div');
    deathDiv.style.position = 'absolute';
    deathDiv.style.top = '50%';
    deathDiv.style.left = '50%';
    deathDiv.style.transform = 'translate(-50%, -50%)';
    deathDiv.style.padding = '20px';
    deathDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    deathDiv.style.color = 'white';
    deathDiv.style.fontFamily = 'Arial';
    deathDiv.style.fontSize = '24px';
    deathDiv.style.textAlign = 'center';
    deathDiv.style.borderRadius = '10px';
    deathDiv.style.zIndex = '300';
    deathDiv.innerHTML = "<p>You have died!</p>";

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => location.reload();

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    deathDiv.appendChild(restartBtn);
    deathDiv.appendChild(quitBtn);
    document.body.appendChild(deathDiv);
}

// --- Timer ---
function createTimer() {
    timerDiv = document.createElement('div');
    timerDiv.style.position = 'absolute';
    timerDiv.style.top = '10px';
    timerDiv.style.right = '10px';
    timerDiv.style.padding = '10px 15px';
    timerDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    timerDiv.style.color = 'white';
    timerDiv.style.fontFamily = 'Arial';
    timerDiv.style.fontSize = '16px';
    timerDiv.style.borderRadius = '5px';
    timerDiv.style.zIndex = '100';
    document.body.appendChild(timerDiv);
    updateTimerDisplay();
}

function startTimer() {
    clearInterval(timerInterval);
    remainingTime = totalTime;
    isTimerRunning = true;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (!isTimerRunning) return;
        remainingTime--;
        updateTimerDisplay();
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            handleDeath();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerDiv.innerText = `Time: ${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

// --- Ball Counter ---
function updateBallCounter() {
    if(ballCounterDiv){
        ballCounterDiv.innerText = `Balls Collected: ${ballsCollected} / 3`;
    }
}

// --- UI ---
function createDebugOverlay() {
    debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.padding = '10px';
    debugDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'Arial';
    debugDiv.style.fontSize = '16px';
    debugDiv.style.zIndex = '100';
    document.body.appendChild(debugDiv);

    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '90px';
    messageDiv.style.left = '10px';
    messageDiv.style.padding = '5px';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.3)';
    messageDiv.style.color = 'white';
    messageDiv.style.fontFamily = 'Arial';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.zIndex = '100';
    messageDiv.innerText = "Press ESC to toggle the menu";
    document.body.appendChild(messageDiv);

    ballCounterDiv = document.createElement('div');
    ballCounterDiv.style.position = 'absolute';
    ballCounterDiv.style.top = '120px';
    ballCounterDiv.style.left = '10px';
    ballCounterDiv.style.padding = '5px';
    ballCounterDiv.style.backgroundColor = 'rgba(0,0,0,0.3)';
    ballCounterDiv.style.color = 'white';
    ballCounterDiv.style.fontFamily = 'Arial';
    ballCounterDiv.style.fontSize = '14px';
    ballCounterDiv.style.zIndex = '100';
    document.body.appendChild(ballCounterDiv);
    updateBallCounter();
}

function createMenu() {
    menuDiv = document.createElement('div');
    menuDiv.style.position = 'absolute';
    menuDiv.style.top = '50%';
    menuDiv.style.left = '50%';
    menuDiv.style.transform = 'translate(-50%, -50%)';
    menuDiv.style.padding = '20px';
    menuDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    menuDiv.style.color = 'white';
    menuDiv.style.fontFamily = 'Arial';
    menuDiv.style.fontSize = '20px';
    menuDiv.style.textAlign = 'center';
    menuDiv.style.borderRadius = '10px';
    menuDiv.style.display = 'none';
    menuDiv.style.zIndex = '200';

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => location.reload();

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    menuDiv.appendChild(restartBtn);
    menuDiv.appendChild(quitBtn);
    document.body.appendChild(menuDiv);
}

function toggleMenu(forceState=null){
    if(forceState !== null) isMenuOpen = forceState;
    else isMenuOpen = !isMenuOpen;
    menuDiv.style.display = isMenuOpen ? 'block' : 'none';
    isTriviaActive = isMenuOpen;
}

// --- Animate ---
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if(mixer) mixer.update(delta);

    if(player && !isTriviaActive){
        let moveX = 0, moveZ = 0;
        if(keys['w']) moveZ -= playerSpeed;
        if(keys['s']) moveZ += playerSpeed;
        if(keys['a']) moveX -= playerSpeed;
        if(keys['d']) moveX += playerSpeed;

        player.position.x += moveX;
        player.position.z += moveZ;

        if(moveX !==0 || moveZ !==0){
            const angle = Math.atan2(moveX, moveZ);
            player.rotation.y = angle;
            if(action) action.paused = false;
        } else { if(action) action.paused = true; }
    }

    // Check collisions
    checkpoints.forEach(cp => {
        if(!isTriviaActive && player.position.distanceTo(cp.position) < 40){
            showTrivia(cp);
        }
    });

    // Third-person camera
    if(player){
        const offset = new THREE.Vector3(0,80,-65);
        const rotatedOffset = offset.clone().applyQuaternion(player.quaternion);
        const cameraTarget = player.position.clone().add(rotatedOffset);
        camera.position.lerp(cameraTarget,0.1);
        camera.lookAt(player.position.clone().add(new THREE.Vector3(0,45,0)));
    }

    // Debug overlay
    if(debugDiv && player){
        debugDiv.innerHTML = `
            <b>Player Position:</b><br>
            X: ${player.position.x.toFixed(2)}<br>
            Y: ${player.position.y.toFixed(2)}<br>
            Z: ${player.position.z.toFixed(2)}
        `;
    }

    renderer.render(scene, camera);
}






























/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//515,0,-87 (warehouse spawn)

//-2265,0,-32

//-3943,0,-3032
//-4193,0,-1446
//-5679,0,-92


// Warehouse ball positions
const warehouseCheckpointData = [
    { position: new THREE.Vector3(494,35,-294), question: "What is the square root of 144?", answers: ["10","11","12"], correct: "12" },
    { position: new THREE.Vector3(668,35,-294), question: "Who developed the theory of relativity?", answers: ["Newton","Einstein","Tesla"], correct: "Einstein" },
    { position: new THREE.Vector3(632,35,-222), question: "What is 15 × 12?", answers: ["160","170","180"], correct: "180" }
];

let scene, camera, renderer;
let player, playerSpeed = 2;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;
let debugDiv, menuDiv;
let isMenuOpen = false;

// Stage tracking
let inWarehouse = false;

// Timer variables
let timerDiv;
let totalTime = 180; // 3 minutes in seconds for apartment
let remainingTime = totalTime;
let timerInterval;
let isTimerRunning = false;

// Player spawn point
const spawnPoint = new THREE.Vector3(-145, 0, 0);

// Apartment checkpoints
const apartmentCheckpointData = [
    { position: new THREE.Vector3(-120, 35, 10), question: "What is 2 + 2?", answers: ["3","4","5"], correct: "4" },
    { position: new THREE.Vector3(-145, 35, -240), question: "What is the capital of France?", answers: ["Paris","Berlin","Rome"], correct: "Paris" },
    { position: new THREE.Vector3(-375, 35, -200), question: "Which planet is closest to the Sun?", answers: ["Earth","Mercury","Mars"], correct: "Mercury" }
];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    const loader = new GLTFLoader();
    loader.load('public/apartment/scene.gltf', function(gltf) {
        const apartment = gltf.scene;
        apartment.scale.set(1, 1, 1);
        apartment.position.set(0, 0, 0);
        scene.add(apartment);

        loader.load('public/warehouse/scene.gltf', function(gltf2) {
            const warehouse = gltf2.scene;
            warehouse.scale.set(50, 50, 50);
            warehouse.position.set(500, 0, 0); // place away from apartment
            scene.add(warehouse);
        });

        loader.load('public/street/scene.gltf', function(gltf3) {
            const warehouse = gltf3.scene;
            warehouse.scale.set(600, 600, 600);
            warehouse.position.set(-4000, 0, 0); 
            scene.add(warehouse);
        });

        loadPlayer();
        createCheckpoints(apartmentCheckpointData);
        createDebugOverlay();
        createMenu();
        createTimer();
        startTimer();
    });

    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === "Escape") toggleMenu();
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load('scene.gltf', function(gltf) {
        player = gltf.scene;
        player.scale.set(20,20,20);
        player.position.copy(spawnPoint);
        player.rotation.y = Math.PI;
        scene.add(player);

        if(gltf.animations.length > 0){
            mixer = new THREE.AnimationMixer(player);
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
            action.paused = true;
        }
    });
}

function createCheckpoints(data) {
    checkpoints = [];
    data.forEach(d => {
        const geometry = new THREE.SphereGeometry(3,32,32);
        const material = new THREE.MeshStandardMaterial({color:0xffff00});
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(d.position);
        sphere.trivia = { question: d.question, answers: d.answers, correct: d.correct };
        scene.add(sphere);
        checkpoints.push(sphere);
    });
}

function showTrivia(sphere){
    isTriviaActive = true;
    currentCheckpoint = sphere;
    const data = sphere.trivia;

    const triviaDiv = document.createElement('div');
    triviaDiv.id = "triviaDiv";
    triviaDiv.style.position = 'absolute';
    triviaDiv.style.top = '50%';
    triviaDiv.style.left = '50%';
    triviaDiv.style.transform = 'translate(-50%, -50%)';
    triviaDiv.style.padding = '20px';
    triviaDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    triviaDiv.style.color = 'white';
    triviaDiv.style.fontFamily = 'Arial';
    triviaDiv.style.fontSize = '20px';
    triviaDiv.style.textAlign = 'center';
    triviaDiv.style.borderRadius = '10px';
    triviaDiv.innerHTML = `<p>${data.question}</p>`;

    data.answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.innerText = ans;
        btn.style.margin = '5px';
        btn.style.padding = '10px';
        btn.onclick = () => {
            if(ans === data.correct){
                alert("Correct!");
                isTriviaActive = false;
                scene.remove(sphere);
                const idx = checkpoints.indexOf(sphere);
                if(idx !== -1) checkpoints.splice(idx,1);
                triviaDiv.remove();

                if(checkpoints.length === 0 && isTimerRunning){
                    if(!inWarehouse) {
                        // First stage complete -> move to warehouse
                        enterWarehouse();
                    } else {
                        // Warehouse complete -> final win
                        finalWin();
                    }
                }
            } else {
                alert("Incorrect, try again!");
            }
        };
        triviaDiv.appendChild(btn);
    });

    document.body.appendChild(triviaDiv);
}

function enterWarehouse() {
    inWarehouse = true;
    player.position.set(515,0,-87);
    player.rotation.y = Math.PI;

    checkpoints.forEach(cp => scene.remove(cp));
    createCheckpoints(warehouseCheckpointData);

    clearInterval(timerInterval);
    totalTime = 120; // 2 minutes
    remainingTime = totalTime;
    startTimer();

    alert("Welcome to the Warehouse! Collect 3 more balls and answer harder questions!");
}

function finalWin() {
    isTriviaActive = true;
    clearInterval(timerInterval);
    isTimerRunning = false;

    const winDiv = document.createElement('div');
    winDiv.id = 'winDiv';
    winDiv.style.position = 'absolute';
    winDiv.style.top = '50%';
    winDiv.style.left = '50%';
    winDiv.style.transform = 'translate(-50%, -50%)';
    winDiv.style.padding = '20px';
    winDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    winDiv.style.color = 'white';
    winDiv.style.fontFamily = 'Arial';
    winDiv.style.fontSize = '24px';
    winDiv.style.textAlign = 'center';
    winDiv.style.borderRadius = '10px';
    winDiv.style.zIndex = '300';
    winDiv.innerHTML = "<p>Congratulations! You completed both stages!</p>";

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => {
        location.reload();
    };

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    winDiv.appendChild(restartBtn);
    winDiv.appendChild(quitBtn);
    document.body.appendChild(winDiv);
}

function createDebugOverlay() {
    debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.padding = '10px';
    debugDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'Arial';
    debugDiv.style.fontSize = '16px';
    debugDiv.style.zIndex = '100';
    document.body.appendChild(debugDiv);

    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '90px'; 
    messageDiv.style.left = '10px';
    messageDiv.style.padding = '5px';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.3)';
    messageDiv.style.color = 'white';
    messageDiv.style.fontFamily = 'Arial';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.zIndex = '100';
    messageDiv.innerText = "Press ESC to toggle the menu";
    document.body.appendChild(messageDiv);
}

function createMenu() {
    menuDiv = document.createElement('div');
    menuDiv.style.position = 'absolute';
    menuDiv.style.top = '50%';
    menuDiv.style.left = '50%';
    menuDiv.style.transform = 'translate(-50%, -50%)';
    menuDiv.style.padding = '20px';
    menuDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    menuDiv.style.color = 'white';
    menuDiv.style.fontFamily = 'Arial';
    menuDiv.style.fontSize = '20px';
    menuDiv.style.textAlign = 'center';
    menuDiv.style.borderRadius = '10px';
    menuDiv.style.display = 'none';
    menuDiv.style.zIndex = '200';

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => {
        location.reload();
    };

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    menuDiv.appendChild(restartBtn);
    menuDiv.appendChild(quitBtn);
    document.body.appendChild(menuDiv);
}

function toggleMenu(forceState=null){
    if(forceState !== null) isMenuOpen = forceState;
    else isMenuOpen = !isMenuOpen;
    menuDiv.style.display = isMenuOpen ? 'block' : 'none';
    isTriviaActive = isMenuOpen;
}

function createTimer() {
    timerDiv = document.createElement('div');
    timerDiv.style.position = 'absolute';
    timerDiv.style.top = '10px';
    timerDiv.style.right = '10px';
    timerDiv.style.padding = '10px 15px';
    timerDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    timerDiv.style.color = 'white';
    timerDiv.style.fontFamily = 'Arial';
    timerDiv.style.fontSize = '16px';
    timerDiv.style.borderRadius = '5px';
    timerDiv.style.zIndex = '100';
    document.body.appendChild(timerDiv);
    updateTimerDisplay();
}

function startTimer() {
    clearInterval(timerInterval);
    remainingTime = totalTime;
    isTimerRunning = true;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (!isTimerRunning) return;
        remainingTime--;
        updateTimerDisplay();
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            handleDeath();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerDiv.innerText = `Time: ${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

function handleDeath() {
    isTriviaActive = true;
    const deathDiv = document.createElement('div');
    deathDiv.id = 'deathDiv';
    deathDiv.style.position = 'absolute';
    deathDiv.style.top = '50%';
    deathDiv.style.left = '50%';
    deathDiv.style.transform = 'translate(-50%, -50%)';
    deathDiv.style.padding = '20px';
    deathDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    deathDiv.style.color = 'white';
    deathDiv.style.fontFamily = 'Arial';
    deathDiv.style.fontSize = '24px';
    deathDiv.style.textAlign = 'center';
    deathDiv.style.borderRadius = '10px';
    deathDiv.style.zIndex = '300';
    deathDiv.innerHTML = "<p>You have died!</p>";

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => {
        location.reload();
    };

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    deathDiv.appendChild(restartBtn);
    deathDiv.appendChild(quitBtn);
    document.body.appendChild(deathDiv);
}

// Animate loop
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if(mixer) mixer.update(delta);

    if(player && !isTriviaActive){
        let moveX = 0, moveZ = 0;
        if(keys['w']) moveZ -= playerSpeed;
        if(keys['s']) moveZ += playerSpeed;
        if(keys['a']) moveX -= playerSpeed;
        if(keys['d']) moveX += playerSpeed;

        player.position.x += moveX;
        player.position.z += moveZ;

        if(moveX !==0 || moveZ !==0){
            const angle = Math.atan2(moveX, moveZ);
            player.rotation.y = angle;
            if(action) action.paused = false;
        } else { if(action) action.paused = true; }
    }

    // Checkpoint collisions
    checkpoints.forEach(cp => {
        if(!isTriviaActive && player.position.distanceTo(cp.position) < 40){
            showTrivia(cp);
        }
    });

    // Third-person camera
    const offset = new THREE.Vector3(0,80,-65);
    const rotatedOffset = offset.clone().applyQuaternion(player.quaternion);
    const cameraTarget = player.position.clone().add(rotatedOffset);
    camera.position.lerp(cameraTarget,0.1);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0,45,0)));

    // Debug overlay
    debugDiv.innerHTML = `
        <b>Player Position:</b><br>
        X: ${player.position.x.toFixed(2)}<br>
        Y: ${player.position.y.toFixed(2)}<br>
        Z: ${player.position.z.toFixed(2)}
    `;

    renderer.render(scene, camera);
}*/






















































/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

//515,0,-87

//494,0,-294
//668,0,-294
//632,0,-222


let scene, camera, renderer;
let player, playerSpeed = 1.5;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;
let debugDiv, menuDiv;
let isMenuOpen = false;

// Timer variables
let timerDiv;
let totalTime = 180; // 3 minutes in seconds
let remainingTime = totalTime;
let timerInterval;
let isTimerRunning = false;

// Player spawn point
const spawnPoint = new THREE.Vector3(-145, 0, 0);

// Checkpoints with questions
const checkpointData = [
    { position: new THREE.Vector3(-120, 35, 10), question: "What is 2 + 2?", answers: ["3","4","5"], correct: "4" },
    { position: new THREE.Vector3(-145, 35, -240), question: "What is the capital of France?", answers: ["Paris","Berlin","Rome"], correct: "Paris" },
    { position: new THREE.Vector3(-375, 35, -200), question: "Which planet is closest to the Sun?", answers: ["Earth","Mercury","Mars"], correct: "Mercury" }
];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    const loader = new GLTFLoader();
    loader.load('public/apartment/scene.gltf', function(gltf) {
        const apartment = gltf.scene;
        apartment.scale.set(1, 1, 1);
        apartment.position.set(0, 0, 0);
        scene.add(apartment);

        loader.load('public/warehouse/scene.gltf', function(gltf2) {
        const warehouse = gltf2.scene;
        warehouse.scale.set(50, 50, 50);
        warehouse.position.set(500, 0, 0); // move it away from apartment
        scene.add(warehouse);
    });

        loadPlayer();
        createCheckpoints();
        createDebugOverlay();
        createMenu();
        createTimer();
        startTimer();
    });

    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === "Escape") toggleMenu();
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load('scene.gltf', function(gltf) {
        player = gltf.scene;
        player.scale.set(20,20,20);
        player.position.copy(spawnPoint);
        player.rotation.y = Math.PI;
        scene.add(player);

        if(gltf.animations.length > 0){
            mixer = new THREE.AnimationMixer(player);
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
            action.paused = true;
        }
    });
}

function createCheckpoints() {
    checkpoints = [];
    checkpointData.forEach(data => {
        const geometry = new THREE.SphereGeometry(3,32,32);
        const material = new THREE.MeshStandardMaterial({color:0xffff00});
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(data.position);
        sphere.trivia = { question: data.question, answers: data.answers, correct: data.correct };
        scene.add(sphere);
        checkpoints.push(sphere);
    });
}

function showTrivia(sphere){
    isTriviaActive = true;
    currentCheckpoint = sphere;
    const data = sphere.trivia;

    const triviaDiv = document.createElement('div');
    triviaDiv.id = "triviaDiv";
    triviaDiv.style.position = 'absolute';
    triviaDiv.style.top = '50%';
    triviaDiv.style.left = '50%';
    triviaDiv.style.transform = 'translate(-50%, -50%)';
    triviaDiv.style.padding = '20px';
    triviaDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    triviaDiv.style.color = 'white';
    triviaDiv.style.fontFamily = 'Arial';
    triviaDiv.style.fontSize = '20px';
    triviaDiv.style.textAlign = 'center';
    triviaDiv.style.borderRadius = '10px';
    triviaDiv.innerHTML = `<p>${data.question}</p>`;

    data.answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.innerText = ans;
        btn.style.margin = '5px';
        btn.style.padding = '10px';
        btn.onclick = () => {
            if(ans === data.correct){
                alert("Correct!");
                isTriviaActive = false;
                scene.remove(sphere);
                const idx = checkpoints.indexOf(sphere);
                if(idx !== -1) checkpoints.splice(idx,1);
                triviaDiv.remove();

                if(checkpoints.length === 0 && isTimerRunning){
                    handleWin();
                }
            } else {
                alert("Incorrect, try again!");
            }
        };
        triviaDiv.appendChild(btn);
    });

    document.body.appendChild(triviaDiv);
}

function createDebugOverlay() {
    debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.padding = '10px';
    debugDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'Arial';
    debugDiv.style.fontSize = '16px';
    debugDiv.style.zIndex = '100';
    document.body.appendChild(debugDiv);

    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '90px'; 
    messageDiv.style.left = '10px';
    messageDiv.style.padding = '5px';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.3)';
    messageDiv.style.color = 'white';
    messageDiv.style.fontFamily = 'Arial';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.zIndex = '100';
    messageDiv.innerText = "Press ESC to toggle the menu";
    document.body.appendChild(messageDiv);
}

function createMenu() {
    menuDiv = document.createElement('div');
    menuDiv.style.position = 'absolute';
    menuDiv.style.top = '50%';
    menuDiv.style.left = '50%';
    menuDiv.style.transform = 'translate(-50%, -50%)';
    menuDiv.style.padding = '20px';
    menuDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    menuDiv.style.color = 'white';
    menuDiv.style.fontFamily = 'Arial';
    menuDiv.style.fontSize = '20px';
    menuDiv.style.textAlign = 'center';
    menuDiv.style.borderRadius = '10px';
    menuDiv.style.display = 'none';
    menuDiv.style.zIndex = '200';

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => {
        resetGame();
        startTimer();
        toggleMenu(false);
    };

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    menuDiv.appendChild(restartBtn);
    menuDiv.appendChild(quitBtn);
    document.body.appendChild(menuDiv);
}

function toggleMenu(forceState=null){
    if(forceState !== null) isMenuOpen = forceState;
    else isMenuOpen = !isMenuOpen;
    menuDiv.style.display = isMenuOpen ? 'block' : 'none';
    isTriviaActive = isMenuOpen;
}

function resetGame(){
    player.position.copy(spawnPoint);
    player.rotation.y = Math.PI;
    checkpoints.forEach(cp => scene.remove(cp));
    checkpoints = [];
    createCheckpoints();
    const triviaDiv = document.getElementById('triviaDiv');
    if(triviaDiv) triviaDiv.remove();
    remainingTime = totalTime;
    isTriviaActive = false;
}

function createTimer() {
    timerDiv = document.createElement('div');
    timerDiv.style.position = 'absolute';
    timerDiv.style.top = '10px';
    timerDiv.style.right = '10px';
    timerDiv.style.padding = '10px 15px';
    timerDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    timerDiv.style.color = 'white';
    timerDiv.style.fontFamily = 'Arial';
    timerDiv.style.fontSize = '16px';
    timerDiv.style.borderRadius = '5px';
    timerDiv.style.zIndex = '100';
    document.body.appendChild(timerDiv);
    updateTimerDisplay();
}

function startTimer() {
    clearInterval(timerInterval);
    remainingTime = totalTime;
    isTimerRunning = true;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (!isTimerRunning) return;
        remainingTime--;
        updateTimerDisplay();
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            isTimerRunning = false;
            handleDeath();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerDiv.innerText = `Time: ${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

function handleDeath() {
    isTriviaActive = true;
    const deathDiv = document.createElement('div');
    deathDiv.id = 'deathDiv';
    deathDiv.style.position = 'absolute';
    deathDiv.style.top = '50%';
    deathDiv.style.left = '50%';
    deathDiv.style.transform = 'translate(-50%, -50%)';
    deathDiv.style.padding = '20px';
    deathDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    deathDiv.style.color = 'white';
    deathDiv.style.fontFamily = 'Arial';
    deathDiv.style.fontSize = '24px';
    deathDiv.style.textAlign = 'center';
    deathDiv.style.borderRadius = '10px';
    deathDiv.style.zIndex = '300';
    deathDiv.innerHTML = "<p>You have died!</p>";

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => {
        resetGame();
        deathDiv.remove();
        startTimer();
        isTriviaActive = false;
    };

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    deathDiv.appendChild(restartBtn);
    deathDiv.appendChild(quitBtn);
    document.body.appendChild(deathDiv);
}

// WIN LOGIC
function handleWin() {
   /* isTriviaActive = true;
    clearInterval(timerInterval);
    isTimerRunning = false;

    const winDiv = document.createElement('div');
    winDiv.id = 'winDiv';
    winDiv.style.position = 'absolute';
    winDiv.style.top = '50%';
    winDiv.style.left = '50%';
    winDiv.style.transform = 'translate(-50%, -50%)';
    winDiv.style.padding = '20px';
    winDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    winDiv.style.color = 'white';
    winDiv.style.fontFamily = 'Arial';
    winDiv.style.fontSize = '24px';
    winDiv.style.textAlign = 'center';
    winDiv.style.borderRadius = '10px';
    winDiv.style.zIndex = '300';
    winDiv.innerHTML = "<p>Congratulations! You have completed the game!</p>";

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => {
        resetGame();
        winDiv.remove();
        startTimer();
        isTriviaActive = false;
    };

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => window.close();

    winDiv.appendChild(restartBtn);
    winDiv.appendChild(quitBtn);
    document.body.appendChild(winDiv);*/
    /*
    isTriviaActive = false; // allow movement again
    player.position.set(515, 0, -87); // teleport player
    player.rotation.y = Math.PI;      // face forward again

    // Reset the timer to 2 minutes (120 seconds)
    clearInterval(timerInterval);
    totalTime = 120; // 2 minutes
    remainingTime = totalTime;
    startTimer();
}

// Animate loop
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if(mixer) mixer.update(delta);

    if(player && !isTriviaActive){
        let moveX = 0, moveZ = 0;
        if(keys['w']) moveZ -= playerSpeed;
        if(keys['s']) moveZ += playerSpeed;
        if(keys['a']) moveX -= playerSpeed;
        if(keys['d']) moveX += playerSpeed;

        player.position.x += moveX;
        player.position.z += moveZ;

        if(moveX !==0 || moveZ !==0){
            const angle = Math.atan2(moveX, moveZ);
            player.rotation.y = angle;
            if(action) action.paused = false;
        } else { if(action) action.paused = true; }
    }

    // Checkpoint collisions
    checkpoints.forEach(cp => {
        if(!isTriviaActive && player.position.distanceTo(cp.position) < 40){
            showTrivia(cp);
        }
    });

    // Third-person camera
    const offset = new THREE.Vector3(0,80,-65);
    const rotatedOffset = offset.clone().applyQuaternion(player.quaternion);
    const cameraTarget = player.position.clone().add(rotatedOffset);
    camera.position.lerp(cameraTarget,0.1);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0,45,0)));

    // Debug overlay
    debugDiv.innerHTML = `
        <b>Player Position:</b><br>
        X: ${player.position.x.toFixed(2)}<br>
        Y: ${player.position.y.toFixed(2)}<br>
        Z: ${player.position.z.toFixed(2)}
    `;

    renderer.render(scene, camera);
}*/




















/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let player, playerSpeed = 1.5;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;
let debugDiv;
let menuDiv;
let isMenuOpen = false;

// Player spawn point
const spawnPoint = new THREE.Vector3(-145, 0, 0);

// Checkpoints with questions
const checkpointData = [
    { position: new THREE.Vector3(-120, 35, 10), question: "What is 2 + 2?", answers: ["3","4","5"], correct: "4" },
    { position: new THREE.Vector3(-145, 35, -240), question: "What is the capital of France?", answers: ["Paris","Berlin","Rome"], correct: "Paris" },
    { position: new THREE.Vector3(-375, 35, -200), question: "Which planet is closest to the Sun?", answers: ["Earth","Mercury","Mars"], correct: "Mercury" }
];

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    // Load apartment
    const loader = new GLTFLoader();
    loader.load('public/apartment/scene.gltf', function(gltf) {
        const apartment = gltf.scene;
        apartment.scale.set(1, 1, 1);
        apartment.position.set(0, 0, 0);
        scene.add(apartment);

        loadPlayer();
        createCheckpoints();
        createDebugOverlay();
        createMenu();
    });

    // WASD input
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;

        // Open menu with Escape key
        if(e.key === "Escape") {
            toggleMenu();
        }
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Load player
function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load('scene.gltf', function(gltf) {
        player = gltf.scene;
        player.scale.set(20,20,20);
        player.position.copy(spawnPoint);
        player.rotation.y = Math.PI;
        scene.add(player);

        if(gltf.animations.length > 0){
            mixer = new THREE.AnimationMixer(player);
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
            action.paused = true;
        }
    });
}

// Create checkpoint spheres
function createCheckpoints() {
    checkpoints = [];
    checkpointData.forEach(data => {
        const geometry = new THREE.SphereGeometry(3,32,32);
        const material = new THREE.MeshStandardMaterial({color:0xffff00});
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(data.position);
        sphere.trivia = { question: data.question, answers: data.answers, correct: data.correct };
        scene.add(sphere);
        checkpoints.push(sphere);
    });
}

// Trivia overlay
function showTrivia(sphere){
    isTriviaActive = true;
    currentCheckpoint = sphere;
    const data = sphere.trivia;

    const triviaDiv = document.createElement('div');
    triviaDiv.id = "triviaDiv";
    triviaDiv.style.position = 'absolute';
    triviaDiv.style.top = '50%';
    triviaDiv.style.left = '50%';
    triviaDiv.style.transform = 'translate(-50%, -50%)';
    triviaDiv.style.padding = '20px';
    triviaDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    triviaDiv.style.color = 'white';
    triviaDiv.style.fontFamily = 'Arial';
    triviaDiv.style.fontSize = '20px';
    triviaDiv.style.textAlign = 'center';
    triviaDiv.style.borderRadius = '10px';
    triviaDiv.innerHTML = `<p>${data.question}</p>`;

    data.answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.innerText = ans;
        btn.style.margin = '5px';
        btn.style.padding = '10px';
        btn.onclick = () => {
            if(ans === data.correct){
                alert("Correct!");
                isTriviaActive = false;
                scene.remove(sphere);
                const idx = checkpoints.indexOf(sphere);
                if(idx !== -1) checkpoints.splice(idx,1);
                triviaDiv.remove();
            } else {
                alert("Incorrect, try again!");
            }
        };
        triviaDiv.appendChild(btn);
    });

    document.body.appendChild(triviaDiv);
}

// Debug overlay
function createDebugOverlay() {
    debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.padding = '10px';
    debugDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'Arial';
    debugDiv.style.fontSize = '16px';
    debugDiv.style.zIndex = '100';
    document.body.appendChild(debugDiv);

    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '90px'; // adjust below debug overlay
    messageDiv.style.left = '10px';
    messageDiv.style.padding = '5px';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.3)';
    messageDiv.style.color = 'white';
    messageDiv.style.fontFamily = 'Arial';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.zIndex = '100';
    messageDiv.innerText = "Press ESC to toggle the menu";
    document.body.appendChild(messageDiv);

}

// Game menu
function createMenu() {
    menuDiv = document.createElement('div');
    menuDiv.style.position = 'absolute';
    menuDiv.style.top = '50%';
    menuDiv.style.left = '50%';
    menuDiv.style.transform = 'translate(-50%, -50%)';
    menuDiv.style.padding = '20px';
    menuDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    menuDiv.style.color = 'white';
    menuDiv.style.fontFamily = 'Arial';
    menuDiv.style.fontSize = '20px';
    menuDiv.style.textAlign = 'center';
    menuDiv.style.borderRadius = '10px';
    menuDiv.style.display = 'none';
    menuDiv.style.zIndex = '200';

    const restartBtn = document.createElement('button');
    restartBtn.innerText = 'Restart';
    restartBtn.style.margin = '10px';
    restartBtn.style.padding = '10px 20px';
    restartBtn.onclick = () => {
        resetGame();
        toggleMenu(false);
    };

    const quitBtn = document.createElement('button');
    quitBtn.innerText = 'Quit';
    quitBtn.style.margin = '10px';
    quitBtn.style.padding = '10px 20px';
    quitBtn.onclick = () => {
        window.close(); // Close the tab
    };

    menuDiv.appendChild(restartBtn);
    menuDiv.appendChild(quitBtn);
    document.body.appendChild(menuDiv);
}

// Toggle menu visibility
function toggleMenu(forceState=null){
    if(forceState !== null) isMenuOpen = !forceState;
    isMenuOpen = !isMenuOpen;
    menuDiv.style.display = isMenuOpen ? 'block' : 'none';
    isTriviaActive = isMenuOpen; // pause movement while menu open
}

// Reset game
function resetGame(){
    // Reset player position
    player.position.copy(spawnPoint);
    player.rotation.y = Math.PI;

    // Remove all spheres
    checkpoints.forEach(cp => scene.remove(cp));
    checkpoints = [];

    // Recreate checkpoints
    createCheckpoints();

    // Close trivia if open
    const triviaDiv = document.getElementById('triviaDiv');
    if(triviaDiv) triviaDiv.remove();

    isTriviaActive = false;
}

// Animate loop
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if(mixer) mixer.update(delta);

    if(player && !isTriviaActive){
        let moveX = 0, moveZ = 0;
        if(keys['w']) moveZ -= playerSpeed;
        if(keys['s']) moveZ += playerSpeed;
        if(keys['a']) moveX -= playerSpeed;
        if(keys['d']) moveX += playerSpeed;

        player.position.x += moveX;
        player.position.z += moveZ;

        if(moveX !==0 || moveZ !==0){
            const angle = Math.atan2(moveX, moveZ);
            player.rotation.y = angle;
            if(action) action.paused = false;
        } else { if(action) action.paused = true; }
    }

    // Checkpoint collisions
    checkpoints.forEach(cp => {
        if(!isTriviaActive && player.position.distanceTo(cp.position) < 40){
            showTrivia(cp);
        }
    });

    // Third-person camera
    const offset = new THREE.Vector3(0,80,-65);
    const rotatedOffset = offset.clone().applyQuaternion(player.quaternion);
    const cameraTarget = player.position.clone().add(rotatedOffset);
    camera.position.lerp(cameraTarget,0.1);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0,45,0)));

    // Debug overlay
    debugDiv.innerHTML = `
        <b>Player Position:</b><br>
        X: ${player.position.x.toFixed(2)}<br>
        Y: ${player.position.y.toFixed(2)}<br>
        Z: ${player.position.z.toFixed(2)}
    `;

    renderer.render(scene, camera);
}*/



/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let player, playerSpeed = 1;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;

// Debug overlay
let debugDiv;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    // Load apartment
    const loader = new GLTFLoader();
    loader.load(
        'public/apartment/scene.gltf',
        function(gltf) {
            const apartment = gltf.scene;
            apartment.scale.set(1, 1, 1);
            apartment.position.set(0, 0, 0);
            scene.add(apartment);

            loadPlayer();
            createCheckpoints();
            createDebugOverlay();
        },
        undefined,
        function(error) {
            console.error('Error loading apartment:', error);
        }
    );

    // WASD input
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Resize handling
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Load player model
function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load(
        'scene.gltf',
        function(gltf) {
            player = gltf.scene;
            player.scale.set(20, 20, 20);
            player.position.set(-145, 0, 0);
            player.rotation.y = Math.PI;
            scene.add(player);

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(player);
                action = mixer.clipAction(gltf.animations[0]);
                action.play();
                action.paused = true;
            }
        },
        undefined,
        function(error) {
            console.error('Error loading player:', error);
        }
    );
}

// Checkpoints with positions and questions
const checkpointData = [
    {
        position: new THREE.Vector3(-120, 35, 10),
        question: "What is 2 + 2?",
        answers: ["3", "4", "5"],
        correct: "4"
    },
    {
        position: new THREE.Vector3(-145, 35, -240),
        question: "What is the capital of France?",
        answers: ["Paris", "Berlin", "Rome"],
        correct: "Paris"
    },
    {
        position: new THREE.Vector3(-375, 35, -200),
        question: "Which planet is closest to the Sun?",
        answers: ["Earth", "Mercury", "Mars"],
        correct: "Mercury"
    }
];

// Create checkpoint spheres
function createCheckpoints() {
    checkpointData.forEach(data => {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(data.position);
        scene.add(sphere);
        checkpoints.push(sphere);
    });
}

// Show trivia overlay
function showTrivia(index) {
    isTriviaActive = true;
    currentCheckpoint = index;
    const data = checkpointData[index];

    const triviaDiv = document.createElement('div');
    triviaDiv.id = "triviaDiv";
    triviaDiv.style.position = 'absolute';
    triviaDiv.style.top = '50%';
    triviaDiv.style.left = '50%';
    triviaDiv.style.transform = 'translate(-50%, -50%)';
    triviaDiv.style.padding = '20px';
    triviaDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    triviaDiv.style.color = 'white';
    triviaDiv.style.fontFamily = 'Arial';
    triviaDiv.style.fontSize = '20px';
    triviaDiv.style.textAlign = 'center';
    triviaDiv.style.borderRadius = '10px';
    triviaDiv.innerHTML = `<p>${data.question}</p>`;

    data.answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.innerText = ans;
        btn.style.margin = '5px';
        btn.style.padding = '10px';
        btn.onclick = () => {
            if (ans === data.correct) {
                alert("Correct!");
                isTriviaActive = false;
                const cp = checkpoints[index];
                scene.remove(cp);
                checkpoints.splice(index, 1);
                triviaDiv.remove();
            } else {
                alert("Incorrect, try again!");
            }
        };
        triviaDiv.appendChild(btn);
    });

    document.body.appendChild(triviaDiv);
}

// Create a debug overlay div
function createDebugOverlay() {
    debugDiv = document.createElement('div');
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.padding = '10px';
    debugDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'Arial';
    debugDiv.style.fontSize = '16px';
    debugDiv.style.zIndex = '100';
    document.body.appendChild(debugDiv);
}

// Animate loop
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (player) {
        if (!isTriviaActive) { // Block movement if trivia active
            let moveX = 0, moveZ = 0;
            if (keys['w']) moveZ -= playerSpeed;
            if (keys['s']) moveZ += playerSpeed;
            if (keys['a']) moveX -= playerSpeed;
            if (keys['d']) moveX += playerSpeed;

            player.position.x += moveX;
            player.position.z += moveZ;

            if (moveX !== 0 || moveZ !== 0) {
                const angle = Math.atan2(moveX, moveZ);
                player.rotation.y = angle;
                if (action) action.paused = false;
            } else {
                if (action) action.paused = true;
            }
        }

        // Check checkpoint collisions
        checkpoints.forEach((cp, index) => {
            const distance = player.position.distanceTo(cp.position);
            if (distance < 40 && !isTriviaActive) {
                showTrivia(index);
            }
        });

        // Third-person camera
        const offset = new THREE.Vector3(0, 80, -65);
        const rotatedOffset = offset.clone().applyQuaternion(player.quaternion);
        const cameraTarget = player.position.clone().add(rotatedOffset);
        camera.position.lerp(cameraTarget, 0.1);
        camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 45, 0)));

        // Update debug overlay
        debugDiv.innerHTML = `
            <b>Player Position:</b><br>
            X: ${player.position.x.toFixed(2)}<br>
            Y: ${player.position.y.toFixed(2)}<br>
            Z: ${player.position.z.toFixed(2)}
        `;
    }

    renderer.render(scene, camera);
}*/

/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let player, playerSpeed = 1;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Debug overlay for player coordinates
    const debugDiv = document.createElement('div');
    debugDiv.id = "debugDiv";
    debugDiv.style.position = 'absolute';
    debugDiv.style.top = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.padding = '5px 10px';
    debugDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugDiv.style.color = 'white';
    debugDiv.style.fontFamily = 'Arial';
    debugDiv.style.fontSize = '14px';
    debugDiv.style.zIndex = '100';
    document.body.appendChild(debugDiv);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    const loader = new GLTFLoader();

    // Load Apartment Scene
    loader.load(
        'public/apartment/scene.gltf',
        function(gltf) {
            const apartment = gltf.scene;
            apartment.scale.set(1, 1, 1);
            apartment.position.set(0, 0, 0);
            scene.add(apartment);

            // Spawn player and create checkpoints
            loadPlayer();
            createCheckpoints();
        },
        undefined,
        function(error) {
            console.error('Error loading apartment:', error);
        }
    );

    // WASD input
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Resize handling
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load(
        'scene.gltf',
        function(gltf) {
            player = gltf.scene;
            player.scale.set(20, 20, 20);
            player.position.set(-145, 0, 0);
            player.rotation.y = Math.PI;
            scene.add(player);

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(player);
                action = mixer.clipAction(gltf.animations[0]);
                action.play();
                action.paused = true;
            }
        },
        undefined,
        function(error) {
            console.error('Error loading player:', error);
        }
    );
}

function createCheckpoints() {
    const positions = [
        new THREE.Vector3(-120, 35, 10),
        new THREE.Vector3(-145, 35, -240),
        new THREE.Vector3(-375, 35, -200)
    ];

    positions.forEach(pos => {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(pos);
        scene.add(sphere);
        checkpoints.push(sphere);
    });
}

function showTrivia(checkpointIndex) {
    isTriviaActive = true;
    currentCheckpoint = checkpointIndex;

    const question = "What is 2 + 2?";
    const answers = ["3", "4", "5"];

    const triviaDiv = document.createElement('div');
    triviaDiv.id = "triviaDiv";
    triviaDiv.style.position = 'absolute';
    triviaDiv.style.top = '50%';
    triviaDiv.style.left = '50%';
    triviaDiv.style.transform = 'translate(-50%, -50%)';
    triviaDiv.style.padding = '20px';
    triviaDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    triviaDiv.style.color = 'white';
    triviaDiv.style.fontFamily = 'Arial';
    triviaDiv.style.fontSize = '20px';
    triviaDiv.style.textAlign = 'center';
    triviaDiv.style.borderRadius = '10px';
    triviaDiv.innerHTML = `<p>${question}</p>`;

    answers.forEach(ans => {
        let btn = document.createElement('button');
        btn.innerText = ans;
        btn.style.margin = '5px';
        btn.style.padding = '10px';
        btn.onclick = () => {
            if (ans === "4") {
                alert("Correct!");
                isTriviaActive = false;
                const cp = checkpoints[checkpointIndex];
                scene.remove(cp);
                checkpoints.splice(checkpointIndex, 1);
                triviaDiv.remove();
            } else {
                alert("Incorrect, try again!");
            }
        };
        triviaDiv.appendChild(btn);
    });

    document.body.appendChild(triviaDiv);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (player) {
        if (!isTriviaActive) {
            let moveX = 0, moveZ = 0;
            if (keys['w']) moveZ -= playerSpeed;
            if (keys['s']) moveZ += playerSpeed;
            if (keys['a']) moveX -= playerSpeed;
            if (keys['d']) moveX += playerSpeed;

            player.position.x += moveX;
            player.position.z += moveZ;

            if (moveX !== 0 || moveZ !== 0) {
                const angle = Math.atan2(moveX, moveZ);
                player.rotation.y = angle;
                if (action) action.paused = false;
            } else {
                if (action) action.paused = true;
            }
        }

        // Check checkpoint collisions
        checkpoints.forEach((cp, index) => {
            const distance = player.position.distanceTo(cp.position);
            if (distance < 40 && !isTriviaActive) {
                showTrivia(index);
            }
        });

        // Third-person camera
        const offset = new THREE.Vector3(0, 80, -65);
        const rotatedOffset = offset.clone().applyQuaternion(player.quaternion);
        const cameraTarget = player.position.clone().add(rotatedOffset);
        camera.position.lerp(cameraTarget, 0.1);
        camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 45, 0)));

        // Update debug coordinates
        const debugDiv = document.getElementById('debugDiv');
        if (debugDiv) {
            debugDiv.innerHTML = `Player Position:<br>
                                  X: ${player.position.x.toFixed(2)}<br>
                                  Y: ${player.position.y.toFixed(2)}<br>
                                  Z: ${player.position.z.toFixed(2)}`;
        }
    }

    renderer.render(scene, camera);
}*/



/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let player, playerSpeed = 1;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    const loader = new GLTFLoader();

    // Load Apartment Scene
    loader.load(
        'public/apartment/scene.gltf', // adjust path
        function(gltf) {
            const apartment = gltf.scene;
            apartment.scale.set(1, 1, 1);
            apartment.position.set(0, 0, 0);
            scene.add(apartment);

            // After apartment loads, spawn player
            loadPlayer();
            createCheckpoints();
        },
        undefined,
        function(error) {
            console.error('Error loading apartment:', error);
        }
    );

    // WASD input
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/'); // adjust path
    loader.load(
        'scene.gltf',
        function(gltf) {
            player = gltf.scene;
            player.scale.set(20, 20, 20);

            // Spawn point
            player.position.set(-145, 0, 0);
            player.rotation.y = Math.PI;
            scene.add(player);

            // Setup animation
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(player);
                action = mixer.clipAction(gltf.animations[0]);
                action.play();
                action.paused = true;
            }
        },
        undefined,
        function(error) {
            console.error('Error loading player:', error);
        }
    );
}

function createCheckpoints() {
    const positions = [
        new THREE.Vector3(-120, 20, 10),
        new THREE.Vector3(-50, 20, -30),
        new THREE.Vector3(-10, 20, 40)
    ];

    positions.forEach(pos => {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(pos);
        scene.add(sphere);
        checkpoints.push(sphere);
    });
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (player) {
        let moveX = 0, moveZ = 0;
        if (keys['w']) moveZ -= playerSpeed;
        if (keys['s']) moveZ += playerSpeed;
        if (keys['a']) moveX -= playerSpeed;
        if (keys['d']) moveX += playerSpeed;

        // Save old position
        const oldPos = player.position.clone();

        // Move player
        player.position.x += moveX;
        player.position.z += moveZ;

        // Rotate player
        if (moveX !== 0 || moveZ !== 0) {
            const angle = Math.atan2(moveX, moveZ);
            player.rotation.y = angle;
            if (action) action.paused = false;
        } else {
            if (action) action.paused = true;
        }

        // === Checkpoint collisions ===
        checkpoints.forEach((cp, index) => {
            const distance = player.position.distanceTo(cp.position);
            if (distance < 25) {
                alert(`Checkpoint ${index + 1} reached!`);
                scene.remove(cp);
                checkpoints.splice(index, 1);
            }
        });

        // === Third-person camera ===
        const offset = new THREE.Vector3(0, 80, -65);
        const rotatedOffset = offset.clone().applyQuaternion(player.quaternion);
        const cameraTarget = player.position.clone().add(rotatedOffset);
        camera.position.lerp(cameraTarget, 0.1);
        camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 45, 0)));
    }

    renderer.render(scene, camera);
}*/


/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let player, playerSpeed = 1;
let keys = {};
let mixer, clock = new THREE.Clock(), action;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    // Remove old ground plane (apartment will have its own floor)
    // const groundGeometry = new THREE.PlaneGeometry(50, 50);
    // const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    // const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    // ground.rotation.x = -Math.PI / 2;
    // scene.add(ground);

    const loader = new GLTFLoader();

    // Load Apartment Scene
    loader.load(
        'public/apartment/scene.gltf', // adjust path
        function(gltf) {
            const apartment = gltf.scene;
            apartment.scale.set(1, 1, 1); // scale if too small/large
            apartment.position.set(0, 0, 0);
            scene.add(apartment);

            // After apartment loads, spawn player inside
            loadPlayer();
        },
        undefined,
        function(error) {
            console.error('Error loading apartment:', error);
        }
    );

    // WASD input
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/'); // adjust path to your player
    loader.load(
        'scene.gltf',
        function(gltf) {
            player = gltf.scene;
            player.scale.set(20, 20, 20);

            // Spawn point (adjust depending on apartment layout)
            player.position.set(-145, 0, 0); 
            player.rotation.y = Math.PI;
            scene.add(player);

            // Setup animation
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(player);
                action = mixer.clipAction(gltf.animations[0]);
                action.play();
                action.paused = true;
            }
        },
        undefined,
        function(error) {
            console.error('Error loading player:', error);
        }
    );
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (player) {
        let moveX = 0, moveZ = 0;
        if (keys['w']) moveZ -= playerSpeed;
        if (keys['s']) moveZ += playerSpeed;
        if (keys['a']) moveX -= playerSpeed;
        if (keys['d']) moveX += playerSpeed;

        // Save old position (for collision checks later)
        const oldPos = player.position.clone();

        // Move player
        player.position.x += moveX;
        player.position.z += moveZ;

        // Rotate player toward movement direction
        if (moveX !== 0 || moveZ !== 0) {
            const angle = Math.atan2(moveX, moveZ);
            player.rotation.y = angle;
            if (action) action.paused = false;
        } else {
            if (action) action.paused = true;
        }

        // === Third-person camera ===
        const offset = new THREE.Vector3(0, 80, -65); // above & behind player
        const rotatedOffset = offset.clone().applyQuaternion(player.quaternion); // rotate offset with player
        const cameraTarget = player.position.clone().add(rotatedOffset);

        // Smooth camera movement
        camera.position.lerp(cameraTarget, 0.1);

        // Look at player (aim at chest height instead of feet)
        camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 45, 0)));
    }

    renderer.render(scene, camera);
}*/




/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let player, playerSpeed = 0.1;
let keys = {};
let mixer, clock = new THREE.Clock(), action;

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Load GLB model
    const loader = new GLTFLoader().setPath('public/running/'); // adjust path
    loader.load(
        'scene.gltf',
        function(gltf) {
            player = gltf.scene;
            player.scale.set(1, 1, 1);
            player.position.set(0, 0, 0);
            scene.add(player);

            // Setup animation
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(player);
                action = mixer.clipAction(gltf.animations[0]); // first animation
                action.play();
                action.paused = true; // start paused
            }
        },
        undefined,
        function(error) {
            console.error('Error loading GLB:', error);
        }
    );

    // WASD input
    window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if(player) {
    // Detect movement
    let moveX = 0, moveZ = 0;
    if(keys['w']) moveZ -= playerSpeed;
    if(keys['s']) moveZ += playerSpeed;
    if(keys['a']) moveX -= playerSpeed;
    if(keys['d']) moveX += playerSpeed;

    // Update position
    player.position.x += moveX;
    player.position.z += moveZ;

    // Rotate to face movement
    if(moveX !== 0 || moveZ !== 0) {
        const angle = Math.atan2(moveX, moveZ); // note: x first, z second
        player.rotation.y = angle;
        if(action) action.paused = false; // play animation
    } else {
        if(action) action.paused = true; // pause animation if not moving
    }

    // Camera follows player
    camera.position.x = player.position.x + 5;
    camera.position.z = player.position.z + 5;
    camera.position.y = player.position.y + 3;
    camera.lookAt(player.position);
}


    renderer.render(scene, camera);
}*/

