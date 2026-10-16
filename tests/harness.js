import System from 'system';

let failed = 0;

export function test(name, fn) {
    try {
        fn();
        print(`ok   ${name}`);
    } catch (e) {
        failed++;
        print(`FAIL ${name}\n     ${e.message}`);
    }
}

export function eq(actual, expected) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b)
        throw new Error(`expected ${b}, got ${a}`);
}

export function done() {
    if (failed) {
        print(`${failed} failed`);
        System.exit(1);
    }
    print('all passed');
}
