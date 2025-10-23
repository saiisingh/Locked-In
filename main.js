import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Question Libraries ---
// Easy (Stage 1)
const easyQuestions = [
    { question: "What color do you get when you mix red and white?", answers: ["Pink", "Purple", "Orange"], correct: "Pink" },
    { question: "Which animal is known as the 'King of the Jungle'?", answers: ["Lion", "Tiger", "Elephant"], correct: "Lion" },
    { question: "What is the largest planet in our solar system?", answers: ["Earth", "Jupiter", "Mars"], correct: "Jupiter" },
    { question: "How many continents are there on Earth?", answers: ["5", "6", "7"], correct: "7" },
    { question: "What do bees collect from flowers?", answers: ["Nectar", "Pollen", "Water"], correct: "Nectar" },
    { question: "Which ocean is the largest?", answers: ["Atlantic", "Indian", "Pacific"], correct: "Pacific" },
    { question: "What is the main ingredient in guacamole?", answers: ["Tomato", "Avocado", "Potato"], correct: "Avocado" },
    { question: "What do bees produce?", answers: ["Milk", "Honey", "Wax"], correct: "Honey" },
    { question: "How many legs does a spider have?", answers: ["6", "8", "10"], correct: "8" }
];

// Medium (Stage 2)
const mediumQuestions = [
    { question: "Who wrote the play Romeo and Juliet?", answers: ["William Shakespeare", "Mark Twain", "Charles Dickens"], correct: "William Shakespeare" },
    { question: "Who developed the theory of relativity?", answers: ["Newton","Einstein","Tesla"], correct: "Einstein" },
    { question: "In which country would you find the city of Kyoto?", answers: ["Japan", "China", "South Korea"], correct: "Japan" },
    { question: "What is the capital city of Australia?", answers: ["Sydney", "Canberra", "Melbourne"], correct: "Canberra" },
    { question: "Which element has the chemical symbol 'Fe'?", answers: ["Iron", "Fluorine", "Lead"], correct: "Iron" },
    { question: "Which language has the most native speakers worldwide?", answers: ["English", "Mandarin Chinese", "Spanish"], correct: "Mandarin Chinese" },
    { question: "In computing, what does 'CPU' stand for?", answers: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility"], correct: "Central Processing Unit" },
    { question: "Which gas do plants absorb from the atmosphere?", answers: ["Oxygen", "Carbon Dioxide", "Nitrogen"], correct: "Carbon Dioxide" },
    { question: "What is the hardest natural substance on Earth?", answers: ["Gold", "Diamond", "Iron"], correct: "Diamond" }
];

// Hard (Stage 3)
const hardQuestions = [
    { question: "What is the capital of Mongolia?", answers: ["Ulaanbaatar", "Astana", "Tashkent"], correct: "Ulaanbaatar" },
    { question: "Who painted the Garden of Earthly Delights?", answers: ["Hieronymus Bosch", "Leonardo da Vinci", "Michelangelo"], correct: "Hieronymus Bosch" },
    { question: "What is the rarest naturally occurring element on Earth?", answers: ["Astatine", "Platinum", "Uranium"], correct: "Astatine" },
    { question: "Which ancient civilization built the city of Machu Picchu?", answers: ["Maya", "Inca", "Aztec"], correct: "Inca" },
    { question: "What is the term for a word that is spelled the same forwards and backwards?", answers: ["Anagram", "Palindrome", "Oxymoron"], correct: "Palindrome" },
    { question: "In Greek mythology, who is the god of the underworld?", answers: ["Hades", "Poseidon", "Zeus"], correct: "Hades" },
    { question: "Which mathematician is known as the 'Prince of Mathematicians'?", answers: ["Euler", "Gauss", "Pythagoras"], correct: "Gauss" },
    { question: "What was the name of the first man-made Earth satellite?", answers: ["Apollo 11", "Sputnik 1", "Voyager 1"], correct: "Sputnik 1" },
    { question: "What What does a funambulist walk on?", answers: ["A tightrope", "A balance beam", "A suspension bridge"], correct: "A tightrope" },

];

// --- Global Variables ---
let scene, camera, renderer;
let player;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let checkpoints = [];
let currentCheckpoint = null;
let isTriviaActive = false;
let menuDiv, keyCounterDiv;
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

// Movement and camera
let playerBaseSpeed = 250.0; 
const sprintMultiplier = 1.5;
let cameraMode = 'thirdPerson';
let controls; 
const playerColliderRadius = 15; 

// First-person camera
let firstPersonYaw = 0;
let firstPersonPitch = 0;
let isPointerLocked = false;

// Physics
let yVelocity = 0;
const gravity = -90; 
const jumpStrength = 70; 
let isGrounded = false;
const playerHeight = 40; 

// Idle snap timer (seconds)
let idleTimer = 0;

// Audio
let listener, runningSound;
let pingSound;
let victorySound;
let deathSound;





//let playerShadow;
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

// Hide or show the entire player model (all meshes) – useful for first-person mode
function setPlayerVisibility(visible) {
    if (!player) return;
    player.traverse((child) => {
        if (child.isMesh) {
            child.visible = visible;
        }
    });
}

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(spawnPoint.x, spawnPoint.y + 200, spawnPoint.z + 100);

        // Audio listener
    listener = new THREE.AudioListener();
    camera.add(listener);

    // Running sound
    runningSound = new THREE.PositionalAudio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('public/audio/runaudio.mp3', function(buffer){
        runningSound.setBuffer(buffer);
        runningSound.setLoop(true);
        runningSound.setVolume(20);
    });

    pingSound = new THREE.Audio(listener);
    audioLoader.load('public/audio/ping.mp3', function(buffer){
    pingSound.setBuffer(buffer);
    pingSound.setLoop(false);
    pingSound.setVolume(10);
});

    victorySound = new THREE.Audio(listener);
    audioLoader.load('public/audio/winner.mp3', function(buffer){
    victorySound.setBuffer(buffer);
    victorySound.setLoop(false);
    victorySound.setVolume(10);
});

    deathSound = new THREE.Audio(listener);
    audioLoader.load('public/audio/lose.mp3', function(buffer){
    deathSound.setBuffer(buffer);
    deathSound.setLoop(false);
    deathSound.setVolume(10);
});


    const cubeLoader = new THREE.CubeTextureLoader();
    cubeLoader.setPath('public/skybox1/');
    const skyboxTexture = cubeLoader.load([
        'px.png', 'nx.png',
        'py.png', 'ny.png',
        'pz.png', 'nz.png'
    ]);
    scene.background = skyboxTexture;

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

            // === Invisible Fallback Floor ===
        const fallbackFloorGeometry = new THREE.PlaneGeometry(60000, 60000); // really big
        const fallbackFloorMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0 // fully invisible
        });
        const fallbackFloor = new THREE.Mesh(fallbackFloorGeometry, fallbackFloorMaterial);
        fallbackFloor.rotation.x = -Math.PI / 2; // make it flat (horizontal)
        fallbackFloor.position.y = -5; // just below the player’s spawn height
        scene.add(fallbackFloor);

        // Add to collision objects so the player can walk on it
        collisionObjects.push(fallbackFloor);


    // Load all GLTFs and only snap player after all loaded
    let modelsToLoad = 3;
    function onModelLoad() {
        modelsToLoad--;
        if (modelsToLoad === 0) {
            loadPlayer();
            createCheckpoints();
            createUI();
            createTimer();
            setupEventListeners();
            startTimer();
            hideLoadingScreen();
        }
    }

    loader.load('public/street/scene.gltf', function(gltf) {
        const street = gltf.scene;
        street.scale.set(600, 600, 600);
        street.position.set(-4000, 0, 0);
        scene.add(street);
        street.traverse(child => { if (child.isMesh) collisionObjects.push(child); });
        onModelLoad();
    });
    loader.load('public/londonstreet/scene.gltf', function(gltf2) {
        const warehouse = gltf2.scene;
        warehouse.scale.set(50, 50, 50);
        warehouse.position.set(500, 0, 0);
        scene.add(warehouse);
        warehouse.traverse(child => { if (child.isMesh) collisionObjects.push(child); });
        onModelLoad();
    });
    loader.load('public/alleyway/scene.gltf', function(gltf3) {
        const apartment = gltf3.scene;
        apartment.scale.set(600, 600, 600);
        apartment.position.set(10000, 0, 0);
        scene.add(apartment);
        apartment.traverse(child => { if (child.isMesh) collisionObjects.push(child); });
        onModelLoad();
    });

    
}

