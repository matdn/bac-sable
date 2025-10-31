/**
 * UIManager - Gère l'interface utilisateur
 */

export interface UICallbacks {
    onDitherToggle: (enabled: boolean) => void
    onMaterialThemeToggle: (isDark: boolean) => void
    onDitherSizeChange: (size: number) => void
    onKeyPress: (key: string) => void
}

export class UIManager {
    private isDitheringEnabled = true
    private isDarkTheme = true
    
    constructor(private callbacks: UICallbacks) {
        console.log(`🎨 UIManager init: isDarkTheme=${this.isDarkTheme}`)
        this.createUI()
        this.setupEventListeners()
    }

    private createUI(): void {
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
            
            <div class="dither-loading" id="loading" style="display: none;">
                <div class="dither-grid" id="dither-grid"></div>
                <div class="loading-text">
                    <div class="loading-title">LOADING</div>
                    <div class="loading-subtitle">Initializing 3D Model...</div>
                    <div class="loading-progress">
                        <div class="progress-bar" id="progress-bar"></div>
                    </div>
                </div>
                <div class="pixel-noise" id="pixel-noise"></div>
            </div>
            
            <div class="vignette-overlay"></div>
        `
        
        document.body.appendChild(uiOverlay)
    }

    private setupEventListeners(): void {
        const ditherSlider = document.getElementById('dither-size') as HTMLInputElement
        const ditherValue = document.getElementById('dither-value') as HTMLSpanElement
        const ditherToggle = document.getElementById('dither-toggle') as HTMLButtonElement
        const materialThemeToggle = document.getElementById('material-theme-toggle') as HTMLButtonElement

        // Dither slider
        if (ditherSlider && ditherValue) {
            ditherSlider.addEventListener('input', (e) => {
                const value = parseFloat((e.target as HTMLInputElement).value)
                ditherValue.textContent = value.toFixed(1)
                this.callbacks.onDitherSizeChange(value)
            })
        }

        // Dither toggle
        if (ditherToggle) {
            ditherToggle.addEventListener('click', () => {
                this.isDitheringEnabled = !this.isDitheringEnabled
                this.callbacks.onDitherToggle(this.isDitheringEnabled)
                
                if (this.isDitheringEnabled) {
                    ditherToggle.textContent = 'Désactiver Dithering'
                    ditherToggle.classList.add('active')
                } else {
                    ditherToggle.textContent = 'Activer Dithering'
                    ditherToggle.classList.remove('active')
                }
            })
        }

        // Material theme toggle
        if (materialThemeToggle) {
            materialThemeToggle.addEventListener('click', () => {
                this.isDarkTheme = !this.isDarkTheme
                this.callbacks.onMaterialThemeToggle(this.isDarkTheme)
                
                console.log(`🎨 UIManager: isDarkTheme=${this.isDarkTheme}, bouton cliqué`)
                
                if (this.isDarkTheme) {
                    materialThemeToggle.textContent = 'Mode Clair'
                    materialThemeToggle.classList.remove('theme-light')
                    materialThemeToggle.classList.add('theme-dark')
                } else {
                    materialThemeToggle.textContent = 'Mode Sombre'
                    materialThemeToggle.classList.remove('theme-dark')
                    materialThemeToggle.classList.add('theme-light')
                }
            })
        }

        // Keyboard controls
        window.addEventListener('keydown', (event) => {
            this.callbacks.onKeyPress(event.key)
        })
    }

    private loadingAnimationId: number | null = null
    private ditherPattern: number[][] = []

    private loadingStartTime: number = 0
    private minimumLoadingTime: number = 7000 // 5 seconds minimum

    public showLoading(): void {
        const loadingEl = document.getElementById('loading')
        if (loadingEl) {
            this.loadingStartTime = Date.now()
            loadingEl.style.display = 'flex'
            this.initDitherGrid()
            this.startDitherAnimation()
            this.simulateLoadingProgress()
        }
    }

    public hideLoading(): void {
        const elapsedTime = Date.now() - this.loadingStartTime
        const remainingTime = Math.max(0, this.minimumLoadingTime - elapsedTime)
        
        if (remainingTime > 0) {
            // Force loading screen to stay visible for minimum duration
            setTimeout(() => {
                this.actuallyHideLoading()
            }, remainingTime)
        } else {
            this.actuallyHideLoading()
        }
    }

    private actuallyHideLoading(): void {
        const loadingEl = document.getElementById('loading')
        if (loadingEl) {
            loadingEl.style.display = 'none'
            this.stopDitherAnimation()
        }
    }

    private initDitherGrid(): void {
        const grid = document.getElementById('dither-grid')
        if (!grid) return

        grid.innerHTML = ''
        this.ditherPattern = []

        const gridSize = 20 // 20x20 grid
        
        for (let y = 0; y < gridSize; y++) {
            this.ditherPattern[y] = []
            for (let x = 0; x < gridSize; x++) {
                const pixel = document.createElement('div')
                pixel.className = 'dither-pixel'
                pixel.style.gridColumn = `${x + 1}`
                pixel.style.gridRow = `${y + 1}`
                
                // Initialize with random dither pattern
                const value = Math.random()
                this.ditherPattern[y][x] = value
                pixel.style.opacity = value > 0.5 ? '1' : '0'
                
                grid.appendChild(pixel)
            }
        }
    }

    private startDitherAnimation(): void {
        let frame = 0
        const animate = () => {
            const grid = document.getElementById('dither-grid')
            if (!grid) return

            const pixels = grid.querySelectorAll('.dither-pixel')
            
            pixels.forEach((pixel, index) => {
                const x = index % 20
                const y = Math.floor(index / 20)
                
                // Create animated dithering pattern
                const time = frame * 0.1
                const wave1 = Math.sin(x * 0.5 + time) * 0.5 + 0.5
                const wave2 = Math.cos(y * 0.3 + time * 1.2) * 0.5 + 0.5
                const noise = Math.random() * 0.3
                
                const intensity = (wave1 + wave2 + noise) / 3
                
                // Apply dithering threshold
                const threshold = 0.5 + Math.sin(time * 0.5) * 0.2
                const isVisible = intensity > threshold
                
                const pixelEl = pixel as HTMLElement
                pixelEl.style.opacity = isVisible ? '1' : '0'
                pixelEl.style.transform = `scale(${0.8 + intensity * 0.4})`
            })

            frame++
            this.loadingAnimationId = requestAnimationFrame(animate)
        }
        
        animate()
    }

    private stopDitherAnimation(): void {
        if (this.loadingAnimationId) {
            cancelAnimationFrame(this.loadingAnimationId)
            this.loadingAnimationId = null
        }
    }

    private simulateLoadingProgress(): void {
        const progressBar = document.getElementById('progress-bar')
        const subtitle = document.querySelector('.loading-subtitle')
        
        if (!progressBar || !subtitle) return

        let progress = 0
        const steps = [
            { progress: 15, text: "Loading HDR Environment...", delay: 800 },
            { progress: 35, text: "Parsing GLB Model...", delay: 900 },
            { progress: 55, text: "Applying Materials...", delay: 1000 },
            { progress: 75, text: "Optimizing Shaders...", delay: 900 },
            { progress: 95, text: "Finalizing Dithering...", delay: 800 },
            { progress: 100, text: "Ready!", delay: 500 }
        ]
        
        let currentStep = 0
        
        const updateProgress = () => {
            if (currentStep >= steps.length) return
            
            const step = steps[currentStep]
            const targetProgress = step.progress
            
            const animate = () => {
                progress += (targetProgress - progress) * 0.1
                progressBar.style.width = `${progress}%`
                
                if (Math.abs(progress - targetProgress) > 1) {
                    requestAnimationFrame(animate)
                } else {
                    progress = targetProgress
                    progressBar.style.width = `${progress}%`
                    subtitle.textContent = step.text
                    
                    currentStep++
                    if (currentStep < steps.length) {
                        const nextStep = steps[currentStep]
                        setTimeout(updateProgress, nextStep.delay || 500)
                    }
                }
            }
            
            animate()
        }
        
        setTimeout(updateProgress, 300)
    }
}