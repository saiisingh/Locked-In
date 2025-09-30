import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// --- Stage Checkpoint Data ---
const streetCheckpointData = [
    { position: new THREE.Vector3(-3943,35,-3032), question: "What color do you get when you mix red and white?", answers: ["Pink", "Purple", "Orange"], correct: "Pink" },
    { position: new THREE.Vector3(-4193,35,-1446), question: "Which animal is known as the 'King of the Jungle'?", answers: ["Lion", "Tiger", "Elephant"], correct: "Lion" },
    { position: new THREE.Vector3(-5679,35,-92), question: "What is the largest planet in our solar system?", answers: ["Earth", "Jupiter", "Mars"], correct: "Jupiter"}
];
const warehouseCheckpointData = [
    { position: new THREE.Vector3(494,35,-294), question: "Who wrote the play Romeo and Juliet?", answers: ["William Shakespeare", "Mark Twain", "Charles Dickens"], correct: "William Shakespeare" },
    { position: new THREE.Vector3(668,35,-294), question: "Who developed the theory of relativity?", answers: ["Newton","Einstein","Tesla"], correct: "Einstein" },
    { position: new THREE.Vector3(632,35,-222), question: "In which country would you find the city of Kyoto?", answers: ["Japan", "China", "South Korea"], correct: "Japan" }
];
const apartmentCheckpointData = [
    { position: new THREE.Vector3(-120, 35, 10), question: "What is the capital of Mongolia?", answers: ["Ulaanbaatar", "Astana", "Tashkent"], correct: "Ulaanbaatar" },
    { position: new THREE.Vector3(-145, 35, -240), question: "Who painted the Garden of Earthly Delights?", answers: ["Hieronymus Bosch", "Leonardo da Vinci", "Michelangelo"], correct: "Hieronymus Bosch" },
    { position: new THREE.Vector3(-375, 35, -200), question: "What is the rarest naturally occurring element on Earth?", answers: ["Astatine", "Platinum", "Uranium"], correct: "Astatine" }
];


// --- Global Variables ---
let scene, camera, renderer;
let player;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;
let menuDiv, keyCounterDiv; // <<< RENAMED
let isMenuOpen = false;
let loadingScreenDiv;

// Stage tracking
let stage = 1;

// Timer
let timerDiv;
let totalTime = 180;
let remainingTime = totalTime;
let timerInterval;
let isTimerRunning = false;

// Player spawn point
const spawnPoint = new THREE.Vector3(-2265, 0, -32);


let keysCollected = 0;

// Collision detection
let collisionObjects = []; 
const raycaster = new THREE.Raycaster();

// Variables for the movement and camera system
let playerBaseSpeed = 250.0; 
const sprintMultiplier = 1.5;
let cameraMode = 'thirdPerson';
let controls; 

// Collision and camera variables
const playerColliderRadius = 15; 

// First-person camera variables
let firstPersonYaw = 0;
let firstPersonPitch = 0;
let isPointerLocked = false;

// Physics variables
let yVelocity = 0;
const gravity = -90; 
const jumpStrength = 70; 
let isGrounded = false;
const playerHeight = 40; 

// Idle snap timer (seconds)
let idleTimer = 0;

const cameraTarget = new THREE.Vector3();


// --- Init ---
init();
animate();

function setHeadVisibility(visible) {
    if (!player) return;
    player.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes("head")) {
            child.visible = visible;
        }
    });
}


