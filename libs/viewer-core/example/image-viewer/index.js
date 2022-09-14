(function() {
    const container = document.getElementById('viewer-container');
    if (!container) {
        return;
    }

    /**
     * @type ViewerLauncher
     */
    const launcher = alcm.studio();
    const size = { width: 1024, height: 768 }; // Defines size of rendering
    const images$ = launcher.createImageViewer(size, {
        objects: [
            {
                name: 'Milk-Truck',
                path: '../assets/models/milk-truck-draco/CesiumMilkTruck.gltf'
            }
        ]
    });
    const image = document.createElement('img');
    image.width = size.width;
    image.height = size.height;
    container.appendChild(image);
    images$.subscribe((imageData) => {
        image.src = imageData;
    });
}());
