import Cube from './cube'
import './style.css'
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import ditherVertexShader from './post-proc/dither-vertex.glsl?raw'
import ditherFragmentShader from './post-proc/dither-fragment.glsl?raw'
import { GLBLoader } from './glbLoader'
// Create canvas
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)
canvas.style.position = 'fixed'
canvas.style.top = '0'
canvas.style.left = '0'
canvas.style.zIndex = '1'

canvas.width = window.innerWidth
canvas.height = window.innerHeight

// Create UI overlay
function createUI() {
    const uiOverlay = document.createElement('div')
    uiOverlay.className = 'ui-overlay'
    
    uiOverlay.innerHTML = `
        <header class="header">
            <div class="logo">HELMET</div>
           
        </header>
        
        
        
        <div class="controls-hint">
            <h3>Controls</h3>
            <p>1 - Show Cube</p>
            <p>2 - Show Model</p>
            <p>3 - Show Both</p>
            <p>Mouse - Rotate View</p>
        </div>
        
        <div class="dither-controls">
            <h3>Dithering</h3>
            <div class="control-group">
                <button id="dither-toggle" class="toggle-button active">Désactiver Dithering</button>
            </div>
            <div class="control-group">
                <button id="material-theme-toggle" class="toggle-button theme-dark">Mode Clair</button>
            </div>
            <div class="control-group">
                <label for="dither-size">Taille des points:</label>
                <input type="range" id="dither-size" min="0.1" max="10" step="0.1" value="1">
                <span id="dither-value">1.0</span>
            </div>
        </div>
        
        <div class="loading-indicator" id="loading" style="display: none;">
            <div class="spinner"></div>
            <p>Loading 3D Model...</p>
        </div>
        
        <div class="vignette-overlay"></div>
    `
    
    document.body.appendChild(uiOverlay)
    return uiOverlay
}

const ui = createUI()

// Setup dither controls after UI creation
const ditherSlider = document.getElementById('dither-size') as HTMLInputElement
const ditherValue = document.getElementById('dither-value') as HTMLSpanElement
const ditherToggle = document.getElementById('dither-toggle') as HTMLButtonElement
const materialThemeToggle = document.getElementById('material-theme-toggle') as HTMLButtonElement

// Track dither state
let isDitheringEnabled = true
// Track material theme state (true = dark, false = light)
let isDarkTheme = true

if (ditherSlider && ditherValue) {
    ditherSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value)
        ditherValue.textContent = value.toFixed(1)
        setDitherPointSize(value)
    })
}

// Setup dither toggle button
if (ditherToggle) {
    ditherToggle.addEventListener('click', () => {
        isDitheringEnabled = !isDitheringEnabled
        toggleDithering(isDitheringEnabled)
        
        // Update button appearance and text
        if (isDitheringEnabled) {
            ditherToggle.textContent = 'Désactiver Dithering'
            ditherToggle.classList.add('active')
        } else {
            ditherToggle.textContent = 'Activer Dithering'
            ditherToggle.classList.remove('active')
        }
    })
}

// Setup material theme toggle button
if (materialThemeToggle) {
    materialThemeToggle.addEventListener('click', () => {
        isDarkTheme = !isDarkTheme
        console.log(`Button clicked! isDarkTheme is now: ${isDarkTheme}`)
        toggleMaterialTheme(isDarkTheme) // Pass the current state explicitly
        
        // Update button appearance and text
        if (isDarkTheme) {
            materialThemeToggle.textContent = 'Mode Clair'
            materialThemeToggle.classList.remove('theme-light')
            materialThemeToggle.classList.add('theme-dark')
            console.log('Button updated to show "Mode Clair" (currently dark theme)')
        } else {
            materialThemeToggle.textContent = 'Mode Sombre'
            materialThemeToggle.classList.remove('theme-dark')
            materialThemeToggle.classList.add('theme-light')
            console.log('Button updated to show "Mode Sombre" (currently light theme)')
        }
    })
}

// Main scene with white background
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff) // White background

const cube = new Cube(1, 0x00ff00)
// scene.add(cube.mesh)

