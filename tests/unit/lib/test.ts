/*
    A sane, simple testing framework, which seems to be lacking in Node.js land.

    Instead of having a complicated test setup which finds and compiles files,
    we do the simplest obvious thing: A function that takes a list of tests.
    To run the tests execute a node.js program that calls the `run` function.

    It's self-explanatory. Use it like this:

        import { run, test, group, expect } from "@test/test";

        run([
          group("trivial tests", [
            test("referential equality", () => expect.equals(1,3))
            test("structural equality", () => expect.json_equals({}, {})),
            test("async test", async () => {
              const n = await fetchNumberFromTheInternet();
              expect.equals(1, n);
            })
          ])
        ]);

    If you want to have test in different files, just import them like you would
    in a normal program.

        import { run } from "@test/test";
        import * as unit "@test/unitTests";
        import * as integration "@test/integrationTests";

        run([
          unit.tests,
          integration.tests
        ])

*/
export { run, expect, group, test };

class Test {
  constructor(
    public readonly name: string,
    public readonly fun: () => void | Promise<void>,
  ) {}
}

class Group {
  constructor(
    public readonly name: string,
    public readonly entries: Array<Group | Test>,
  ) {}
}

const test = (x: string, y: () => void) => new Test(x, y);
const group = (x: string, y: Array<Group | Test>) => new Group(x, y);

type Failure = {
  path: string;
  reason: string;
  duration: Millis;
};

type FailureReason = string;

type Millis = number;

type ResultTree =
  | { type: 'node'; name: string; children: Array<ResultTree> }
  | {
      type: 'leaf';
      name: string;
      duration: Millis;
      failure: FailureReason | null;
    };

const INDENT = '  ';
const USE_COLORS = process.stdout.isTTY;

function red(txt: string): string {
  return USE_COLORS ? `\x1b[31m${txt}\x1b[0m` : txt;
}

function green(txt: string): string {
  return USE_COLORS ? `\x1b[32m${txt}\x1b[0m` : txt;
}

// Run a test suite.
// This should be the entry point of a test program.
async function run(groups: Array<Group>): Promise<void> {
  const before = Date.now();
  const results = await Promise.all(groups.map(runGroup));
  const after = Date.now();

  logResults(results);
  const failures = getFailures(results);
  const failed = failures.length > 0;

  console.log('');
  if (!failed) {
    console.log(green('Success'));
  } else {
    console.log(`Failures:\n`);
    failures.forEach(logFailure);

    console.log(red('Failed'));
    console.log(`Failures: ${failures.length.toString()}`);
  }

  console.log(`Duration: ${prettyTime(after - before)}`);
  process.exit(failed ? 1 : 0);
}

function logResults(results: Array<ResultTree>): void {
  function showLeaf(
    lvl: number,
    name: string,
    duration: Millis,
    failure: FailureReason | null,
  ) {
    const color = failure === null ? green : red;
    console.log(INDENT.repeat(lvl), `${color(name)} -`, prettyTime(duration));
  }

  function showNode(lvl: number, name: string, children: Array<ResultTree>) {
    console.log(INDENT.repeat(lvl), name);
    showTrees(lvl + 1, children);
  }

  function showTrees(lvl: number, trees: Array<ResultTree>) {
    trees.forEach((tree) => {
      if (tree.type === 'node') {
        showNode(lvl, tree.name, tree.children);
      } else {
        showLeaf(lvl, tree.name, tree.duration, tree.failure);
      }
    });
  }

  showTrees(0, results);
}

function getFailures(results: Array<ResultTree>): Array<Failure> {
  function fromOne(
    path: string,
    duration: Millis,
    reason: FailureReason | null,
  ): Array<Failure> {
    return reason === null ? [] : [{ path, reason, duration }];
  }

  function fromMany(path: string, rs: Array<ResultTree>): Array<Failure> {
    let failures: Array<Failure> = [];
    for (const r of rs) {
      failures = failures.concat(
        r.type === 'node'
          ? fromMany(`${path} ${r.name},`, r.children)
          : fromOne(`${path} ${r.name}`, r.duration, r.failure),
      );
    }
    return failures;
  }

  return fromMany('', results);
}

function prettyTime(ms: number): string {
  const second = 1000;
  const seconds = ms / second;

  return `${seconds}s`;
}

function indented(str: string): string {
  return INDENT + str.split('\n').join(`\n${INDENT}`);
}

function logFailure({ path, reason, duration }: Failure): void {
  console.log(red(`- ${path}`));
  console.log(indented(`Duration: ${prettyTime(duration)}`));
  console.log(indented(reason));
  console.log();
}

async function runGroup(group: Group): Promise<ResultTree> {
  let results: Array<Promise<ResultTree>> = [];
  for (const entry of group.entries) {
    results = results.concat(
      entry instanceof Test ? [runTest(entry)] : runGroup(entry),
    );
  }

  return {
    type: 'node',
    name: group.name,
    children: await Promise.all(results),
  };
}

async function runTest(test: Test): Promise<ResultTree> {
  const before = Date.now();
  const failure = await execute(test);
  const after = Date.now();
  return {
    type: 'leaf',
    name: test.name,
    failure,
    duration: after - before,
  };
}

async function execute(test: Test): Promise<string | null> {
  try {
    const r = test.fun();
    if (r instanceof Promise) {
      await r;
    }

    return null;
  } catch (e) {
    const err = e as Error;
    return err.stack ? err.stack : err.message;
  }
}

// Expectations

class ExpectationFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExpectationFailure';
  }
}

const expect = {
  fail: function fail(reason: string): void {
    throw new ExpectationFailure(reason);
  },

  equals: function equals<T>(a: T, b: T): void {
    if (a == b) {
      return;
    }
    throw new ExpectationFailure(`expected ${a} to equal ${b}`);
  },

  json_equals: function json_equals<T>(a: T, b: T): void {
    const j_a = JSON.stringify(a);
    const j_b = JSON.stringify(b);
    if (j_a == j_b) {
      return;
    }
    throw new ExpectationFailure(`expected ${j_a} to equal ${j_b}`);
  },

  contains: function contains(needle: string, haystack: string) {
    if (haystack.includes(needle)) {
      return;
    }
    throw new ExpectationFailure(
      `expected '${haystack}' to contain '${needle}'`,
    );
  },

  throws: function (f: () => unknown, g: (e: Error) => void) {
    try {
      f();
    } catch (e) {
      g(e as Error);
      return;
    }
    throw new ExpectationFailure('did not throw');
  },
};
