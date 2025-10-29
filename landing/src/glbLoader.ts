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
        model.scale.setScalar(0.6)
        model.rotation.x = -Math.PI / 8
        model.rotation.y = Math.PI / 4
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
     * Apply varied metallic materials for reflective helmet appearance
     * @param model - The loaded model
     * @param materials - Array of material options with metallic properties
     */
    static applyVariedMetallicMaterials(
        model: THREE.Group,
        materials: Array<{
            color?: number,
            metalness?: number,
            roughness?: number
        }>
    ): void {
        let meshIndex = 0
        
        model.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh && meshIndex < materials.length) {
                const options = materials[meshIndex]
                const {
                    color = 0x888888,
                    metalness = 0,
                    roughness = 0
                } = options

                const metallicMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: metalness,
                    roughness: roughness,
                    envMapIntensity: 1.0
                })

                // Preserve textures if they exist
                if (child.material instanceof THREE.Material) {
                    const originalMaterial = child.material as any
                    if (originalMaterial.map) {
                        metallicMaterial.map = originalMaterial.map
                    }
                    if (originalMaterial.normalMap) {
                        metallicMaterial.normalMap = originalMaterial.normalMap
                    }
                }

                child.material = metallicMaterial
                child.material.needsUpdate = true
                meshIndex++
            }
        })
    }
}