// Create wireframe sphere with vertex points
function createWireframeSphere() {
    const sphereRadius = 4.5
    const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 12)
    
    // Wireframe material
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        wireframe: true,
        transparent: true,
        opacity: 0.5
    })
    
    const wireframeSphere = new THREE.Mesh(sphereGeometry, wireframeMaterial)
    scene.add(wireframeSphere)
    
    // Points on vertices
    const pointsGeometry = new THREE.BufferGeometry()
    const positions = sphereGeometry.attributes.position.array
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0x222222,
        size: 0.08,
        transparent: true,
        opacity: 0.6
    })
    
    const points = new THREE.Points(pointsGeometry, pointsMaterial)
    scene.add(points)
    
    return { wireframeSphere, points }
}

const sphere = createWireframeSphere()

let hdrEnvironment: THREE.Texture | null = null

// Create a colorful synthetic environment for reflections
function createColorfulSyntheticEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
    const envScene = new THREE.Scene()
    
    // Create a colorful gradient background
    const geometry = new THREE.SphereGeometry(50, 32, 16)
    const vertexColors = []
    const positions = geometry.attributes.position.array
    
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]
        const y = positions[i + 1]
        const z = positions[i + 2]
        
        // Create colorful gradients based on position
        const r = (Math.sin(x * 0.05) + 1) * 0.5
        const g = (Math.sin(y * 0.05 + Math.PI * 0.33) + 1) * 0.5
        const b = (Math.sin(z * 0.05 + Math.PI * 0.66) + 1) * 0.5
        
        vertexColors.push(r, g, b)
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3))
    
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })
    const sphere = new THREE.Mesh(geometry, material)
    envScene.add(sphere)
    
    // Generate environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const renderTarget = pmremGenerator.fromScene(envScene, 0.04)
    pmremGenerator.dispose()
    
    return renderTarget.texture
}

async function loadHDREnvironment(url: string, renderer: THREE.WebGLRenderer) {
    try {
        console.log('Loading HDR environment map:', url)
        const loader = new RGBELoader()
        
        // Try to load actual HDR file first
        return new Promise<THREE.Texture>((resolve, reject) => {
            loader.load(
                url,
                (texture: THREE.DataTexture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping
                    
                    // Process HDR texture with PMREMGenerator
                    const pmremGenerator = new THREE.PMREMGenerator(renderer)
                    const envMap = pmremGenerator.fromEquirectangular(texture)
                    texture.dispose()
                    pmremGenerator.dispose()
                    
                    hdrEnvironment = envMap.texture
                    scene.environment = hdrEnvironment
                    
                    console.log('HDR environment map loaded successfully')
                    resolve(hdrEnvironment)
                },
                (progress: ProgressEvent) => {
                    console.log('HDR loading progress:', (progress.loaded / progress.total * 100) + '%')
                },
                (error: unknown) => {
                    console.log('HDR file not found, creating high-contrast synthetic environment')
                    // Create a colorful synthetic environment when HDR fails
                    const syntheticEnv = createColorfulSyntheticEnvironment(renderer)
                    hdrEnvironment = syntheticEnv
                    scene.environment = hdrEnvironment
                    console.log('Synthetic colorful environment created')
                    resolve(hdrEnvironment)
                }
            )
        })
    } catch (error) {
        console.error('Failed to load HDR environment map:', error)
        throw error
    }
}

function updateMaterialsWithEnvironment() {
    if (!hdrEnvironment) return
    
    // Update all materials in the scene to use the environment map
    scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material) {
            if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.envMap = hdrEnvironment
                child.material.envMapIntensity = 2.0 // Strong reflections
                child.material.needsUpdate = true
                console.log('Updated material with environment map')
            }
        }
    })
}



const glbLoader = new GLBLoader()
let loadedModel: THREE.Group | null = null

async function loadGLBModel(url: string) {
    try {
        const loadingEl = document.getElementById('loading')
        if (loadingEl) loadingEl.style.display = 'block'
        
        const model = await glbLoader.load(url, (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
        })
        
        GLBLoader.centerModel(model)
        GLBLoader.scaleToFit(model, 2) 
        
        if (loadedModel) {
            scene.remove(loadedModel)
        }
        
        // Add new model to scene
        loadedModel = model
        scene.add(loadedModel)
        
        const loadingElement = document.getElementById('loading')
        if (loadingElement) loadingElement.style.display = 'none'
        
    } catch (error) {
        const loadingErrorElement = document.getElementById('loading')
        if (loadingErrorElement) loadingErrorElement.style.display = 'none'
    }
}



