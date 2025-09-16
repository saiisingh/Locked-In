import * as THREE from 'three';
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
}

/*import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
let scene, camera, renderer;
let player, playerSpeed = 0.1;
let keys = {};

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
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x00aa00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Load GLB model
    const loader = new GLTFLoader().setPath('public/running/')
    loader.load(
        'scene.gltf', // relative path to your model
        function(gltf) {
            player = gltf.scene;
            player.scale.set(1, 1, 1);  // adjust size if needed
            player.position.set(0, 0, 0); // adjust height if below ground
            scene.add(player);
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

    if(player) {
        // Movement
        if(keys['w']) player.position.z -= playerSpeed;
        if(keys['s']) player.position.z += playerSpeed;
        if(keys['a']) player.position.x -= playerSpeed;
        if(keys['d']) player.position.x += playerSpeed;

        // Rotate to face movement
        if(keys['w']) player.rotation.y = 0;
        if(keys['s']) player.rotation.y = Math.PI;
        if(keys['a']) player.rotation.y = Math.PI / 2;
        if(keys['d']) player.rotation.y = -Math.PI / 2;

        // Camera follows player
        camera.position.x = player.position.x + 5;
        camera.position.z = player.position.z + 5;
        camera.position.y = player.position.y + 3;
        camera.lookAt(player.position);
    }

    renderer.render(scene, camera);
}*/
