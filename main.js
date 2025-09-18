import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer;
let player, playerSpeed = 0.1;
let keys = {};
let mixer, clock = new THREE.Clock(), action;
let cameraMode = 'thirdPerson';

// First-person camera variables
let firstPersonYaw = 0;
let firstPersonPitch = 0;
let isMouseDown = false;
let controls;
let thirdPersonCamera;

// Movement variables for smooth transitions
let targetRotation = 0;
let rotationSpeed = 0.1;
let isMoving = false;

// Improved ThirdPersonCamera class
class ThirdPersonCamera {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target;
        
        // Camera offset relative to the target
        this.offset = new THREE.Vector3(0, 1.5, 3);
        this.smoothness = 0.1;
        this.lookAtOffset = new THREE.Vector3(0, 0.8, 0);
        
        // For smooth camera movement
        this.currentPosition = new THREE.Vector3();
        this.currentLookat = new THREE.Vector3();
    }

    update(delta) {
        if (!this.target) return;

        // Calculate ideal camera position
        const idealOffset = this.offset.clone();
        idealOffset.applyQuaternion(this.target.quaternion);
        const idealPosition = new THREE.Vector3().addVectors(this.target.position, idealOffset);
        
        // Smoothly move camera towards ideal position
        this.currentPosition.lerp(idealPosition, this.smoothness);
        this.camera.position.copy(this.currentPosition);
        
        // Calculate lookat point
        const lookAtPoint = new THREE.Vector3().addVectors(this.target.position, this.lookAtOffset);
        
        // Smoothly adjust lookat
        this.currentLookat.lerp(lookAtPoint, this.smoothness);
        this.camera.lookAt(this.currentLookat);
    }

    setOffset(x, y, z) {
        this.offset.set(x, y, z);
    }

    setLookAtOffset(x, y, z) {
        this.lookAtOffset.set(x, y, z);
    }

    setSmoothness(value) {
        this.smoothness = Math.max(0.01, Math.min(1, value));
    }
}

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 3, 5);
    camera.lookAt(0.5, 0.5, 0.5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // OrbitControls for third-person view (optional manual control)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.enabled = false; // Start disabled, we'll use ThirdPersonCamera

    // Lights
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x00aa00,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Load GLB model
    const loader = new GLTFLoader().setPath('public/running/');
    loader.load(
        'scene.gltf',
        function (gltf) {
            player = gltf.scene;
            player.scale.set(1, 1, 1);
            player.position.set(0, 0, 0);
            scene.add(player);

            // Initialize ThirdPersonCamera after player is loaded
            thirdPersonCamera = new ThirdPersonCamera(camera, player);

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(player);
                action = mixer.clipAction(gltf.animations[0]);
                action.play();
                action.paused = true;
            }
        },
        undefined,
        function (error) {
            console.error('Error loading GLB:', error);
            // Add a simple cube as a fallback if model fails to load
            const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
            const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            player = new THREE.Mesh(cubeGeometry, cubeMaterial);
            player.position.set(0, 0.5, 0);
            scene.add(player);
            thirdPersonCamera = new ThirdPersonCamera(camera, player);
        }
    );

    // WASD input
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        // Toggle camera mode (press 'c')
        if (e.key.toLowerCase() === 'c') {
            toggleCameraMode();
        }
        
        // Camera adjustment keys (only in third-person mode)
        if (cameraMode === 'thirdPerson' && thirdPersonCamera) {
            if (e.key === 'ArrowUp') {
                thirdPersonCamera.setOffset(
                    thirdPersonCamera.offset.x,
                    thirdPersonCamera.offset.y + 0.1,
                    thirdPersonCamera.offset.z
                );
            }
            if (e.key === 'ArrowDown') {
                thirdPersonCamera.setOffset(
                    thirdPersonCamera.offset.x,
                    thirdPersonCamera.offset.y - 0.1,
                    thirdPersonCamera.offset.z
                );
            }
            if (e.key === 'ArrowLeft') {
                thirdPersonCamera.setOffset(
                    thirdPersonCamera.offset.x - 0.1,
                    thirdPersonCamera.offset.y,
                    thirdPersonCamera.offset.z
                );
            }
            if (e.key === 'ArrowRight') {
                thirdPersonCamera.setOffset(
                    thirdPersonCamera.offset.x + 0.1,
                    thirdPersonCamera.offset.y,
                    thirdPersonCamera.offset.z
                );
            }
            if (e.key === 'PageUp') {
                thirdPersonCamera.setOffset(
                    thirdPersonCamera.offset.x,
                    thirdPersonCamera.offset.y,
                    thirdPersonCamera.offset.z - 0.1
                );
            }
            if (e.key === 'PageDown') {
                thirdPersonCamera.setOffset(
                    thirdPersonCamera.offset.x,
                    thirdPersonCamera.offset.y,
                    thirdPersonCamera.offset.z + 0.1
                );
            }
        }
    });
    window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

    // Mouse event listeners for first-person camera
    document.addEventListener('mousedown', () => {
        if (cameraMode === 'firstPerson') isMouseDown = true;
    });
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });
    document.addEventListener('mousemove', onMouseMove);

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Add camera mode UI
    addCameraUI();
}

