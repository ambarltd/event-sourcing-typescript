# Style guide

This file describes preferred practices for code in this codebase.

A common theme amongst the guidelines is to make the code easy to understand and navigate using text tools.
For example, being able to string search for all imports of a module is more useful than having to rely on an IDE for it.

The spirit of the guide is to favour:

- Static over dynamic type checking
- Explicit over implicit data flow
- Patterns that are easy to search and manipulate using text tools over IDE-dependent manipulation and navigation.
- Immutable over mutable
- Pure over effectful
- Composition over inheritance

Our IDEs have amazing functionalities,

## Modules

_Never use relative imports_
Relative imports make it impossible to string search all places where a module is being imported.
It also makes it difficult to move a module to a different location.

Bad

```
import { myFun } from '../../../../../a/b/c/d';
```

Good

```
import { myFun } from '@/a/b/c/d';
```

_List exports at the top of the module_
This allows people looking at the module to immediately see what its interface is.

Bad

```
..
export function myFun...
...
export const myConst...
...
export class MyClass...
```

Good

```
export { myFun, myConst, MyClass }
...
```
