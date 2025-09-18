import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer;
let player, playerSpeed = 4.0; // Increased speed slightly
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let cameraMode = 'thirdPerson';

// Collision and camera variables
let collidableObjects = [];
let raycaster;
const playerColliderRadius = 0.4;

// First-person camera variables
let firstPersonYaw = 0;
let firstPersonPitch = 0;
let isPointerLocked = false;
let controls;

// <<< NEW: Smooth camera target position
const cameraTarget = new THREE.Vector3();

// For head visibility toggling
function setHeadVisibility(visible) {
    if (!player) return;
    player.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes("head")) {
            child.visible = visible;
        }
    });
}

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 7);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();

    // <<< ELDEN RING STYLE ORBIT CONTROLS
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false; // Don't allow camera to move side-to-side
    controls.minDistance = 1.5; // How close you can zoom
    controls.maxDistance = 8.0;  // How far you can zoom
    controls.minPolarAngle = Math.PI * 0.1; // Don't let camera go below character
    controls.maxPolarAngle = Math.PI * 0.7; // Don't let camera go too high
    controls.target.set(0, 1, 0);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x666666));

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    collidableObjects.push(ground);

    const loader = new GLTFLoader();

    loader.setPath('public/house/').load('scene.gltf', (gltf) => {
        const house = gltf.scene;
        house.position.set(5, 1.8, 5);
        house.scale.set(1.5, 1.5, 1.5);
        scene.add(house);
        house.traverse((child) => {
            if (child.isMesh) collidableObjects.push(child);
        });
    });

    loader.setPath('public/running/').load('scene.gltf', (gltf) => {
        player = gltf.scene;
        player.scale.set(0.5, 0.5, 0.5);
        scene.add(player);
        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(player);
            action = mixer.clipAction(gltf.animations[0]);
            action.play();
            action.paused = true;
        }
        setHeadVisibility(true);
    });

    // Event Listeners
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === 'c') toggleCameraMode();
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    document.addEventListener('mousedown', () => {
        if (cameraMode === 'firstPerson' && !isPointerLocked) {
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

    addCameraUI();
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
    updateCameraUI();
}
// <<< NEW FUNCTION to add the UI container
function addCameraUI() {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'camera-ui';
    uiContainer.style.position = 'absolute';
    uiContainer.style.top = '10px';
    uiContainer.style.left = '10px';
    uiContainer.style.color = 'white';
    uiContainer.style.backgroundColor = 'rgba(0,0,0,0.6)';
    uiContainer.style.padding = '10px';
    uiContainer.style.borderRadius = '8px';
    uiContainer.style.fontFamily = 'Arial, sans-serif';
    uiContainer.style.zIndex = '100';
    document.body.appendChild(uiContainer);
    updateCameraUI(); // Initial population
}

// <<< NEW FUNCTION to update UI text based on current state
function updateCameraUI() {
    const uiContainer = document.getElementById('camera-ui');
    if (!uiContainer) return;

    const modeName = cameraMode === 'thirdPerson' ? 'Third Person' : 'First Person';
    let instructions = '';

    if (cameraMode === 'thirdPerson') {
        instructions = `
            <b>Mouse:</b> Orbit Camera<br>
            <b>Scroll:</b> Zoom In/Out
        `;
    } else {
        instructions = `
            <b>Click:</b> Lock Mouse<br>
            <b>Mouse:</b> Look Around
        `;
    }

    uiContainer.innerHTML = `
        <strong>Camera: ${modeName}</strong><br>
        <hr style="margin: 4px 0; border-color: rgba(255,255,255,0.3);">
        <b>WASD:</b> Move Character<br>
        <b>C:</b> Toggle Camera<br>
        ${instructions}
    `;
}

// <<< REBUILT PLAYER UPDATE LOGIC
function updatePlayer(delta) {
    if (!player || collidableObjects.length === 0) return;

    const moveX = (keys['a'] ? 1 : 0) + (keys['d'] ? -1 : 0);
    const moveZ = (keys['w'] ? 1 : 0) + (keys['s'] ? -1 : 0);
    const isMoving = moveX !== 0 || moveZ !== 0;

    if (action) action.paused = !isMoving;
    if (!isMoving) return;

    let moveDirection = new THREE.Vector3(moveX, 0, moveZ);
    moveDirection.normalize();

    // Player moves relative to the camera's direction
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    const cameraAngle = Math.atan2(camDir.x, camDir.z);
    moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);

    // Player rotates to face the direction of movement
    const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
    const rotationLerpFactor = 0.15;
    player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRotation, rotationLerpFactor);

    const moveVector = moveDirection.multiplyScalar(playerSpeed * delta);

    // Wall Collision
    const playerCenter = player.position.clone().add(new THREE.Vector3(0, 1, 0));
    raycaster.set(playerCenter, moveDirection);
    raycaster.far = playerColliderRadius;
    if (raycaster.intersectObjects(collidableObjects).length === 0) {
        player.position.add(moveVector);
    }

    // Ground Snapping
    const groundRayOrigin = player.position.clone().add(new THREE.Vector3(0, 1, 0));
    raycaster.set(groundRayOrigin, new THREE.Vector3(0, -1, 0));
    raycaster.far = 2.0;
    const groundIntersects = raycaster.intersectObjects(collidableObjects);
    if (groundIntersects.length > 0) {
        player.position.y = groundIntersects[0].point.y;
    }
}


// <<< REBUILT CAMERA UPDATE LOGIC
function updateCamera(delta) {
    if (!player) return;

    if (cameraMode === 'thirdPerson') {
        controls.enabled = true;
        
        // Smoothly move the camera target to the player's head height
        const playerHead = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        cameraTarget.lerp(playerHead, 0.1);
        controls.target.copy(cameraTarget);
        controls.update();

        // Camera collision
        const cameraPosition = camera.position.clone();
        const cameraDirection = new THREE.Vector3().subVectors(cameraPosition, controls.target).normalize();
        const distance = cameraPosition.distanceTo(controls.target);

        raycaster.set(controls.target, cameraDirection);
        raycaster.far = distance;
        const intersects = raycaster.intersectObjects(collidableObjects);

        if (intersects.length > 0) {
            // Move camera to the collision point, slightly offset
            camera.position.copy(intersects[0].point).addScaledVector(cameraDirection, -0.2);
        }

    } else { // First Person
        controls.enabled = false;
        player.rotation.y = firstPersonYaw; // Player model follows camera yaw
        const eyeHeight = 1.5;
        const headPos = player.position.clone().add(new THREE.Vector3(0, eyeHeight, 0));
        const lookDirection = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(firstPersonPitch, firstPersonYaw, 0, 'YXZ'));
        camera.position.copy(headPos);
        camera.lookAt(headPos.add(lookDirection));
    }
}


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    updatePlayer(delta);
    updateCamera(delta);
    
    renderer.render(scene, camera);
}