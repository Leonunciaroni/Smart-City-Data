// script.js
// Contains 3D Globe logic (Three.js), section navigation and Quiz.

// --- 1. GLOBE Logic (Three.js) ---

(() => {
  // Basic THREE.js configuration
  const container = document.getElementById('globe-container');
  // Check if container exists before proceeding
  if (!container) return; 
    
  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(0, 0, 600);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.innerHTML = ''; 
  container.appendChild(renderer.domElement);

  // Lights
  const hemiLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(5, 3, 5);
  scene.add(dirLight);

  // Textures and Meshes (Earth, Clouds)
  const textureLoader = new THREE.TextureLoader();

  const EARTH_RADIUS = 200;

  const earthTextureURL = 'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg';
  const cloudsTextureURL = 'https://threejs.org/examples/textures/earth_clouds_1024.png';

  const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load(earthTextureURL),
    shininess: 5
  });
  const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earthMesh);

  const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS + 1.5, 64, 64);
  const cloudMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load(cloudsTextureURL),
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });
  const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
  scene.add(cloudMesh);

  // Group for Lines (borders)
  const bordersGroup = new THREE.Group();
  scene.add(bordersGroup);

  // Util: convert lat/lon to 3D position on sphere
  function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);

    return new THREE.Vector3(x, y, z);
  }

  // Draw borders
  function drawCountryLine(coords, material, radius) {
    if (!Array.isArray(coords) || coords.length === 0) return;

    const rings = (typeof coords[0][0] === 'number') ? [coords] : coords;

    rings.forEach((ring) => {
      const points = [];
      ring.forEach(([lon, lat]) => {
        points.push(latLonToVector3(lat, lon, radius + 0.5)); 
      });

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geometry, material);
      bordersGroup.add(line);
    });
  }

  // GeoJSON URL
  const GEOJSON_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

  // Border material
  const borderMaterial = new THREE.LineBasicMaterial({
    color: 0x99d0ff,
    linewidth: 1,
    transparent: true,
    opacity: 0.9
  });

  // Fetch and Draw GeoJSON
  fetch(GEOJSON_URL)
    .then((r) => {
      if (!r.ok) throw new Error('Failed to load GeoJSON: ' + r.status);
      return r.json();
    })
    .then((geojson) => {
      geojson.features.forEach((feature) => {
        const geom = feature.geometry;
        if (!geom) return;

        if (geom.type === 'Polygon') {
          drawCountryLine(geom.coordinates, borderMaterial, EARTH_RADIUS);
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((poly) => drawCountryLine(poly, borderMaterial, EARTH_RADIUS));
        }
      });
    })
    .catch((err) => {
      console.warn('Could not load or draw country borders:', err);
    });

  // Responsiveness: adjust on resize
  function onWindowResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onWindowResize);

  // Animation: rotate globe automatically
  let lastTime = 0;
  function animate(t) {
    const delta = (t - lastTime) / 1000 || 0;
    lastTime = t;

    // Slow automatic rotation (Y axis)
    earthMesh.rotation.y += 0.08 * delta; 
    cloudMesh.rotation.y += 0.095 * delta;

    // Synchronize rotation of all elements on Y axis
    bordersGroup.rotation.y = earthMesh.rotation.y; 
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Interaction: drag with mouse to rotate manually
  let isDragging = false;
  let previousMousePosition = { x: 0, y: 0 };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', () => {
    isDragging = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaMove = {
      x: e.clientX - previousMousePosition.x,
      y: e.clientY - previousMousePosition.y
    };

    const rotationSpeed = 0.005;
    
    // 1. Apply drag rotation to main mesh (earthMesh)
    earthMesh.rotation.y += deltaMove.x * rotationSpeed;
    earthMesh.rotation.x += deltaMove.y * rotationSpeed * 0.5;
    
    // 2. COPY rotation (X and Y) to other objects to Synchronize
    cloudMesh.rotation.copy(earthMesh.rotation); 
    bordersGroup.rotation.copy(earthMesh.rotation); 

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });
})();

// --- 2. NAVIGATION and QUIZ Logic (Globally Exposed) ---

// Global variable to track active section
let currentSectionId = 'home'; 