// Add keyboard controls
window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case '1':
            if (loadedModel) scene.remove(loadedModel)
            if (!scene.children.includes(cube.mesh)) scene.add(cube.mesh)
            console.log('Switched to cube')
            break
        case '2':
            if (loadedModel) {
                scene.remove(cube.mesh)
                if (!scene.children.includes(loadedModel)) scene.add(loadedModel)
                console.log('Switched to loaded model')
            } else {
                console.log('No model loaded. Use loadGLBModel() first.')
            }
            break
        case '3':
            if (!scene.children.includes(cube.mesh)) scene.add(cube.mesh)
            if (loadedModel && !scene.children.includes(loadedModel)) scene.add(loadedModel)
            console.log('Showing both models')
            break
    }
});

// Function to apply varied basic materials optimized for dithering contrast
function applyVariedColors() {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
    
    // Gray tones palette (no pure white, focus on gray range)
    const materials = [
        { color: 0xD0D0D0 }, // Light gray (luminance ~0.82)
        { color: 0xC8C8C8 }, // Light-medium gray (luminance ~0.78)
        { color: 0xC0C0C0 }, // Medium-light gray (luminance ~0.75)
        { color: 0xB8B8B8 }, // Medium gray (lighter) (luminance ~0.72)
        { color: 0xB0B0B0 }, // Medium gray (luminance ~0.69)
        { color: 0xA8A8A8 }, // Medium gray (darker) (luminance ~0.66)
        { color: 0xA0A0A0 }, // Medium-dark gray (luminance ~0.63)
        { color: 0x989898 }, // Darker gray (luminance ~0.6)
        { color: 0x909090 }, // Gray (luminance ~0.56)
        { color: 0x888888 }, // Medium-dark gray (luminance ~0.53)
    ]
    
    // Convert to metallic materials
    const metallicMaterials = materials.map((mat, index) => ({
        color: mat.color,
        metalness: 0.7 + (index * 0.03), // Varying metalness 0.7-0.97
        roughness: 0.1 + (index * 0.02)  // Varying roughness 0.1-0.28
    }))
    
    GLBLoader.applyVariedMetallicMaterials(loadedModel, metallicMaterials)
    console.log('Applied high-contrast metallic colors optimized for dithering')
}

// Function to apply single basic material with custom options
function applyCustomColor(options: any = {}) {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
    
    GLBLoader.applyMetallicMaterials(loadedModel, { 
        color: options.color || 0x888888,
        metalness: options.metalness || 0.8,
        roughness: options.roughness || 0.2
    })
    console.log('Applied custom metallic material:', options)
}

function applyDitheringOptimized() {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
    
    // const materials = [
    //     { color: 0x2A2A2A, metalness: 0.0, roughness: 0.98 }, // Charcoal dark, completely matte
    //     { color: 0x1F1F1F, metalness: 0.0, roughness: 1.0 },  // Very dark gray, completely matte
    //     { color: 0x333333, metalness: 0.0, roughness: 0.95 },  // Dark gray, completely matte
    //     { color: 0x404040, metalness: 0.0, roughness: 0.97 }, // Medium-dark gray, matte
    //     { color: 0x1A1A1A, metalness: 0.0, roughness: 1.0 }, // Almost black, completely matte
    //     { color: 0x262626, metalness: 0.0, roughness: 1.0 },  // Dark charcoal, completely matte
    //     { color: 0x383838, metalness: 0.0, roughness: 0.95 }, // Dark gray variation, matte
    // ]
    
    
    GLBLoader.applyVariedMetallicMaterials(loadedModel, materials)
    console.log('Applied dithering-optimized materials - each part should be clearly distinguishable!')
}

// Performance control functions
function togglePostProcessing() {
    (window as any).skipPostProcessing = !(window as any).skipPostProcessing || false
    console.log('Post-processing:', (window as any).skipPostProcessing ? 'DISABLED' : 'ENABLED')
}

