import Cube from './cube'
import './style.css'
import * as THREE from 'three'
import ditherVertexShader from './post-proc/dither-vertex.glsl?raw'
import ditherFragmentShader from './post-proc/dither-fragment.glsl?raw'
import { GLBLoader } from './glbLoader'
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)
canvas.style.position = 'absolute'
canvas.style.top = '0'
canvas.style.left = '0'


canvas.width = window.innerWidth
canvas.height = window.innerHeight

// Main scene with the cube
const scene = new THREE.Scene()
const cube = new Cube(1, 0x00ff00)
// scene.add(cube.mesh)

// GLB Loader setup
const glbLoader = new GLBLoader()
let loadedModel: THREE.Group | null = null

async function loadGLBModel(url: string) {
    try {
        console.log('Loading GLB model:', url)
        const model = await glbLoader.load(url, (progress) => {
            console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
        })
        
        // Center and scale the model
        GLBLoader.centerModel(model)
        GLBLoader.scaleToFit(model, 2) // Scale to fit within 2 units
        
        // Apply dithering-optimized materials by default
        // Use a wider range to ensure good distribution across dithering levels
        const ditheringMaterials = [
            { color: 0x404040 }, // Dark gray (not pure black to avoid invisible parts)
            { color: 0x808080 }, // Medium gray
            { color: 0xC0C0C0 }, // Light gray
            { color: 0xFFFFFF }, // White
            { color: 0x606060 }, // Medium-dark gray
            { color: 0xA0A0A0 }, // Medium-light gray
            { color: 0x303030 }, // Very dark gray (but still visible)
            { color: 0xE0E0E0 }, // Very light gray
        ]
        GLBLoader.applyVariedBasicMaterials(model, ditheringMaterials)
        
        // Remove existing model if any
        if (loadedModel) {
            scene.remove(loadedModel)
        }
        
        // Add new model to scene
        loadedModel = model
        scene.add(loadedModel)
        
        console.log('GLB model loaded successfully')
    } catch (error) {
        console.error('Failed to load GLB model:', error)
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
    
    // Colors optimized for dithering - high contrast luminance values
    const materials = [
        { color: 0x000000 }, // Pure black (luminance ~0)
        { color: 0xFFFFFF }, // Pure white (luminance ~1)
        { color: 0x404040 }, // Dark gray (luminance ~0.25)
        { color: 0xC0C0C0 }, // Light gray (luminance ~0.75)
        { color: 0xFF0000 }, // Pure red (luminance ~0.3)
        { color: 0x00FF00 }, // Pure green (luminance ~0.59)
        { color: 0x0000FF }, // Pure blue (luminance ~0.11)
        { color: 0x800000 }, // Dark red (luminance ~0.15)
        { color: 0x008000 }, // Dark green (luminance ~0.29)
        { color: 0x000080 }, // Dark blue (luminance ~0.055)
    ]
    
    GLBLoader.applyVariedBasicMaterials(loadedModel, materials)
    console.log('Applied high-contrast colors optimized for dithering')
}

// Function to apply single basic material with custom options
function applyCustomColor(options: any = {}) {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
    
    GLBLoader.applyBasicMaterials(loadedModel, options)
    console.log('Applied custom color:', options)
}

// Function specifically for dithering - uses only 3 luminance levels
function applyDitheringOptimized() {
    if (!loadedModel) {
        console.log('No model loaded. Load a model first.')
        return
    }
    
    // Only 3 colors that map perfectly to the dithering levels
    const materials = [
        { color: 0x000000 }, // Black -> will stay black in dithering
        { color: 0x808080 }, // Medium gray -> will stay gray in dithering  
        { color: 0xFFFFFF }, // White -> will stay white in dithering
        { color: 0x202020 }, // Very dark gray -> will dither between black and gray
        { color: 0xE0E0E0 }, // Very light gray -> will dither between gray and white
        { color: 0x404040 }, // Dark gray -> will mostly be gray with some black
        { color: 0xC0C0C0 }, // Light gray -> will mostly be white with some gray
    ]
    
    GLBLoader.applyVariedBasicMaterials(loadedModel, materials)
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
    
    console.log('Analyzing and fixing black textures...')
    let fixedCount = 0
    
    loadedModel.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            const color = child.material.color
            // Calculate luminance using standard formula
            const luminance = 0.299 * color.r + 0.587 * color.g + 0.114 * color.b
            
            console.log(`Mesh material - R:${color.r.toFixed(2)} G:${color.g.toFixed(2)} B:${color.b.toFixed(2)} Luminance:${luminance.toFixed(3)}`)
            
            // If luminance is too low (appears black in dithering)
            if (luminance < 0.15) {
                // Boost to medium gray level
                child.material.color.setHex(0x808080)
                fixedCount++
                console.log('  → Fixed: boosted to medium gray')
            } else if (luminance < 0.25) {
                // Boost slightly for better dithering visibility
                child.material.color.multiplyScalar(1.5)
                fixedCount++
                console.log('  → Fixed: brightness boosted')
            }
        }
    })
    
    console.log(`Fixed ${fixedCount} materials that were too dark for dithering`)
}

// Expose functions globally for easy access in browser console
(window as any).loadGLBModel = loadGLBModel
;(window as any).applyVariedColors = applyVariedColors
;(window as any).applyCustomColor = applyCustomColor
;(window as any).applyDitheringOptimized = applyDitheringOptimized
;(window as any).togglePostProcessing = togglePostProcessing
;(window as any).setRenderScale = setRenderScale
;(window as any).showOriginalColors = showOriginalColors
;(window as any).fixBlackTextures = fixBlackTextures
;(window as any).skipPostProcessing = false

loadGLBModel('./untitled.glb')

// Simple lighting setup (BasicMaterial doesn't need complex lighting)
const light = new THREE.AmbientLight(0xffffff, 2.5)
light.position.set(5, 5, 5)
scene.add(light)

const postScene = new THREE.Scene()
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
)
camera.position.z = 3

const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    alpha: true,
    antialias: false,  // Disable antialiasing for performance
    powerPreference: "high-performance",
    stencil: false,    // Disable stencil buffer
    depth: true        // Keep depth buffer for 3D rendering
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // Limit pixel ratio

// Additional renderer optimizations
renderer.shadowMap.enabled = false // Disable shadows
renderer.outputColorSpace = THREE.SRGBColorSpace

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
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
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
    
    // Only rotate objects that are visible in the scene
    if (scene.children.includes(cube.mesh)) {
        cube.mesh.rotation.y += rotationSpeed
        // Remove X rotation for cube to reduce calculations
    }
    
    // Rotate the loaded model if it exists and is visible
    if (loadedModel && scene.children.includes(loadedModel)) {
        loadedModel.rotation.y += rotationSpeed
        // Remove X rotation for loaded model to reduce calculations
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
