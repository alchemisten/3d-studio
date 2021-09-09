(function() {
    const container = document.getElementById('viewer-container');
    if (!container) {
        return;
    }

    /**
     * @type ViewerLauncher
     */
    const launcher = alcm.studio();
    launcher.createHTMLViewer(container, {
        features: {
            'cameraRotation': { enabled: true, rotationSpeed: 1 },
            'lightScenario': {
                enabled: true,
                initialScenarioId: 'points',
                scenarios: [{
                    i18n: {
                        de: {
                            name: 'Punktlichter'
                        }
                    },
                    id: 'points',
                    lights: {},
                    lightSetups: [{
                        color: '#FF0000',
                        name: 'red',
                        position: {
                            x: 5,
                            y: 5,
                            z: 0
                        },
                        type: 'point'
                    },{
                        color: '#00FF00',
                        name: 'green',
                        position: {
                            x: -5,
                            y: 0,
                            z: 5
                        },
                        type: 'point'
                    },{
                        color: '#0000FF',
                        name: 'blue',
                        position: {
                            x: 0,
                            y: -5,
                            z: -5
                        },
                        type: 'point'
                    }]
                },{
                    i18n: {
                        de: {
                            name: 'Ambient'
                        }
                    },
                    id: 'ambient',
                    lights: {},
                    lightSetups: [{
                        color: '#ffffff',
                        intensity: 0.5,
                        name: 'ambient',
                        type: 'ambient'
                    }]
                }]
            }
        },
        objects: [
            {
                name: 'Milk-Truck',
                path: '../assets/models/milk-truck-draco/CesiumMilkTruck.gltf'
            }
        ],
        render: {
            continuousRendering: true
        }
    });
}());
