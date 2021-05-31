import {interfaces} from 'inversify';
import {fluentProvide} from 'inversify-binding-decorators';

export const provideSingleton = function(identifier: string | symbol | interfaces.Newable<any> | interfaces.Abstract<any>) {
    return fluentProvide(identifier)
        .inSingletonScope()
        .done();
};
