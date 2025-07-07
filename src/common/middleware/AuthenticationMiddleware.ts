import { ALLOW_ANONYMOUS_METADATA_KEY } from '../decorators/controller/AllowAnonymous';

export class AuthenticationMiddleware {
  static isAnonymousAllowed(
    controllerClass: any,
    methodName?: string,
  ): boolean {
    if (methodName) {
      const methodAllowAnonymous = Reflect.getMetadata(
        ALLOW_ANONYMOUS_METADATA_KEY,
        controllerClass.prototype,
        methodName,
      );
      if (methodAllowAnonymous) {
        return true;
      }
    }

    const classAllowAnonymous = Reflect.getMetadata(
      ALLOW_ANONYMOUS_METADATA_KEY,
      controllerClass,
    );

    return !!classAllowAnonymous;
  }
}
