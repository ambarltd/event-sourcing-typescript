import { Router } from 'express';
import { container } from 'tsyringe';
import { BaseController } from '../base/BaseController';
import {
  ControllerMetadata,
  CONTROLLER_METADATA_KEY,
} from '../decorators/controller/Controller';

export class ControllerRegistry {
  private static instance: ControllerRegistry;
  private controllers: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): ControllerRegistry {
    if (!ControllerRegistry.instance) {
      ControllerRegistry.instance = new ControllerRegistry();
    }
    return ControllerRegistry.instance;
  }

  registerController(controllerClass: any): void {
    const metadata: ControllerMetadata = Reflect.getMetadata(
      CONTROLLER_METADATA_KEY,
      controllerClass,
    );

    if (!metadata) {
      throw new Error(
        `Controller ${controllerClass.name} must have @Controller decorator`,
      );
    }

    this.controllers.set(metadata.basePath, controllerClass);
  }

  createRoutes(): Router {
    const mainRouter = Router();

    for (const [basePath, controllerClass] of this.controllers) {
      const controllerInstance = container.resolve(
        controllerClass,
      ) as BaseController;
      mainRouter.use(basePath, controllerInstance.router);
    }

    return mainRouter;
  }

  getControllers(): Map<string, any> {
    return this.controllers;
  }
}