function setRenderScale(scale: number) {
    const width = window.innerWidth
    const height = window.innerHeight
    const scaledWidth = Math.floor(width * scale)
    const scaledHeight = Math.floor(height * scale)
    renderTarget.setSize(scaledWidth, scaledHeight)
    ditherMaterial.uniforms.resolution.value.set(scaledWidth, scaledHeight)
    console.log(`Render scale set to ${scale} (${scaledWidth}x${scaledHeight})`)
}

// Function to control dither point size
function setDitherPointSize(size: number) {
    ditherMaterial.uniforms.pointSize.value = Math.max(0.1, Math.min(10.0, size))
    console.log(`Dither point size set to ${ditherMaterial.uniforms.pointSize.value}`)
}

// Ensure the helmet visor (if present) keeps a full-metal, glossy finish
function applyVisorMetallicFinish(model: THREE.Group) {
    if (!model) return

    const visorKeywords = ['roundcube.001', 'roundcube', 'visor', 'visiere', 'visière', 'glass', 'shield', 'face', 'visor_geo', 'visor_mesh', 'helmet_visor', 'cube.001']
    let applied = false

    model.traverse((child: THREE.Object3D) => {
        if (!(child instanceof THREE.Mesh)) return

        const name = (child.name || '').toLowerCase()
        if (visorKeywords.some(k => name.includes(k))) {
            // preserve texture maps if any, but force metalness/roughness
            const orig: any = child.material
            const visorMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 1.0, // Maximum metalness for high reflectivity
                roughness: 0.0, // Perfectly smooth surface
                envMap: hdrEnvironment || null,
                envMapIntensity: 4.0 // Very strong reflections for high contrast
            })

            if (orig && orig.map) visorMat.map = orig.map
            if (orig && orig.normalMap) visorMat.normalMap = orig.normalMap

            child.material = visorMat
            child.material.needsUpdate = true
            applied = true
            console.log(`Applied visor metallic finish to mesh: "${child.name || '<unnamed>'}"`)
        }
    })

    // Fallback: if no named visor found, try to set the first front-facing mesh
    if (!applied) {
        let firstMesh: THREE.Mesh | null = null
        model.traverse((child: THREE.Object3D) => {
            if (!firstMesh && child instanceof THREE.Mesh) firstMesh = child
        })
        if (firstMesh) {
            const orig: any = firstMesh.material
            const visorMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 1.0, // Maximum metalness for high reflectivity
                roughness: 0.0, // Perfectly smooth surface
                envMap: hdrEnvironment || null,
                envMapIntensity: 4.0 // Very strong reflections for high contrast
            })
            if (orig && orig.map) visorMat.map = orig.map
            if (orig && orig.normalMap) visorMat.normalMap = orig.normalMap
            firstMesh.material = visorMat
            firstMesh.material.needsUpdate = true
            console.log('Fallback: applied visor metallic finish to first mesh:', firstMesh.name || '<unnamed>')
        }
    }
}

// Function to toggle dithering on/off
function toggleDithering(enabled: boolean) {
    ;(window as any).skipPostProcessing = !enabled
    console.log(`Dithering ${enabled ? 'enabled' : 'disabled'}`)
}