function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(spawnPoint.x, spawnPoint.y + 200, spawnPoint.z + 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
  
    controls.minDistance = 35;  
    controls.maxDistance = 120; 
    controls.minPolarAngle = Math.PI * 0.1;
    controls.maxPolarAngle = Math.PI * 0.7;
    controls.target.set(spawnPoint.x, spawnPoint.y + playerHeight / 2, spawnPoint.z);

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    createLoadingScreen();
    createMenu();

    const loader = new GLTFLoader();
    showLoadingScreen();

    // Load scenes and set up for collision
    loader.load('public/street/scene.gltf', function(gltf) {
        const street = gltf.scene;
        street.scale.set(600, 600, 600);
        street.position.set(-4000, 0, 0);
        scene.add(street);
        street.traverse(child => { if (child.isMesh) collisionObjects.push(child); });
    });
    loader.load('public/warehouse/scene.gltf', function(gltf2) {
        const warehouse = gltf2.scene;
        warehouse.scale.set(50, 50, 50);
        warehouse.position.set(500, 0, 0);
        scene.add(warehouse);
        warehouse.traverse(child => { if (child.isMesh) collisionObjects.push(child); });
    });
    loader.load('public/apartment/scene.gltf', function(gltf3) {
        const apartment = gltf3.scene;
        apartment.scale.set(1, 1, 1);
        apartment.position.set(0, 0, 0);
        scene.add(apartment);
        apartment.traverse(child => { if (child.isMesh) collisionObjects.push(child); });
    });

    loadPlayer();
    createCheckpoints(streetCheckpointData);
    createUI();
    createTimer();
    setupEventListeners();
    startTimer();
    hideLoadingScreen();
}


function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === "Escape") toggleMenu();
        if (e.key.toLowerCase() === 'c' && !isTriviaActive && !isMenuOpen) {
            toggleCameraMode();
        }
    });
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    document.addEventListener('mousedown', () => {
        if (cameraMode === 'firstPerson' && !isPointerLocked && !isTriviaActive && !isMenuOpen) {
            renderer.domElement.requestPointerLock();
        }
    });
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });
    document.addEventListener('mousemove', onMouseMove);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function onMouseMove(event) {
    if (cameraMode === 'firstPerson' && isPointerLocked) {
        const deltaX = event.movementX || 0;
        const deltaY = event.movementY || 0;
        firstPersonYaw -= deltaX * 0.002;
        firstPersonPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, firstPersonPitch - deltaY * 0.002));
    }
}

function toggleCameraMode() {
    cameraMode = cameraMode === 'thirdPerson' ? 'firstPerson' : 'thirdPerson';
    if (cameraMode === 'firstPerson') {
        firstPersonYaw = player.rotation.y;
        firstPersonPitch = 0;
        setHeadVisibility(false);
        renderer.domElement.requestPointerLock();
    } else {
        setHeadVisibility(true);
        document.exitPointerLock();
    }
    const instructionsDiv = document.getElementById('instructions-ui');
    if (instructionsDiv) updateInstructionsUI();
}


function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load('scene.gltf', function(gltf) {
        player = gltf.scene;
        player.scale.set(20, 20, 20);
        player.position.copy(spawnPoint);
        player.rotation.y = Math.PI;
        scene.add(player);

        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(player);
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
            action.paused = true;
        }
        setHeadVisibility(true);
    });
}


