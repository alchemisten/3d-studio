import {Container} from 'inversify';
import 'reflect-metadata';
import {Viewer} from './core/viewer';
import {buildProviderModule} from 'inversify-binding-decorators';

const containerDI = new Container();
containerDI.load(buildProviderModule());

const container = document.getElementById('viewer-container');
if (container) {
    const viewer = containerDI.get<Viewer>(Viewer);
    viewer.init(container, {
        objects: [
            {
                name: 'Milk-Truck',
                path: 'assets/models/milk-truck-draco/CesiumMilkTruck.gltf'
            }
        ],
        project: {
            basedir: 'localhost:9000',
            folder: 'test123',
            introText: {
                de: {
                    intro: 'Stuff'
                }
            },
            languages: ['de'],
            name: 'A test project',
            projectID: 'TEST123',
        }
    });
}