// Function to switch between light and dark materials
function toggleMaterialTheme(forceDark?: boolean) {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
    
    // Use the global isDarkTheme variable if no parameter is provided
    const shouldBeDark = forceDark !== undefined ? forceDark : isDarkTheme
    
    if (shouldBeDark) {
        // Apply dark materials with very low metalness
        const darkMaterials = [
            { color: 0x2A2A2A, metalness: 0.0, roughness: 0.98 }, // Charcoal dark, completely matte
            { color: 0x1F1F1F, metalness: 0.0, roughness: 1.0 },  // Very dark gray, completely matte
            { color: 0x333333, metalness: 0.0, roughness: 0.95 },  // Dark gray, completely matte
            { color: 0x404040, metalness: 0.0, roughness: 0.97 }, // Medium-dark gray, matte
            { color: 0x1A1A1A, metalness: 0.0, roughness: 1.0 }, // Almost black, completely matte
            { color: 0x262626, metalness: 0.0, roughness: 1.0 },  // Dark charcoal, completely matte
            { color: 0x383838, metalness: 0.0, roughness: 0.95 }, // Dark gray variation, matte
        ]
    GLBLoader.applyVariedMetallicMaterials(loadedModel, darkMaterials)
    // Force visor to be metallic/glossy even in dark theme
    applyVisorMetallicFinish(loadedModel)
    console.log('Switched to DARK matte materials (visor forced metallic)')
    } else {
        // Apply light materials
        const lightMaterials = [
            { color: 0xD0D0D0, metalness: 0.9, roughness: 0.1 }, // Light gray, very reflective
            { color: 0xC0C0C0, metalness: 0.85, roughness: 0.12 }, // Medium-light gray, metallic
            { color: 0xB0B0B0, metalness: 0.8, roughness: 0.15 }, // Medium gray, metallic
            { color: 0xA0A0A0, metalness: 0.75, roughness: 0.2 }, // Medium-dark gray
            { color: 0x909090, metalness: 0.7, roughness: 0.25 }, // Darker gray
            { color: 0xC8C8C8, metalness: 0.95, roughness: 0.08 }, // Light gray, mirror-like
            { color: 0xB8B8B8, metalness: 0.8, roughness: 0.18 }, // Medium gray variation
        ]
        GLBLoader.applyVariedMetallicMaterials(loadedModel, lightMaterials)
        console.log('Switched to LIGHT metallic materials')
    }
}

// Debug function to show original colors before dithering
function showOriginalColors() {
    (window as any).skipPostProcessing = true
    console.log('Showing original colors (post-processing disabled)')
    console.log('Use togglePostProcessing() to re-enable dithering')
}

// Function to fix black textures by boosting their luminance
function fixBlackTextures() {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
        
    let fixedCount = 0
    
    loadedModel.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            const color = child.material.color
            const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b
            
            console.log(`Mesh material - R:${color.r.toFixed(2)} G:${color.g.toFixed(2)} B:${color.b.toFixed(2)} Luminance:${luminance.toFixed(3)}`)
            
            if (luminance < 0.15) {
                child.material.color.setHex(0x808080)
                fixedCount++
                console.log('  → Fixed: boosted to medium gray')
            } else if (luminance < 0.25) {
                child.material.color.multiplyScalar(1.5)
                fixedCount++
                console.log('  → Fixed: brightness boosted')
            }
        }
    })
}

// Expose functions globally for easy access in browser console
(window as any).loadGLBModel = loadGLBModel
;(window as any).applyVariedColors = applyVariedColors
;(window as any).applyCustomColor = applyCustomColor
;(window as any).applyDitheringOptimized = applyDitheringOptimized
;(window as any).togglePostProcessing = togglePostProcessing
;(window as any).setRenderScale = setRenderScale
;(window as any).setDitherPointSize = setDitherPointSize
;(window as any).showOriginalColors = showOriginalColors
;(window as any).fixBlackTextures = fixBlackTextures
;(window as any).toggleMaterialTheme = toggleMaterialTheme
;(window as any).skipPostProcessing = false

loadGLBModel('./untitled1.glb')

const ambientLight = new THREE.AmbientLight(0xffffff, 0.0) // Reduced for better reflections
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0) // Increased intensity
directionalLight.position.set(5, 5, 5)
directionalLight.castShadow = false
scene.add(directionalLight)

// Add subtle rim lighting for metallic reflections
const rimLight = new THREE.DirectionalLight(0xffffff, 0.5)
rimLight.position.set(-5, 2, -5)
scene.add(rimLight)



const postScene = new THREE.Scene()
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
)
camera.position.set(0, 0, 4)

// Camera controls for mouse interaction
let mouseX = 0
let mouseY = 0
let targetRotationX = 0
let targetRotationY = 0

// Mouse interaction
canvas.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1
    
    targetRotationX = mouseY * 0.3
    targetRotationY = mouseX * 0.3
})

const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    alpha: true,
    antialias: false,  
    powerPreference: "high-performance",
    stencil: false,   
    depth: true       
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // Limit pixel ratio

