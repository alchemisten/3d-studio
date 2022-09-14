(function() {
    const containerOne = document.getElementById('viewer-container-one');
    const containerTwo = document.getElementById('viewer-container-two');
    if (!containerOne || !containerTwo) {
        return;
    }

    /**
     * @type ViewerLauncher
     */
    const launcherOne = alcm.studio();
    launcherOne.createHTMLViewer(containerOne, {
        features: {
            'WireframeFeature': { enabled: true }
        },
        objects: [
            {
                name: 'Milk-Truck',
                path: '../assets/models/milk-truck-draco/CesiumMilkTruck.gltf'
            }
        ]
    });

    /**
     * @type ViewerLauncher
     */
    const launcherTwo = alcm.studio();
    launcherTwo.createHTMLViewer(containerTwo, {
        camera: {
            fov: 90,
            position: { x: -5, y: 2, z: -1 },
        },
        features: {
            'WireframeFeature': { enabled: false }
        },
        objects: [
            {
                name: 'Milk-Truck',
                path: '../assets/models/milk-truck-draco/CesiumMilkTruck.gltf'
            }
        ]
    });
}());