function createCheckpoints(data) {
    checkpoints = [];
    keysCollected = 0; // <<< RENAMED
    updateKeyCounter(); // <<< RENAMED
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
    // Pause gameplay and show trivia UI
    isTriviaActive = true;
    currentCheckpoint = sphere;
    const data = sphere.trivia;
    const triviaDiv = document.createElement('div');
    triviaDiv.id = "triviaDiv";
    // (Styles are unchanged)
    triviaDiv.style.position = 'absolute'; triviaDiv.style.top = '50%'; triviaDiv.style.left = '50%'; triviaDiv.style.transform = 'translate(-50%, -50%)'; triviaDiv.style.padding = '20px'; triviaDiv.style.backgroundColor = 'rgba(0,0,0,0.8)'; triviaDiv.style.color = 'white'; triviaDiv.style.fontFamily = 'Arial'; triviaDiv.style.fontSize = '20px'; triviaDiv.style.textAlign = 'center'; triviaDiv.style.borderRadius = '10px';
    triviaDiv.innerHTML = `<p>${data.question}</p>`;
    data.answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.innerText = ans;
        btn.style.margin = '5px'; btn.style.padding = '10px';
        btn.onclick = () => {
            if(ans === data.correct){
                alert("Correct!");
                keysCollected++; // <<< RENAMED
                updateKeyCounter(); // <<< RENAMED

                remainingTime += 15;
                updateTimerDisplay();

                // cleanup trivia and resume
                isTriviaActive = false;
                scene.remove(sphere);
                const idx = checkpoints.indexOf(sphere);
                if(idx !== -1) checkpoints.splice(idx,1);
                triviaDiv.remove();

                // ensure player is snapped back to ground to avoid falling through
                snapPlayerToGround();

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

// Helper: snap the player to the nearest ground below them
function snapPlayerToGround() {
    if (!player || collisionObjects.length === 0) return;
    const origin = player.position.clone();
    origin.y += 200; // cast from well above the player to find ground reliably
    raycaster.set(origin, new THREE.Vector3(0, -1, 0));
    raycaster.far = 500;
    const intersects = raycaster.intersectObjects(collisionObjects, true);
    if (intersects.length > 0) {
        player.position.y = intersects[0].point.y;
        yVelocity = 0;
        isGrounded = true;
    }
}

function enterWarehouse() {
    stage = 2;
    player.position.set(515,0,-87);
    createCheckpoints(warehouseCheckpointData);
    clearInterval(timerInterval);
    totalTime = 120;
    remainingTime = totalTime;
    startTimer();
    alert("Welcome to the Warehouse! Collect 3 keys!"); // <<< RENAMED
}

function enterApartment() {
    stage = 3;
    player.position.set(-145,0,0);
    createCheckpoints(apartmentCheckpointData);
    clearInterval(timerInterval);
    totalTime = 60;
    remainingTime = totalTime;
    startTimer();
    alert("Final Stage: The Apartment! Collect 3 keys!"); // <<< RENAMED
}

// (Win/Lose, Timer, Loading Screen, and Menu functions remain unchanged)
// --- Win/Lose ---
function finalWin() {
    isTriviaActive = true; clearInterval(timerInterval); isTimerRunning = false;
    const winDiv = document.createElement('div'); winDiv.id = 'winDiv';
    // (Styles are unchanged)
    winDiv.style.position = 'absolute'; winDiv.style.top = '50%'; winDiv.style.left = '50%'; winDiv.style.transform = 'translate(-50%, -50%)'; winDiv.style.padding = '20px'; winDiv.style.backgroundColor = 'rgba(0,0,0,0.9)'; winDiv.style.color = 'white'; winDiv.style.fontFamily = 'Arial'; winDiv.style.fontSize = '24px'; winDiv.style.textAlign = 'center'; winDiv.style.borderRadius = '10px'; winDiv.style.zIndex = '300';
    winDiv.innerHTML = "<p>Congratulations! You completed all stages!</p>";
    const restartBtn = document.createElement('button'); restartBtn.innerText = 'Restart'; restartBtn.style.margin = '10px'; restartBtn.style.padding = '10px 20px'; restartBtn.onclick = () => location.reload();
    const quitBtn = document.createElement('button'); quitBtn.innerText = 'Quit'; quitBtn.style.margin = '10px'; quitBtn.style.padding = '10px 20px'; quitBtn.onclick = () => window.close();
    winDiv.appendChild(restartBtn); winDiv.appendChild(quitBtn); document.body.appendChild(winDiv);
}
function handleDeath() {
    isTriviaActive = true;
    const deathDiv = document.createElement('div');
    // (Styles are unchanged)
    deathDiv.style.position = 'absolute'; deathDiv.style.top = '50%'; deathDiv.style.left = '50%'; deathDiv.style.transform = 'translate(-50%, -50%)'; deathDiv.style.padding = '20px'; deathDiv.style.backgroundColor = 'rgba(0,0,0,0.9)'; deathDiv.style.color = 'white'; deathDiv.style.fontFamily = 'Arial'; deathDiv.style.fontSize = '24px'; deathDiv.style.textAlign = 'center'; deathDiv.style.borderRadius = '10px'; deathDiv.style.zIndex = '300';
    deathDiv.innerHTML = "<p>You have died!</p>";
    const restartBtn = document.createElement('button'); restartBtn.innerText = 'Restart'; restartBtn.style.margin = '10px'; restartBtn.style.padding = '10px 20px'; restartBtn.onclick = () => location.reload();
    const quitBtn = document.createElement('button'); quitBtn.innerText = 'Quit'; quitBtn.style.margin = '10px'; quitBtn.style.padding = '10px 20px'; quitBtn.onclick = () => window.close();
    deathDiv.appendChild(restartBtn); deathDiv.appendChild(quitBtn); document.body.appendChild(deathDiv);
}
// --- Timer ---
function createTimer() {
    timerDiv = document.createElement('div');
    // (Styles are unchanged)
    timerDiv.style.position = 'absolute'; timerDiv.style.top = '10px'; timerDiv.style.right = '10px'; timerDiv.style.padding = '10px 15px'; timerDiv.style.backgroundColor = 'rgba(0,0,0,0.7)'; timerDiv.style.color = 'white'; timerDiv.style.fontFamily = 'Arial'; timerDiv.style.fontSize = '16px'; timerDiv.style.borderRadius = '5px'; timerDiv.style.zIndex = '100';
    document.body.appendChild(timerDiv); updateTimerDisplay();
}
function startTimer() {
    clearInterval(timerInterval); remainingTime = totalTime; isTimerRunning = true; updateTimerDisplay();
    timerInterval = setInterval(() => {
        if (!isTimerRunning) return;
        remainingTime--; updateTimerDisplay();
        if (remainingTime <= 0) { clearInterval(timerInterval); isTimerRunning = false; handleDeath(); }
    }, 1000);
}
function updateTimerDisplay() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerDiv.innerText = `Time: ${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

// <<< RENAMED: Key Counter functions
function updateKeyCounter() {
    if(keyCounterDiv){
        keyCounterDiv.innerText = `Keys Collected: ${keysCollected} / 3`;
    }
}

// --- Loading Screen ---
function createLoadingScreen() {
    loadingScreenDiv = document.createElement('div');
    // (Styles are unchanged)
    loadingScreenDiv.style.position = 'absolute'; loadingScreenDiv.style.top = '0'; loadingScreenDiv.style.left = '0'; loadingScreenDiv.style.width = '100%'; loadingScreenDiv.style.height = '100%'; loadingScreenDiv.style.backgroundColor = 'black'; loadingScreenDiv.style.color = 'white'; loadingScreenDiv.style.display = 'flex'; loadingScreenDiv.style.justifyContent = 'center'; loadingScreenDiv.style.alignItems = 'center'; loadingScreenDiv.style.zIndex = '999'; loadingScreenDiv.style.fontSize = '3em';
    loadingScreenDiv.innerText = 'Loading...';
    document.body.appendChild(loadingScreenDiv);
}
function showLoadingScreen() { loadingScreenDiv.style.display = 'flex';}
function hideLoadingScreen() { loadingScreenDiv.style.display = 'none';}

// --- UI ---
function createUI() {
    // <<< RENAMED
    keyCounterDiv = document.createElement('div');
    keyCounterDiv.style.position = 'absolute';
    keyCounterDiv.style.top = '10px';
    keyCounterDiv.style.left = '10px';
    // (Styles are unchanged)
    keyCounterDiv.style.padding = '10px 15px'; keyCounterDiv.style.backgroundColor = 'rgba(0,0,0,0.7)'; keyCounterDiv.style.color = 'white'; keyCounterDiv.style.fontFamily = 'Arial'; keyCounterDiv.style.fontSize = '16px'; keyCounterDiv.style.borderRadius = '5px'; keyCounterDiv.style.zIndex = '100';
    document.body.appendChild(keyCounterDiv);
    updateKeyCounter();

    const instructionsDiv = document.createElement('div');
    instructionsDiv.id = 'instructions-ui';
    // (Styles are unchanged)
    instructionsDiv.style.position = 'absolute'; instructionsDiv.style.bottom = '10px'; instructionsDiv.style.left = '10px'; instructionsDiv.style.padding = '10px'; instructionsDiv.style.backgroundColor = 'rgba(0,0,0,0.5)'; instructionsDiv.style.color = 'white'; instructionsDiv.style.fontFamily = 'Arial'; instructionsDiv.style.fontSize = '14px'; instructionsDiv.style.borderRadius = '5px'; instructionsDiv.style.zIndex = '100';
    document.body.appendChild(instructionsDiv);
    updateInstructionsUI();
}

function updateInstructionsUI() {
    const instructionsDiv = document.getElementById('instructions-ui');
    if (!instructionsDiv) return;
    let modeText = cameraMode === 'thirdPerson' ? 
        `<b>Mouse:</b> Orbit Camera | <b>Scroll:</b> Zoom` : 
        `<b>Click:</b> Lock Mouse | <b>Mouse:</b> Look Around`;
    instructionsDiv.innerHTML = `<b>WASD:</b> Move | <b>Shift:</b> Sprint | <b>Space:</b> Jump | <b>C:</b> Toggle Camera | <b>ESC:</b> Menu<br>${modeText}`;
}

function createMenu() {
// (Menu creation is unchanged)
    menuDiv = document.createElement('div');
    // (Styles are unchanged)
    menuDiv.style.position = 'absolute'; menuDiv.style.top = '50%'; menuDiv.style.left = '50%'; menuDiv.style.transform = 'translate(-50%, -50%)'; menuDiv.style.padding = '30px'; menuDiv.style.backgroundColor = 'rgba(0,0,0,0.9)'; menuDiv.style.color = 'white'; menuDiv.style.fontFamily = 'Arial'; menuDiv.style.fontSize = '18px'; menuDiv.style.textAlign = 'center'; menuDiv.style.borderRadius = '15px'; menuDiv.style.display = 'none'; menuDiv.style.zIndex = '200';
    const title = document.createElement('h2'); title.innerText = 'GAME PAUSED'; title.style.margin = '0 0 20px 0';
    const controls = document.createElement('div'); controls.style.textAlign = 'left'; controls.style.margin = '20px 0'; controls.style.fontSize = '16px';
    controls.innerHTML = `<h3>Controls:</h3><p><strong>W, A, S, D</strong> - Move</p><p><strong>Mouse</strong> - Look around</p><p><strong>Shift</strong> - Sprint</p><p><strong>Space</strong> - Jump</p><p><strong>ESC</strong> - Toggle this menu</p><p><strong>C</strong> - Toggle Camera</p>`;
    const buttonContainer = document.createElement('div'); buttonContainer.style.marginTop = '20px';
    const resumeBtn = document.createElement('button'); resumeBtn.innerText = 'Resume'; resumeBtn.style.margin = '10px'; resumeBtn.style.padding = '10px 20px'; resumeBtn.style.fontSize = '16px'; resumeBtn.style.borderRadius = '5px'; resumeBtn.style.border = 'none'; resumeBtn.style.backgroundColor = '#4CAF50'; resumeBtn.style.color = 'white'; resumeBtn.style.cursor = 'pointer'; resumeBtn.onclick = () => toggleMenu();
    const restartBtn = document.createElement('button'); restartBtn.innerText = 'Restart'; restartBtn.style.margin = '10px'; restartBtn.style.padding = '10px 20px'; restartBtn.style.fontSize = '16px'; restartBtn.style.borderRadius = '5px'; restartBtn.style.border = 'none'; restartBtn.style.backgroundColor = '#f44336'; restartBtn.style.color = 'white'; restartBtn.style.cursor = 'pointer'; restartBtn.onclick = () => location.reload();
    const quitBtn = document.createElement('button'); quitBtn.innerText = 'Quit'; quitBtn.style.margin = '10px'; quitBtn.style.padding = '10px 20px'; quitBtn.style.fontSize = '16px'; quitBtn.style.borderRadius = '5px'; quitBtn.style.border = 'none'; quitBtn.style.backgroundColor = '#555'; quitBtn.style.color = 'white'; quitBtn.style.cursor = 'pointer'; quitBtn.onclick = () => window.close();
    buttonContainer.appendChild(resumeBtn); buttonContainer.appendChild(restartBtn); buttonContainer.appendChild(quitBtn);
    menuDiv.appendChild(title); menuDiv.appendChild(controls); menuDiv.appendChild(buttonContainer); document.body.appendChild(menuDiv);
}
function toggleMenu(forceState = null) {
    if (forceState !== null) isMenuOpen = forceState; else isMenuOpen = !isMenuOpen;
    menuDiv.style.display = isMenuOpen ? 'block' : 'none'; isTriviaActive = isMenuOpen;
    if (isPointerLocked && isMenuOpen) { document.exitPointerLock();}
}


function updatePlayer(delta) {
    if (!player || collisionObjects.length === 0 || isTriviaActive || isMenuOpen) return;

    const moveX = (keys['a'] ? 1 : 0) + (keys['d'] ? -1 : 0);
    const moveZ = (keys['w'] ? 1 : 0) + (keys['s'] ? -1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    if (action) action.paused = !isMoving;
    
    if (isMoving) {
        let moveDirection = new THREE.Vector3(moveX, 0, moveZ);
        moveDirection.normalize();

        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        const cameraAngle = Math.atan2(camDir.x, camDir.z);
        moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);

        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
        player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRotation, 0.15);

        const speed = playerBaseSpeed * (keys['shift'] ? sprintMultiplier : 1.0);
        if (action) action.timeScale = keys['shift'] ? sprintMultiplier : 1.0;

        const moveVector = moveDirection.multiplyScalar(speed * delta);

        const playerCenter = player.position.clone().add(new THREE.Vector3(0, playerHeight / 2, 0));
        raycaster.set(playerCenter, moveDirection);
        raycaster.far = playerColliderRadius;
        if (raycaster.intersectObjects(collisionObjects, true).length === 0) {
            player.position.add(moveVector);
        }
        // reset idle timer when moving
        idleTimer = 0;
    }
    else {
        // accumulate idle time when standing still
        idleTimer += delta;
        if (idleTimer > 3.0) {
            // periodically re-snap to ground to avoid slow drift-through
            snapPlayerToGround();
            idleTimer = 0;
        }
    }

    if (keys[' '] && isGrounded) {
        yVelocity = jumpStrength;
        isGrounded = false;
    }

    yVelocity += gravity * delta;
    player.position.y += yVelocity * delta;

    // Cast from above the player to reliably find ground under various terrain
    const groundRayOrigin = player.position.clone().add(new THREE.Vector3(0, 200, 0));
    raycaster.set(groundRayOrigin, new THREE.Vector3(0, -1, 0));
    raycaster.far = 500; // allow long falls to be detected
    const groundIntersects = raycaster.intersectObjects(collisionObjects, true);

    if (groundIntersects.length > 0) {
        const groundY = groundIntersects[0].point.y;
        // Add a small tolerance so the player doesn't jitter or fall through
        if (player.position.y <= groundY + 0.5) { 
            player.position.y = groundY + 0.5;
            yVelocity = 0;
            isGrounded = true;
        }
    } else {
        isGrounded = false;
    }
}

function updateCamera(delta) {
    if (!player) return;

    if (cameraMode === 'thirdPerson') {
        controls.enabled = true;
        
         const playerHead = player.position.clone().add(new THREE.Vector3(0, playerHeight / 1, 0));
        cameraTarget.lerp(playerHead, 0.1);
        controls.target.copy(cameraTarget);
        controls.update();

        const cameraPosition = camera.position.clone();
        const cameraDirection = new THREE.Vector3().subVectors(cameraPosition, controls.target).normalize();
        const distance = cameraPosition.distanceTo(controls.target);

        raycaster.set(controls.target, cameraDirection);
        raycaster.far = distance;
        const intersects = raycaster.intersectObjects(collisionObjects, true);

        if (intersects.length > 0) {
            camera.position.copy(intersects[0].point).addScaledVector(cameraDirection, -5.0);
        }

    } else { // First Person
        controls.enabled = false;
        player.rotation.y = firstPersonYaw;
        const eyeHeight = playerHeight * 0.9;
        const headPos = player.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
        const lookDirection = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(firstPersonPitch, firstPersonYaw, 0, 'YXZ'));
        
        // <<< FIXED: Position camera slightly in front of the head to avoid clipping
        const cameraPosition = headPos.clone().addScaledVector(lookDirection, 5);
        camera.position.copy(cameraPosition);

        // Look further ahead in the same direction for a stable view
        const lookAtTarget = headPos.addScaledVector(lookDirection, 100);
        camera.lookAt(lookAtTarget);
    }
}


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    updatePlayer(delta);
    updateCamera(delta);
    
    checkpoints.forEach(cp => {
        if (!isTriviaActive && player && player.position.distanceTo(cp.position) < 40) {
            showTrivia(cp);
        }
    });

    renderer.render(scene, camera);
}