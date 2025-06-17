class SolarSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.planets = [];
        this.sun = null;
        this.animationSpeed = 1;
        this.isPaused = false;
        this.showTrails = false;
        this.focusedPlanet = null;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.trails = new Map();
        
        this.init();
        this.createStars();
        this.createSolarSystem();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 1000);
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('container').appendChild(this.renderer.domElement);
        
        this.camera.position.set(0, 50, 200);
        this.camera.lookAt(0, 0, 0);
    }

    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
        
        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            const x = (Math.random() - 0.5) * 4000;
            const y = (Math.random() - 0.5) * 4000;
            const z = (Math.random() - 0.5) * 4000;
            starsVertices.push(x, y, z);
        }
        
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    }

    createSolarSystem() {
        // Sun
        const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffd700,
            emissive: 0xffa500,
            emissiveIntensity: 0.3
        });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun);

        // Add sun light
        const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        this.scene.add(sunLight);

        // Planet data with realistic relative sizes and distances
        const planetData = [
            { name: 'Mercury', size: 1.2, distance: 20, speed: 0.048, color: 0x8c7853, info: 'Closest planet to the Sun' },
            { name: 'Venus', size: 1.8, distance: 28, speed: 0.035, color: 0xffc649, info: 'Hottest planet in our solar system' },
            { name: 'Earth', size: 2, distance: 36, speed: 0.03, color: 0x6b93d6, info: 'Our home planet' },
            { name: 'Mars', size: 1.6, distance: 46, speed: 0.024, color: 0xc1440e, info: 'The Red Planet' },
            { name: 'Jupiter', size: 6, distance: 70, speed: 0.013, color: 0xd8ca9d, info: 'Largest planet in our solar system' },
            { name: 'Saturn', size: 5, distance: 95, speed: 0.009, color: 0xfad5a5, info: 'Famous for its rings' },
            { name: 'Uranus', size: 3.5, distance: 120, speed: 0.006, color: 0x4fd0e7, info: 'Tilted on its side' },
            { name: 'Neptune', size: 3.3, distance: 145, speed: 0.005, color: 0x4b70dd, info: 'Windiest planet' }
        ];

        planetData.forEach((data, index) => {
            const planetGeometry = new THREE.SphereGeometry(data.size, 32, 32);
            const planetMaterial = new THREE.MeshLambertMaterial({ color: data.color });
            const planet = new THREE.Mesh(planetGeometry, planetMaterial);
            
            planet.castShadow = true;
            planet.receiveShadow = true;
            planet.userData = data;
            planet.userData.angle = Math.random() * Math.PI * 2;
            
            // Create orbit line
            const orbitGeometry = new THREE.RingGeometry(data.distance - 0.1, data.distance + 0.1, 64);
            const orbitMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x333333, 
                transparent: true, 
                opacity: 0.3,
                side: THREE.DoubleSide 
            });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            this.scene.add(orbit);
            
            // Add Saturn's rings
            if (data.name === 'Saturn') {
                const ringGeometry = new THREE.RingGeometry(data.size + 1, data.size + 3, 32);
                const ringMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0xaaaaaa, 
                    transparent: true, 
                    opacity: 0.6,
                    side: THREE.DoubleSide 
                });
                const rings = new THREE.Mesh(ringGeometry, ringMaterial);
                rings.rotation.x = Math.PI / 2;
                planet.add(rings);
            }
            
            this.scene.add(planet);
            this.planets.push(planet);
            
            // Add to focus select
            const option = document.createElement('option');
            option.value = index;
            option.textContent = data.name;
            document.getElementById('focusSelect').appendChild(option);
        });
    }

    setupControls() {
        const speedSlider = document.getElementById('speedSlider');
        const zoomSlider = document.getElementById('zoomSlider');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const trailsBtn = document.getElementById('trailsBtn');
        const focusSelect = document.getElementById('focusSelect');

        speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
        });

        zoomSlider.addEventListener('input', (e) => {
            if (!this.focusedPlanet) {
                const distance = parseFloat(e.target.value);
                this.camera.position.setLength(distance);
            }
        });

        pauseBtn.addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            pauseBtn.textContent = this.isPaused ? 'Play' : 'Pause';
            pauseBtn.classList.toggle('active', this.isPaused);
        });

        resetBtn.addEventListener('click', () => {
            this.camera.position.set(0, 50, 200);
            this.camera.lookAt(0, 0, 0);
            this.focusedPlanet = null;
            focusSelect.value = '';
            this.clearTrails();
        });

        trailsBtn.addEventListener('click', () => {
            this.showTrails = !this.showTrails;
            trailsBtn.classList.toggle('active', this.showTrails);
            if (!this.showTrails) {
                this.clearTrails();
            }
        });

        focusSelect.addEventListener('change', (e) => {
            if (e.target.value === '') {
                this.focusedPlanet = null;
            } else {
                this.focusedPlanet = this.planets[parseInt(e.target.value)];
            }
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.renderer.domElement.addEventListener('click', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.planets);

            if (intersects.length > 0) {
                const planet = intersects[0].object;
                this.showPlanetInfo(planet.userData);
            }
        });

        // Mouse controls for camera
        let mouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        this.renderer.domElement.addEventListener('mousedown', (event) => {
            mouseDown = true;
            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (!mouseDown || this.focusedPlanet) return;

            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;

            const spherical = new THREE.Spherical();
            spherical.setFromVector3(this.camera.position);
            spherical.theta -= deltaX * 0.01;
            spherical.phi += deltaY * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

            this.camera.position.setFromSpherical(spherical);
            this.camera.lookAt(0, 0, 0);

            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        // Wheel zoom
        this.renderer.domElement.addEventListener('wheel', (event) => {
            if (this.focusedPlanet) return;
            
            const distance = this.camera.position.length();
            const newDistance = Math.max(30, Math.min(500, distance + event.deltaY * 0.1));
            this.camera.position.setLength(newDistance);
            
            document.getElementById('zoomSlider').value = newDistance;
        });
    }

    showPlanetInfo(planetData) {
        document.getElementById('planetName').textContent = planetData.name;
        document.getElementById('planetInfo').textContent = planetData.info;
    }

    clearTrails() {
        this.trails.forEach(trail => {
            this.scene.remove(trail);
        });
        this.trails.clear();
    }

    updateTrails() {
        if (!this.showTrails) return;

        this.planets.forEach((planet, index) => {
            if (!this.trails.has(index)) {
                const trailGeometry = new THREE.BufferGeometry();
                const trailMaterial = new THREE.LineBasicMaterial({ 
                    color: planet.userData.color,
                    transparent: true,
                    opacity: 0.5
                });
                const trail = new THREE.Line(trailGeometry, trailMaterial);
                this.trails.set(index, { line: trail, points: [] });
                this.scene.add(trail);
            }

            const trailData = this.trails.get(index);
            trailData.points.push(planet.position.clone());
            
            if (trailData.points.length > 100) {
                trailData.points.shift();
            }

            const positions = new Float32Array(trailData.points.length * 3);
            trailData.points.forEach((point, i) => {
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            });

            trailData.line.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            trailData.line.geometry.attributes.position.needsUpdate = true;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isPaused) {
            // Rotate sun
            this.sun.rotation.y += 0.01 * this.animationSpeed;

            // Update planets
            this.planets.forEach(planet => {
                const data = planet.userData;
                data.angle += data.speed * this.animationSpeed;
                
                planet.position.x = Math.cos(data.angle) * data.distance;
                planet.position.z = Math.sin(data.angle) * data.distance;
                planet.rotation.y += 0.02 * this.animationSpeed;
            });

            this.updateTrails();
        }

        // Focus camera on planet
        if (this.focusedPlanet) {
            const planetPos = this.focusedPlanet.position;
            const offset = new THREE.Vector3(0, 10, 20);
            this.camera.position.copy(planetPos).add(offset);
            this.camera.lookAt(planetPos);
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the solar system when the page loads
new SolarSystem();

// Create animated background stars
function createBackgroundStars() {
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = Math.random() * 3 + 1 + 'px';
        star.style.height = star.style.width;
        star.style.animationDelay = Math.random() * 2 + 's';
        starsContainer.appendChild(star);
    }
}

createBackgroundStars();