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
            <div class="logo">VERTEX</div>
           
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

if (ditherSlider && ditherValue) {
    ditherSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value)
        ditherValue.textContent = value.toFixed(1)
        setDitherPointSize(value)
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

// HDR Environment Map setup
let hdrEnvironment: THREE.Texture | null = null

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
                    // Create a high-contrast environment that will show up well in reflections
                    // createHighContrastEnvironment(renderer)
                    reject(error)
                }
            )
        })
    } catch (error) {
        console.error('Failed to load HDR environment map:', error)
        // createHighContrastEnvironment(renderer)
        throw error
    }
}

// function createHighContrastEnvironment(renderer: THREE.WebGLRenderer) {
//     const canvas = document.createElement('canvas')
//     canvas.width = 2048
//     canvas.height = 1024
//     const ctx = canvas.getContext('2d')!
    
//     // Create a dramatic sky-like environment with strong contrasts
//     // Sky gradient
//     const skyGradient = ctx.createLinearGradient(0, 0, 0, 1024)
//     skyGradient.addColorStop(0, '#87CEEB')    // Sky blue top
//     skyGradient.addColorStop(0.4, '#E0F6FF')  // Light blue
//     skyGradient.addColorStop(0.6, '#FFF8DC')  // Cornsilk
//     skyGradient.addColorStop(1, '#2F4F4F')    // Dark slate gray bottom
    
//     ctx.fillStyle = skyGradient
//     ctx.fillRect(0, 0, 2048, 1024)
    
//     // Add bright sun/light source
//     const sunGradient = ctx.createRadialGradient(512, 200, 0, 512, 200, 150)
//     sunGradient.addColorStop(0, '#FFFFFF')    // Bright white center
//     sunGradient.addColorStop(0.3, '#FFFACD')  // Light yellow
//     sunGradient.addColorStop(1, 'transparent') // Fade out
    
//     ctx.fillStyle = sunGradient
//     ctx.fillRect(0, 0, 2048, 1024)
    
//     // Add additional light sources for variety
//     ctx.fillStyle = '#FFFFFF'
//     ctx.globalAlpha = 0.8
    
//     // Light source 1
//     ctx.beginPath()
//     ctx.arc(1600, 300, 80, 0, Math.PI * 2)
//     ctx.fill()
    
//     // Light source 2
//     ctx.beginPath()
//     ctx.arc(300, 150, 60, 0, Math.PI * 2)
//     ctx.fill()
    
//     // Light source 3
//     ctx.beginPath()
//     ctx.arc(1200, 800, 40, 0, Math.PI * 2)
//     ctx.fill()
    
//     ctx.globalAlpha = 1.0
    
//     // Create texture from canvas
//     const texture = new THREE.CanvasTexture(canvas)
//     texture.mapping = THREE.EquirectangularReflectionMapping
//     texture.needsUpdate = true
    
//     const pmremGenerator = new THREE.PMREMGenerator(renderer)
//     const envMap = pmremGenerator.fromEquirectangular(texture)
//     texture.dispose()
//     pmremGenerator.dispose()
    
//     hdrEnvironment = envMap.texture
//     scene.environment = hdrEnvironment
    
//     console.log('High-contrast environment map created for metallic reflections')
// }

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
        
        // Apply metallic materials with reflections for helmet
        const metallicMaterials = [
            { color: 0xd0d0d0, metalness: 0.3, roughness: 0.1 }, // Light gray, very metallic, shiny
            { color: 0xc8c8c8, metalness: 0.8, roughness: 0.4 }, // Light-medium gray, metallic
            { color: 0xc0c0c0, metalness: 0.85, roughness: 0.6 }, // Medium-light gray, metallic
            { color: 0xb8b8b8, metalness: 0.4, roughness: 0.2 }, // Medium gray, less metallic
            { color: 0xb0b0b0, metalness: 0.1, roughness: 0.08 }, // Medium gray, very reflective
            { color: 0xe0e0e0, metalness: 1, roughness: 0.05 }, // Light gray, mirror-like
            { color: 0xa0a0a0, metalness: 0.8, roughness: 0.15 }, // Medium-dark gray, metallic
            { color: 0x989898, metalness: 0.6, roughness: 0.25 }, // Darker gray, less metallic
        ]
        GLBLoader.applyVariedMetallicMaterials(model, metallicMaterials)
        
        if (loadedModel) {
            scene.remove(loadedModel)
        }
        
        // Add new model to scene
        loadedModel = model
        scene.add(loadedModel)
        
        // Hide loading indicator
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
            // Show cube only
            if (loadedModel) scene.remove(loadedModel)
            if (!scene.children.includes(cube.mesh)) scene.add(cube.mesh)
            console.log('Switched to cube')
            break
        case '2':
            // Show loaded model only (if exists)
            if (loadedModel) {
                scene.remove(cube.mesh)
                if (!scene.children.includes(loadedModel)) scene.add(loadedModel)
                console.log('Switched to loaded model')
            } else {
                console.log('No model loaded. Use loadGLBModel() first.')
            }
            break
        case '3':
            // Show both
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

// Function specifically for dithering - uses only 3 luminance levels
function applyDitheringOptimized() {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
    
    // Metallic gray tones optimized for dithering with reflections
    const materials = [
        { color: 0xD0D0D0, metalness: 0.9, roughness: 0.1 }, // Light gray, very reflective
        { color: 0xC0C0C0, metalness: 0.85, roughness: 0.12 }, // Medium-light gray, metallic
        { color: 0xB0B0B0, metalness: 0.8, roughness: 0.15 }, // Medium gray, metallic
        { color: 0xA0A0A0, metalness: 0.75, roughness: 0.2 }, // Medium-dark gray
        { color: 0x909090, metalness: 0.7, roughness: 0.25 }, // Darker gray
        { color: 0xC8C8C8, metalness: 0.95, roughness: 0.08 }, // Light gray, mirror-like
        { color: 0xB8B8B8, metalness: 0.8, roughness: 0.18 }, // Medium gray variation
    ]
    
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
    .then(() => {
        // Update all existing materials to use the new environment
        updateMaterialsWithEnvironment()
    })
    .catch(() => {
        // createHighContrastEnvironment(renderer)
        // Still update materials even with fallback environment
        updateMaterialsWithEnvironment()
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