function onMouseMove(event) {
    if (cameraMode === 'firstPerson' && isMouseDown && player) {
        const deltaX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const deltaY = event.movementY || event.mozMovementY || 0;

        // Adjust yaw (horizontal rotation) and pitch (vertical rotation)
        firstPersonYaw -= deltaX * 0.002;
        firstPersonPitch -= deltaY * 0.002;

        // Limit pitch to avoid flipping over
        const maxPitch = Math.PI / 2 - 0.1;
        const minPitch = -Math.PI / 2 + 0.1;
        firstPersonPitch = Math.max(minPitch, Math.min(maxPitch, firstPersonPitch));
    }
}

function toggleCameraMode() {
    cameraMode = (cameraMode === 'thirdPerson') ? 'firstPerson' : 'thirdPerson';
    console.log(`Camera mode: ${cameraMode}`);
    
    // Update controls based on camera mode
    controls.enabled = (cameraMode === 'thirdPerson');
    
    // Reset first-person angles when switching
    if (cameraMode === 'firstPerson') {
        firstPersonYaw = player ? player.rotation.y : 0;
        firstPersonPitch = 0;
    }
    
    // Update UI
    updateCameraUI();
}

function updateCamera(delta) {
    if (!player) return;

    if (cameraMode === 'thirdPerson') {
        updateThirdPersonCamera(delta);
    } else {
        updateFirstPersonCamera();
    }
}

function updateThirdPersonCamera(delta) {
    if (thirdPersonCamera) {
        thirdPersonCamera.update(delta);
    }
}

function updateFirstPersonCamera() {
    if (!player) return;

    // Position camera at player's eye level
    const eyeHeight = 1.7;
    const headPos = player.position.clone();
    headPos.y += eyeHeight;

    // Calculate direction based on yaw and pitch
    const direction = new THREE.Vector3(
        Math.sin(firstPersonYaw) * Math.cos(firstPersonPitch),
        Math.sin(firstPersonPitch),
        -Math.cos(firstPersonYaw) * Math.cos(firstPersonPitch)
    );
    
    // Position camera slightly in front of player's head
    const cameraDistance = 0.3;
    camera.position.copy(headPos).add(direction.multiplyScalar(-cameraDistance));
    
    // Make camera look in the direction of view
    const lookAt = new THREE.Vector3().copy(headPos).add(direction);
    camera.lookAt(lookAt);
    
    // Align player rotation with camera yaw (horizontal rotation only)
    player.rotation.y = firstPersonYaw;
    
    // Hide head mesh so we don't see "inside the face"
    player.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes("head")) {
            child.visible = false;
        }
    });
}

function addCameraUI() {
    const cameraInfo = document.createElement('div');
    cameraInfo.id = 'camera-ui';
    cameraInfo.style.position = 'absolute';
    cameraInfo.style.top = '10px';
    cameraInfo.style.left = '10px';
    cameraInfo.style.color = 'white';
    cameraInfo.style.backgroundColor = 'rgba(0,0,0,0.7)';
    cameraInfo.style.padding = '10px';
    cameraInfo.style.borderRadius = '5px';
    cameraInfo.style.fontFamily = 'Arial, sans-serif';
    cameraInfo.style.zIndex = '1000';
    document.body.appendChild(cameraInfo);
    
    updateCameraUI();
}

function updateCameraUI() {
    const cameraInfo = document.getElementById('camera-ui');
    if (cameraInfo) {
        const modeName = cameraMode === 'thirdPerson' ? 'Third Person' : 'First Person';
        let instructions = '';
        
        if (cameraMode === 'firstPerson') {
            instructions = 'Hold mouse to look around';
        } else {
            instructions = 'Arrow keys: Adjust camera position<br>Page Up/Down: Adjust distance';
        }
        
        cameraInfo.innerHTML = `
            <strong>Camera: ${modeName}</strong><br>
            Press C to toggle<br>
            ${instructions}<br>
            WASD to move
        `;
    }
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (player) {
        // Detect movement
        let moveX = 0, moveZ = 0;
        if (keys['w']) moveZ -= playerSpeed;
        if (keys['s']) moveZ += playerSpeed;
        if (keys['a']) moveX -= playerSpeed;
        if (keys['d']) moveX += playerSpeed;

        // Update position based on current view
        if (cameraMode === 'firstPerson') {
            // First-person movement relative to camera direction
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            direction.y = 0;
            direction.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();

            player.position.add(direction.multiplyScalar(moveZ * playerSpeed));
            player.position.add(right.multiplyScalar(moveX * playerSpeed));
        } else {
            // Third-person movement (original behavior)
            player.position.x += moveX;
            player.position.z += moveZ;
        }

        // Handle rotation smoothly for third-person view
        if (cameraMode === 'thirdPerson') {
            // Calculate movement direction if moving
            if (moveX !== 0 || moveZ !== 0) {
                // Calculate target rotation based on movement direction
                const newTargetRotation = Math.atan2(moveX, moveZ);
                
                // Only update target rotation if it's significantly different
                if (Math.abs(newTargetRotation - targetRotation) > 0.01) {
                    targetRotation = newTargetRotation;
                }
                
                // Smoothly interpolate towards target rotation
                player.rotation.y = THREE.MathUtils.lerp(
                    player.rotation.y, 
                    targetRotation, 
                    rotationSpeed
                );
                
                if (action) action.paused = false;
                isMoving = true;
            } else {
                if (action) action.paused = true;
                isMoving = false;
            }
        } else if (moveX !== 0 || moveZ !== 0) {
            // First-person view - just update animation
            if (action) action.paused = false;
        } else {
            if (action) action.paused = true;
        }

        // Update camera
        updateCamera(delta);
    }

    renderer.render(scene, camera);
}