import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class GLBLoader {
    private loader: GLTFLoader
    
    constructor() {
        this.loader = new GLTFLoader()
    }

    /**
     * Load a GLB/GLTF file and return a promise with the loaded model
     * @param url - URL or path to the GLB/GLTF file
     * @param onProgress - Optional progress callback
     * @returns Promise resolving to the loaded GLTF object
     */
    async load(
        url: string, 
        onProgress?: (progress: ProgressEvent) => void
    ): Promise<THREE.Group> {
        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    // The loaded model is in gltf.scene
                    resolve(gltf.scene)
                },
                onProgress,
                (error) => {
                    console.error('Error loading GLB file:', error)
                    reject(error)
                }
            )
        })
    }

    /**
     * Load multiple GLB files concurrently
     * @param urls - Array of URLs to load
     * @param onProgress - Optional progress callback for each file
     * @returns Promise resolving to array of loaded models
     */
    async loadMultiple(
        urls: string[],
        onProgress?: (progress: ProgressEvent, index: number) => void
    ): Promise<THREE.Group[]> {
        const loadPromises = urls.map((url, index) => 
            this.load(url, onProgress ? (progress) => onProgress(progress, index) : undefined)
        )
        
        return Promise.all(loadPromises)
    }

    /**
     * Utility method to center a loaded model
     * @param model - The loaded model to center
     */
    static centerModel(model: THREE.Group): void {
        const box = new THREE.Box3().setFromObject(model)
        const center = box.getCenter(new THREE.Vector3())
        model.position.sub(center)
    }

    /**
     * Utility method to scale a model to fit within a specific size
     * @param model - The model to scale
     * @param targetSize - Target size for the largest dimension
     */
    static scaleToFit(model: THREE.Group, targetSize: number): void {
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const maxDimension = Math.max(size.x, size.y, size.z)
        const scale = targetSize / maxDimension
        model.scale.setScalar(scale)
    }

    /**
     * Apply basic materials to all children of the loaded model
     * @param model - The loaded model to apply basic materials to
     * @param options - Options for basic material properties
     */
    static applyBasicMaterials(
        model: THREE.Group, 
        options: {
            color?: number
        } = {}
    ): void {
        const {
            color = 0x888888
        } = options

        model.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh) {
                // Create new basic material
                const basicMaterial = new THREE.MeshStandardMaterial({
                    color: color
                    
                })

                // If the original material has a map (texture), preserve it
                if (child.material instanceof THREE.Material) {
                    const originalMaterial = child.material as any
                    if (originalMaterial.map) {
                        basicMaterial.map = originalMaterial.map
                    }
                }

                // Apply the new material
                child.material = basicMaterial
                child.material.needsUpdate = true
            }
        })
    }

    /**
     * Apply different basic materials to different children
     * @param model - The loaded model
     * @param materials - Array of material options for different children
     */
    static applyVariedBasicMaterials(
        model: THREE.Group,
        materials: Array<{
            color?: number
        }>
    ): void {
        let meshIndex = 0
        
        model.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh && meshIndex < materials.length) {
                const options = materials[meshIndex]
                const {
                    color = 0x888888
                } = options

                const basicMaterial = new THREE.MeshBasicMaterial({
                    color: color
                })

                // Preserve textures if they exist
                if (child.material instanceof THREE.Material) {
                    const originalMaterial = child.material as any
                    if (originalMaterial.map) {
                        basicMaterial.map = originalMaterial.map
                    }
                }

                child.material = basicMaterial
                child.material.needsUpdate = true
                meshIndex++
            }
        })
    }
}