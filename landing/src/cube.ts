import * as THREE from 'three';

export default class Cube {
    constructor(size: number, color: number) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshPhysicalMaterial({ color: color, roughness: 0.5, metalness: 0.5 });
        this.mesh = new THREE.Mesh(geometry, material);
    }
    mesh: THREE.Mesh;
}