// NEW FUNCTION: Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 1. Main function to show a section
function showSection(targetId) {
    console.log('Navigating to:', targetId);
    
    // 1.1 Hide current active section with transition
    const currentSection = document.getElementById(currentSectionId);
    if (currentSection) {
        currentSection.classList.remove('active');
        setTimeout(() => {
            currentSection.style.zIndex = -1;
        }, 800);
    }

    // 1.2 Show new section
    const newSection = document.getElementById(targetId);
    if (newSection) {
        newSection.style.zIndex = 1;
        setTimeout(() => {
            newSection.classList.add('active');
            
            // SCROLL TO TOP - FIXED
            setTimeout(() => {
                scrollToTop();
            }, 100);
            
        }, 50);
        
        currentSectionId = targetId;
    }
    
    // 1.3 Element initialization logic
    if (targetId === 'correct_metrics') {
        initializeChart();
    }
    
    // Initialize air quality chart when forecast section is shown
    if (targetId === 'california-forecast') {
        setTimeout(() => {
            initializeAirQualityChart();
        }, 500);
    }
    
    // Initialize interactive buttons when California case is shown
    if (targetId === 'california-case') {
        setTimeout(() => {
            initializeInteractiveButtons();
        }, 500);
    }
    
    // Restart Medellín chart animations when section is shown
    if (targetId === 'medellin-case') {
        setTimeout(() => {
            restartMedellinChartAnimations();
        }, 500);
    }
    
    // Initialize quiz transition when going to quiz
    if (targetId === 'quiz') {
        setTimeout(() => {
            initializeQuizTransition();
        }, 100);
    }
    
    // Initialize solutions navigation
    if (targetId === 'solutions') {
        setTimeout(() => {
            initializeSolutionsNavigation();
        }, 500);
    }
    
    // NEW: Initialize action form
    if (targetId === 'applications') {
        setTimeout(() => {
            initializeActionForm();
        }, 500);
    }
    
    // 1.4 Update URL
    history.pushState(null, '', `#${targetId}`);
}

// 2. Function to handle quiz selection
function handleQuiz(option) {
    if (option === 'correct') {
        showSection('correct');
    } else {
        showSection(option); 
    }
}

// 3. Initialize page
function initializePage() {
    // Get URL hash, remove '#' and set 'home' as default
    const initialHash = window.location.hash.substring(1) || 'home'; 
    
    // Show initial section without animation on first load
    const initialSection = document.getElementById(initialHash);
    if (initialSection) {
        initialSection.classList.add('active');
        initialSection.style.zIndex = 1;
        currentSectionId = initialHash;
    }
    
    // SCROLL TO TOP on initial load
    setTimeout(() => {
        scrollToTop();
    }, 100);
    
    // Monitor browser 'Back' button
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.substring(1) || 'home';
        if (hash && hash !== currentSectionId) {
            showSection(hash);
        }
    });
}

// 4. Initialize Chart.js for air quality
let airQualityChartInstance = null;

