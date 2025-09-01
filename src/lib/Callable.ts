// Make a class be callable without the `new` keyword.

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Callable(classname: any) {
  function apply(target: any, _: any, argumentsList: any) {
    return new target(...argumentsList);
  }
  return new Proxy(classname, { apply });
}