// --- Remaining code unchanged (loadPlayer, createCheckpoints, showTrivia, updatePlayer, updateCamera, animate, UI, menu, timer, win/lose logic) ---



    /*// DEBUG: optionally skip to a later stage for testing
    if (typeof DEBUG_SKIP_TO_STAGE !== 'undefined' && DEBUG_SKIP_TO_STAGE > 1) {
        // short delay to let glTF loaders and player creation start
        setTimeout(() => debugSkipTo(DEBUG_SKIP_TO_STAGE), 800);
    }*/

    



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
        // Hide full player model so the camera shows only the world
        setPlayerVisibility(false);
        renderer.domElement.requestPointerLock();
    } else {
        // Show player again in third-person
        setPlayerVisibility(true);
        document.exitPointerLock();
    }
    const instructionsDiv = document.getElementById('instructions-ui');
    if (instructionsDiv) updateInstructionsUI();
}


function loadPlayer1() {
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


/*function createCheckpoints(data) {
    checkpoints = [];
    keysCollected = 0; 
    updateKeyCounter();

    // Select correct question pool
    let questionPool;
    let positions;
    if(stage === 1){
        questionPool = easyQuestions;
        positions = [
            new THREE.Vector3(-3943,35,-3032),
            new THREE.Vector3(-4193,35,-1446),
            new THREE.Vector3(-5679,35,-92)
        ];
    } else if(stage === 2){
        questionPool = mediumQuestions;
        positions = [
            new THREE.Vector3(300,35,2000),
            new THREE.Vector3(668,35,1000),
            new THREE.Vector3(632,35,-222)
        ];
    } else {
        questionPool = hardQuestions;
        positions = [
            new THREE.Vector3(10100, 35, 1000),
            new THREE.Vector3(10000, 35, 2000),
            new THREE.Vector3(10000, 35, 200)
        ];
    }

    // Pick 3 random unique questions
    const selected = [];
    while(selected.length < 3){
        const rand = questionPool[Math.floor(Math.random() * questionPool.length)];
        if(!selected.includes(rand)) selected.push(rand);
    }

    // Create spheres
    for(let i=0; i<3; i++){
        // --- Vibrant Glowy Sphere ---
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffff00,          // bright yellow
            emissive: 0xffcc00,       // makes it glow
            emissiveIntensity: 1.5,
            metalness: 0.3,
            roughness: 0.2
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(positions[i]);
        sphere.trivia = selected[i];

        sphere.baseY = positions[i].y;

        scene.add(sphere);
        checkpoints.push(sphere);

        // --- Add a glowing light source for extra effect ---
        const glow = new THREE.PointLight(0xffdd33, 1.2, 50); // soft golden glow
        glow.position.copy(positions[i]);
        scene.add(glow);

                    // --- Circular Shadow under sphere ---
            const shadowGeo = new THREE.CircleGeometry(6, 32);
            const shadowMat = new THREE.MeshBasicMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            });
            const shadow = new THREE.Mesh(shadowGeo, shadowMat);
            shadow.rotation.x = -Math.PI / 2; // flat on ground

            // Raycast downward to find the ground under the sphere
            const raycaster = new THREE.Raycaster();
            const down = new THREE.Vector3(0, -1, 0);
            raycaster.set(new THREE.Vector3(positions[i].x, positions[i].y + 100, positions[i].z), down);
            const intersects = raycaster.intersectObjects(collisionObjects, true);

            if (intersects.length > 0) {
                shadow.position.copy(intersects[0].point);
                shadow.position.y += 0.05; // lift slightly to avoid z-fighting
            } else {
                // fallback: just put shadow at y = 0
                shadow.position.set(positions[i].x, 0.05, positions[i].z);
            }

            scene.add(shadow);

            // Link shadow to sphere
            sphere.shadowCircle = shadow;

    }
}*/
function createCheckpoints() {
    checkpoints = [];
    keysCollected = 0; 
    updateKeyCounter();

    // Select correct question pool
    let questionPool;
    let possiblePositions; // Array of possible positions for each stage
    
    if(stage === 1){
        questionPool = easyQuestions;
        // Multiple possible positions in street area
        possiblePositions = [
            new THREE.Vector3(-1849, 35, 1610),
            new THREE.Vector3(1957, 35, -738),
            new THREE.Vector3(-2033, 35, -3042),
            new THREE.Vector3(-5561, 35, 1526),
            new THREE.Vector3(-6178, 35, -749),
            new THREE.Vector3(-6075, 35, 3882),
            new THREE.Vector3(-4178, 35, -4055),
            new THREE.Vector3(-4163, 35, -3094),
            new THREE.Vector3(-4940, 35, -2467),
            new THREE.Vector3(-4167, 35, 1672),
            new THREE.Vector3(-3943,35,-3032), new THREE.Vector3(-4193,35,-1446), new THREE.Vector3(-5679,35,-92),
            new THREE.Vector3(-3500,35,-2500), new THREE.Vector3(-4500,35,-1800), new THREE.Vector3(-5200,35,-800),
            new THREE.Vector3(-3800,35,-3200), new THREE.Vector3(-4800,35,-2200), new THREE.Vector3(-5500,35,-500),
            new THREE.Vector3(-3200,35,-2800), new THREE.Vector3(-4400,35,-1200), new THREE.Vector3(-5800,35,-200)
        ];
    } else if(stage === 2){
        questionPool = mediumQuestions;
        // Multiple possible positions in warehouse area
        possiblePositions = [
            new THREE.Vector3(84, 35, -862),
            new THREE.Vector3(988, 35, -937),
            new THREE.Vector3(863, 35, 256),
            new THREE.Vector3(815, 35, 943),
            new THREE.Vector3(256, 35, 1893),
            new THREE.Vector3(923, 35, 2582),
            new THREE.Vector3(299, 35, -318),
            new THREE.Vector3(508, 35, 812),
            new THREE.Vector3(138, 35, 1484),
            new THREE.Vector3(133, 35, 29597),
            new THREE.Vector3(300,35,2000), new THREE.Vector3(668,35,1000), new THREE.Vector3(632,35,-222),
            new THREE.Vector3(500,35,1800), new THREE.Vector3(800,35,800), new THREE.Vector3(400,35,0),
            new THREE.Vector3(200,35,1500), new THREE.Vector3(900,35,1200), new THREE.Vector3(600,35,-500),
            new THREE.Vector3(100,35,2200), new THREE.Vector3(750,35,600), new THREE.Vector3(300,35,-300)
        ];
    } else {
        questionPool = hardQuestions;
        // Multiple possible positions in alleyway area
        possiblePositions = [
            new THREE.Vector3(10065, 35, 983),
            new THREE.Vector3(9917, 35, 1688),
            new THREE.Vector3(9832, 35, 2097),
            new THREE.Vector3(9945, 35, 476),
            new THREE.Vector3(10284, 35, 130),
            new THREE.Vector3(10795, 35, 221),
            new THREE.Vector3(10917, 35, 344),
            new THREE.Vector3(9907, 35, 1651),
            new THREE.Vector3(9806, 35, 2146),
            new THREE.Vector3(10076, 35, 170),
            new THREE.Vector3(10101, 35, 1634),
            new THREE.Vector3(9443, 35, 1922),
            new THREE.Vector3(10100,35,1000), new THREE.Vector3(10000,35,2000), new THREE.Vector3(10000,35,200),
            new THREE.Vector3(10200,35,800), new THREE.Vector3(9900,35,1800), new THREE.Vector3(10150,35,0),
            new THREE.Vector3(10300,35,1200), new THREE.Vector3(9800,35,2200), new THREE.Vector3(10050,35,-200),
            new THREE.Vector3(10400,35,1500), new THREE.Vector3(9700,35,1600), new THREE.Vector3(9950,35,400)
        ];
    }

    // Pick 3 random unique questions
    const selectedQuestions = [];
    while(selectedQuestions.length < 3){
        const rand = questionPool[Math.floor(Math.random() * questionPool.length)];
        if(!selectedQuestions.includes(rand)) selectedQuestions.push(rand);
    }

    // Pick 3 random unique positions
    const selectedPositions = [];
    const shuffledPositions = [...possiblePositions].sort(() => 0.5 - Math.random());
    
    for(let i = 0; i < 3; i++){
        selectedPositions.push(shuffledPositions[i]);
    }

    // Create spheres at random positions
    for(let i = 0; i < 3; i++){
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffcc00,
            emissiveIntensity: 1.5,
            metalness: 0.3,
            roughness: 0.2
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(selectedPositions[i]);
        sphere.trivia = selectedQuestions[i];

        sphere.baseY = selectedPositions[i].y;

        scene.add(sphere);
        checkpoints.push(sphere);

        // Add glowing light
        const glow = new THREE.PointLight(0xffdd33, 1.2, 50);
        glow.position.copy(selectedPositions[i]);
        scene.add(glow);

        // Add circular shadow
        const shadowGeo = new THREE.CircleGeometry(6, 32);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.rotation.x = -Math.PI / 2;

        // Position shadow on ground
        const raycaster = new THREE.Raycaster();
        const down = new THREE.Vector3(0, -1, 0);
        raycaster.set(new THREE.Vector3(selectedPositions[i].x, selectedPositions[i].y + 100, selectedPositions[i].z), down);
        const intersects = raycaster.intersectObjects(collisionObjects, true);

        if (intersects.length > 0) {
            shadow.position.copy(intersects[0].point);
            shadow.position.y += 0.05;
        } else {
            shadow.position.set(selectedPositions[i].x, 0.05, selectedPositions[i].z);
        }

        scene.add(shadow);
        sphere.shadowCircle = shadow;
    }
    
    
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
                if (pingSound.isPlaying) pingSound.stop();
                pingSound.play();
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
                //snapPlayerToGround();

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
function snapPlayerToGround(force = false) {
    if (!player || collisionObjects.length === 0) return;
    const origin = player.position.clone();
    origin.y += 500; // higher ray start to ensure detection
    raycaster.set(origin, new THREE.Vector3(0, -1, 0));
    raycaster.far = 1000;
    const intersects = raycaster.intersectObjects(collisionObjects, true);
    if (intersects.length > 0) {
        const groundY = intersects[0].point.y;
        // Use a wider tolerance
        if (force || player.position.y <= groundY + 2) {
            player.position.y = groundY + 2;
            yVelocity = 0;
            isGrounded = true;
        }
    }
}

function loadPlayer() {
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load('scene.gltf', function(gltf) {
        player = gltf.scene;
        player.scale.set(20, 20, 20);
        player.position.copy(spawnPoint);
        player.rotation.y = Math.PI;
        scene.add(player);

        player.add(runningSound);


        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(player);
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
            action.paused = true;
        }
        setHeadVisibility(true);

        // snap immediately
        snapPlayerToGround(true);

        /*// --- CREATE CIRCULAR SHADOW ---
        const shadowGeo = new THREE.CircleGeometry(10, 32); // radius 10, smoothness 32 segments
        const shadowMat = new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            transparent: true, 
            opacity: 0.4, 
            side: THREE.DoubleSide // makes it visible from both sides
        });
        playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
        playerShadow.rotation.x = -Math.PI / 2; // lay flat
        playerShadow.position.y = 0.1; // slightly above ground
        scene.add(playerShadow);
        */

    });
}

function enterWarehouse() {
    stage = 2;
    player.scale.set(20, 20, 20);
    player.position.set(515, 0, -87); // spawn slightly above floor
    snapPlayerToGround(true);
    createCheckpoints();
    clearInterval(timerInterval);
    totalTime = 120;
    remainingTime = totalTime;
    startTimer();
    alert("Welcome to London! Collect 3 keys!"); // <<< RENAMED
}

function enterApartment() {
    stage = 3;
    player.scale.set(20, 20, 20);
    player.position.set(10000, 0, 1000);
    snapPlayerToGround(true);
    createCheckpoints();
    clearInterval(timerInterval);
    totalTime = 60;
    remainingTime = totalTime;
    startTimer();
    alert("Final Stage: The Alleyway! Collect 3 keys!"); // <<< RENAMED
}

/*function debugSkipTo(stageNum){
    if(!player){
        // if player isn't loaded yet, try again shortly
        setTimeout(() => debugSkipTo(stageNum), 250);
        return;
    }

    if(stageNum === 2){
        stage = 2;
        // Move player to the warehouse spawn used in enterWarehouse
        player.position.set(515, 0, -87);
        player.scale.set(20,20,20);
        snapPlayerToGround(true);

        // Build checkpoints for stage 2
        createCheckpoints(); // createCheckpoints reads `stage` and picks mediumQuestions & positions
        clearInterval(timerInterval);
        totalTime = 120;
        remainingTime = totalTime;
        startTimer();

        isTriviaActive = false;
        isMenuOpen = false;
        alert("DEBUG: Skipped to Warehouse (Stage 2)");
    }
    else if(stageNum === 3){
        stage = 3;
        player.position.set(10000, 0, 1000);
        player.scale.set(20,20,20);
        snapPlayerToGround(true);

        // Build checkpoints for stage 3
        createCheckpoints();
        clearInterval(timerInterval);
        totalTime = 60;
        remainingTime = totalTime;
        startTimer();

        isTriviaActive = false;
        isMenuOpen = false;
        alert("DEBUG: Skipped to Apartment (Stage 3)");
    }
}*/


// (Win/Lose, Timer, Loading Screen, and Menu functions remain unchanged)
// --- Win/Lose ---
function finalWin() {
    if (victorySound.isPlaying) victorySound.stop();
    victorySound.play();

    isTriviaActive = true; clearInterval(timerInterval); isTimerRunning = false;
    const winDiv = document.createElement('div'); winDiv.id = 'winDiv';
    // (Styles are unchanged)
    winDiv.style.position = 'absolute'; winDiv.style.top = '50%'; winDiv.style.left = '50%'; winDiv.style.transform = 'translate(-50%, -50%)'; winDiv.style.padding = '20px'; winDiv.style.backgroundColor = 'rgba(0,0,0,0.9)'; winDiv.style.color = 'white'; winDiv.style.fontFamily = 'Arial'; winDiv.style.fontSize = '24px'; winDiv.style.textAlign = 'center'; winDiv.style.borderRadius = '10px'; winDiv.style.zIndex = '300';
    winDiv.innerHTML = "<p>Congratulations! You completed all stages!</p>";
    const restartBtn = document.createElement('button'); restartBtn.innerText = 'Restart'; restartBtn.style.margin = '10px'; restartBtn.style.padding = '10px 20px'; restartBtn.onclick = () => location.reload();
    const quitBtn = document.createElement('button'); quitBtn.innerText = 'Quit'; quitBtn.style.margin = '10px'; quitBtn.style.padding = '10px 20px'; quitBtn.onclick = () => window.location.href = 'https://www.google.com';
    const creditsBtn = document.createElement('button');
    creditsBtn.innerText = 'View Credits';
    creditsBtn.style.margin = '10px';
    creditsBtn.style.padding = '10px 20px';
    creditsBtn.onclick = showCredits;
    winDiv.appendChild(restartBtn); winDiv.appendChild(quitBtn); 
    winDiv.appendChild(creditsBtn);
    document.body.appendChild(winDiv);
}

// --- Credits screen ---
function showCredits() {
    const creditsDiv = document.createElement('div');
    creditsDiv.id = 'creditsDiv';
    creditsDiv.style.position = 'fixed';
    creditsDiv.style.top = '0';
    creditsDiv.style.left = '0';
    creditsDiv.style.width = '100%';
    creditsDiv.style.height = '100%';
    creditsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    creditsDiv.style.color = 'white';
    creditsDiv.style.fontFamily = 'Arial';
    creditsDiv.style.textAlign = 'center';
    creditsDiv.style.overflow = 'hidden';
    creditsDiv.style.zIndex = '400';
    
    const creditsContent = document.createElement('div');
    creditsContent.style.position = 'absolute';
    creditsContent.style.bottom = '-100%';
    creditsContent.style.width = '100%';
    creditsContent.style.animation = 'scrollCredits 15s linear forwards';

    creditsContent.innerHTML = `
        <h2>Game Credits</h2>
        <p>Game Design and Programming: </p>
        <p>Sayuri Singh</p>
        <p>Masuvhelele Thembiso</p>
        <p>Aphile</p>
        <p>Samu</p>
        <p>Onana</p>
        <p>Character model sourced from https://sketchfab.com/3d-models/rida-sidi-ben-ali-running-487e9e949e4a4ea3a8fd59df7e842830</p>
        <p>Level one model sourced from https://sketchfab.com/3d-models/low-poly-street-scene-d238a2d27e324b78af3ab15e2a09faeb</p>
        <p>Level two model sourced from https://sketchfab.com/3d-models/greater-london-highstreetshops-a80514d7781d4a388885ed00c263eb35</p>
        <p>Level three model sourced from https://sketchfab.com/3d-models/sunset-alleyway-a48c2b12a7084a4e80057516f4f448c4</p>
        <p>Special Thanks: You, the Player!</p>
        <p style="margin-top:40px;">🏆 Thank you for playing! 🏆</p>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '20px';
    closeBtn.style.right = '20px';
    closeBtn.style.padding = '10px 20px';
    closeBtn.onclick = () => creditsDiv.remove();

    creditsDiv.appendChild(creditsContent);
    creditsDiv.appendChild(closeBtn);
    document.body.appendChild(creditsDiv);

    // CSS animation for scrolling credits
    const style = document.createElement('style');
    style.textContent = `
        @keyframes scrollCredits {
            0% { bottom: -100%; }
            100% { bottom: 100%; }
        }
    `;
    document.head.appendChild(style);
}

function handleDeath() {
    if (deathSound.isPlaying) deathSound.stop();
    deathSound.play();

    isTriviaActive = true;
    const deathDiv = document.createElement('div');
    // (Styles are unchanged)
    deathDiv.style.position = 'absolute'; deathDiv.style.top = '50%'; deathDiv.style.left = '50%'; deathDiv.style.transform = 'translate(-50%, -50%)'; deathDiv.style.padding = '20px'; deathDiv.style.backgroundColor = 'rgba(0,0,0,0.9)'; deathDiv.style.color = 'white'; deathDiv.style.fontFamily = 'Arial'; deathDiv.style.fontSize = '24px'; deathDiv.style.textAlign = 'center'; deathDiv.style.borderRadius = '10px'; deathDiv.style.zIndex = '300';
    deathDiv.innerHTML = "<p>You have died!</p>";
    const restartBtn = document.createElement('button'); restartBtn.innerText = 'Restart'; restartBtn.style.margin = '10px'; restartBtn.style.padding = '10px 20px'; restartBtn.onclick = () => location.reload();
    const quitBtn = document.createElement('button'); quitBtn.innerText = 'Quit'; quitBtn.style.margin = '10px'; quitBtn.style.padding = '10px 20px'; quitBtn.onclick = () => window.location.href = 'https://www.google.com';
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
    const quitBtn = document.createElement('button'); quitBtn.innerText = 'Quit'; quitBtn.style.margin = '10px'; quitBtn.style.padding = '10px 20px'; quitBtn.style.fontSize = '16px'; quitBtn.style.borderRadius = '5px'; quitBtn.style.border = 'none'; quitBtn.style.backgroundColor = '#555'; quitBtn.style.color = 'white'; quitBtn.style.cursor = 'pointer'; quitBtn.onclick = () => window.location.href = 'https://www.google.com';
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
        if (!runningSound.isPlaying) runningSound.play();
        // reset idle timer when moving
        idleTimer = 0;
        
    }
    else {
        // accumulate idle time when standing still
        idleTimer += delta;
         if (runningSound.isPlaying) runningSound.stop();
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
        
        // Position camera at the head position (player's eye level)
        camera.position.copy(headPos);
        
        // Calculate look direction based on yaw and pitch
        const lookDirection = new THREE.Vector3(
            Math.sin(firstPersonYaw) * Math.cos(firstPersonPitch),
            Math.sin(firstPersonPitch),
            Math.cos(firstPersonYaw) * Math.cos(firstPersonPitch)
        );
        
        // Look at a point in the direction the player is facing
        const lookAtTarget = headPos.clone().add(lookDirection);
        camera.lookAt(lookAtTarget);
    }
}


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    updatePlayer(delta);
    updateCamera(delta);
    

            // Make spheres pulse
        const time = Date.now() * 0.003; // slow pulse
        checkpoints.forEach((sphere, index) => {
            if (sphere.material && sphere.material.emissive) {
                // Pulse between 0.5 and 2.0
                const intensity = 1 + Math.sin(time + index) * 0.5;
                sphere.material.emissiveIntensity = intensity;
            }
        sphere.position.y = sphere.baseY + Math.sin(time + index) * 2; // amplitude = 2
        });

    // safety net – snap every 2s
    idleTimer += delta;
    if (idleTimer > 2.0) {
        snapPlayerToGround();
        idleTimer = 0;
    }

    checkpoints.forEach(cp => {
        if (!isTriviaActive && player && player.position.distanceTo(cp.position) < 40) {
            showTrivia(cp);
        }
    });

    

    renderer.render(scene, camera);
}