// Additional renderer optimizations
renderer.shadowMap.enabled = false // Disable shadows
renderer.outputColorSpace = THREE.SRGBColorSpace

// Initialize HDR environment for metallic reflections
loadHDREnvironment('./Tokyo-Shibuya-neon-lights.hdr', renderer)
// loadHDREnvironment('./shanghai_bund_2k.hdr', renderer)
    .then(() => {
        console.log('HDR environment loaded successfully')
        // Update all existing materials to use the new environment
        updateMaterialsWithEnvironment()
        
        // Apply default dark materials with proper HDR environment
        if (loadedModel) {
            setTimeout(() => {
                toggleMaterialTheme(true) // Force dark theme with HDR
                console.log('Applied default dark matte materials with HDR')
            }, 200)
        }
    })
    .catch(() => {
        console.log('HDR failed - using colorful synthetic environment')
        // Create colorful synthetic environment as fallback
        hdrEnvironment = createColorfulSyntheticEnvironment(renderer)
        scene.environment = hdrEnvironment
        // Update materials with the new synthetic environment
        updateMaterialsWithEnvironment()
        
        // Apply default dark materials with synthetic environment
        if (loadedModel) {
            setTimeout(() => {
                toggleMaterialTheme(true) // Force dark theme with synthetic env
                console.log('Applied default dark matte materials with synthetic environment')
            }, 200)
        }
    })

// Create render target with reduced resolution for performance
const renderScale = 0.75 // Render at 75% resolution
const renderTarget = new THREE.WebGLRenderTarget(
    Math.floor(window.innerWidth * renderScale), 
    Math.floor(window.innerHeight * renderScale)
)

// Create dithering shader material
const ditherMaterial = new THREE.ShaderMaterial({
    vertexShader: ditherVertexShader,
    fragmentShader: ditherFragmentShader,
    uniforms: {
        tDiffuse: { value: renderTarget.texture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        pointSize: { value: 1.0 }
    }
})

// Create full-screen quad
const postGeometry = new THREE.PlaneGeometry(2, 2)
const postMesh = new THREE.Mesh(postGeometry, ditherMaterial)
postScene.add(postMesh)

let lastTime = 0
const targetFPS = 30 // Target 30fps instead of 60fps for better performance
const frameInterval = 1000 / targetFPS

function animate(time: number = 0) {
    requestAnimationFrame(animate)
    
    // Throttle to target FPS
    if (time - lastTime < frameInterval) return
    lastTime = time
    
    const rotationSpeed = 0.008 // Slightly slower rotation
    
    // Smooth camera movement based on mouse
    scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.05
    scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.05
    
    // Slow auto-rotation for the entire scene
    scene.rotation.y += rotationSpeed * 0.3
    
    // Only rotate objects that are visible in the scene
    if (scene.children.includes(cube.mesh)) {
        cube.mesh.rotation.y += rotationSpeed
    }
    
    // Rotate the loaded model if it exists and is visible
    if (loadedModel && scene.children.includes(loadedModel)) {
        loadedModel.rotation.y += rotationSpeed * 0.5
        loadedModel.rotation.x += rotationSpeed * 0.02
    }
    
    // Option to skip post-processing for better performance
    if ((window as any).skipPostProcessing) {
        // Direct render without dithering effect
        renderer.setRenderTarget(null)
        renderer.render(scene, camera)
    } else {
        // First pass: render scene to texture
        renderer.setRenderTarget(renderTarget)
        renderer.render(scene, camera)
        
        // Second pass: render dithering effect to screen
        renderer.setRenderTarget(null)
        renderer.render(postScene, postCamera)
    }
}

animate()

// Throttled resize handler
let resizeTimeout: number
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
        const width = window.innerWidth
        const height = window.innerHeight
        
        canvas.width = width
        canvas.height = height
        camera.aspect = width / height
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
        
        // Update render target with scaled resolution
        const renderScale = 0.75
        const scaledWidth = Math.floor(width * renderScale)
        const scaledHeight = Math.floor(height * renderScale)
        renderTarget.setSize(scaledWidth, scaledHeight)
        ditherMaterial.uniforms.resolution.value.set(scaledWidth, scaledHeight)
    }, 100) // Debounce resize events
})