function initializeAirQualityChart() {
    // Destroy previous instance to avoid duplication
    if (airQualityChartInstance) {
        airQualityChartInstance.destroy();
    }

    const ctx = document.getElementById('airQualityChart');
    if (ctx) {
        airQualityChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Current Situation', 'With Solutions Applied (Minimum)', 'With Solutions Applied (Maximum)'],
                datasets: [{
                    label: 'Bad Air Days per Year',
                    data: [100, 70, 40],
                    backgroundColor: [
                        'rgba(255, 59, 48, 0.8)',  // Red for current situation
                        'rgba(255, 149, 0, 0.8)',   // Orange for minimum
                        'rgba(52, 199, 89, 0.8)'    // Green for maximum
                    ],
                    borderColor: [
                        'rgba(255, 59, 48, 1)',
                        'rgba(255, 149, 0, 1)',
                        'rgba(52, 199, 89, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    const percentage = ((context.parsed.y / 365) * 100).toFixed(1);
                                    label += `${context.parsed.y} days (${percentage}% of year)`;
                                }
                                return label;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Reduction of Bad Air Days',
                        color: '#fff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 120,
                        title: {
                            display: true,
                            text: 'Days per Year',
                            color: '#fff'
                        },
                        ticks: {
                            color: '#fff',
                            callback: function(value) {
                                return value + ' days';
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#fff',
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

// 5. Function to restart Medellín chart animations
function restartMedellinChartAnimations() {
    const chartBars = document.querySelectorAll('.chart-bar-before, .chart-bar-after');
    
    chartBars.forEach(bar => {
        // Remove current animation
        bar.style.animation = 'none';
        
        // Force reflow
        void bar.offsetWidth;
        
        // Reapply animation
        bar.style.animation = '';
    });
}

// --- 6. INTERACTIVE BUTTONS FUNCTIONS ---

// Simple toggle function for interactive buttons
function toggleInfo(infoId, button) {
    const infoContent = document.getElementById(infoId);
    
    // Toggle active class on button
    button.classList.toggle('active');
    
    // Toggle display of content
    if (infoContent.style.display === 'block') {
        infoContent.style.display = 'none';
    } else {
        infoContent.style.display = 'block';
    }
}

// Initialize interactive buttons (alternative method)
function initializeInteractiveButtons() {
    const infoButtons = document.querySelectorAll('.info-button');
    
    infoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            if (targetId) {
                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    this.classList.toggle('active');
                    targetContent.style.display = targetContent.style.display === 'block' ? 'none' : 'block';
                }
            }
        });
    });
}

// --- 7. SOLUTIONS INTERACTIVE FUNCTIONS ---

function initializeSolutionsNavigation() {
    // Navbar buttons
    const navButtons = document.querySelectorAll('.solution-nav-btn');
    const previewItems = document.querySelectorAll('.preview-item');
    
    // Function to open solution
    function openSolution(solutionId) {
        const solutionElement = document.getElementById(solutionId + '-solution');
        if (solutionElement) {
            solutionElement.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
    
    // Navbar button events
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const solutionId = this.getAttribute('data-solution');
            
            // Remove active class from all buttons
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Open solution
            openSolution(solutionId);
        });
    });
    
    // Preview items events
    previewItems.forEach(item => {
        item.addEventListener('click', function() {
            const solutionId = this.getAttribute('data-solution');
            
            // Update navbar active state
            navButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-solution') === solutionId) {
                    btn.classList.add('active');
                }
            });
            
            // Open solution
            openSolution(solutionId);
        });
    });
}

function closeSolution() {
    const activeSolutions = document.querySelectorAll('.solution-fullscreen.active');
    activeSolutions.forEach(solution => {
        solution.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// --- 8. TAKE ACTION FORM FUNCTIONS ---

function initializeActionForm() {
    const form = document.getElementById('suggestionForm');
    const confirmationMessage = document.getElementById('confirmationMessage');
    const charCount = document.getElementById('charCount');
    const textarea = document.getElementById('suggestion-details');
    const submitButton = form.querySelector('.submit-button');
    
    // Character counter
    textarea.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        
        if (count > 500) {
            charCount.style.color = '#ff3b30';
        } else if (count > 400) {
            charCount.style.color = '#ff9500';
        } else {
            charCount.style.color = 'var(--color-text-secondary)';
        }
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Show loading state
        submitButton.classList.add('loading');
        
        // Simulate NASA data analysis and AI processing
        setTimeout(() => {
            // Hide form and show confirmation
            form.style.display = 'none';
            confirmationMessage.style.display = 'block';
            
            // Reset loading state
            submitButton.classList.remove('loading');
            
            // Log the submission (in real app, this would send to backend)
            const formData = new FormData(form);
            console.log('Suggestion submitted:', {
                name: formData.get('name'),
                email: formData.get('email'),
                city: formData.get('city'),
                type: formData.get('suggestionType'),
                details: formData.get('suggestionDetails'),
                location: formData.get('location')
            });
            
        }, 3000); // 3-second simulation of NASA/AI analysis
    });
}

// --- 9. QUIZ TRANSITION FUNCTION ---

function initializeQuizTransition() {
    // Preload the California image for smooth transition
    const californiaImg = new Image();
    californiaImg.src = 'img/california-map.png';
    
    console.log('Quiz transition initialized');
}

// 10. Make functions globally available
window.showSection = showSection;
window.handleQuiz = handleQuiz;
window.toggleInfo = toggleInfo;
window.initializeInteractiveButtons = initializeInteractiveButtons;
window.scrollToTop = scrollToTop;
window.initializeSolutionsNavigation = initializeSolutionsNavigation;
window.closeSolution = closeSolution;
window.initializeActionForm = initializeActionForm;
window.initializeQuizTransition = initializeQuizTransition;

// 11. Start navigation when DOM loads
document.addEventListener('DOMContentLoaded', initializePage);