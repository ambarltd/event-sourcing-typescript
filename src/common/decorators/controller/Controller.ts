import 'reflect-metadata';

export const CONTROLLER_METADATA_KEY = Symbol('controller');

export interface ControllerMetadata {
  basePath: string;
}

export function Controller(basePath: string) {
  return function (target: any) {
    const controllerMetadata: ControllerMetadata = {
      basePath,
    };

    Reflect.defineMetadata(CONTROLLER_METADATA_KEY, controllerMetadata, target);

    return target;
  };
}
