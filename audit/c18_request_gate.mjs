import assert from 'node:assert/strict';
import { createMatchRequestGate } from '../src/lib/matchRequestGate.js';
let count = 0;
function test(name, fn) { fn(); count++; console.log(`PASS ${name}`); }
test('initial request excludes overlapping detail poll', () => {
  const gate = createMatchRequestGate(), route = {id:'same', generation:0};
  const initial = gate.begin(route); assert.ok(initial); assert.equal(gate.begin(route), null);
  gate.finish(initial); assert.ok(gate.begin(route));
});
test('completion on an old route cannot unlock current route', () => {
  const gate = createMatchRequestGate(), a={id:'a'}, b={id:'b'};
  const first=gate.begin(a), second=gate.begin(b); assert.ok(second);
  gate.finish(first); assert.equal(gate.begin(b),null); gate.finish(second); assert.ok(gate.begin(b));
});
test('StrictMode cleanup and remount do not share a release token', () => {
  const gate=createMatchRequestGate(), route={id:'a'};
  const first=gate.begin(route);gate.finish(first);
  const second=gate.begin(route);gate.finish(first);assert.equal(gate.begin(route),null);
  gate.finish(second);assert.ok(gate.begin(route));
});
test('A to B to A uses distinct route generations', () => {
  const gate=createMatchRequestGate(), a0={id:'a',generation:0}, b={id:'b',generation:1}, a2={id:'a',generation:2};
  const first=gate.begin(a0),second=gate.begin(b),third=gate.begin(a2);
  assert.ok(first&&second&&third);gate.finish(first);gate.finish(second);assert.equal(gate.begin(a2),null);
  gate.finish(third);assert.ok(gate.begin(a2));
});
test('release is idempotent and unknown release does nothing', () => {
  const gate=createMatchRequestGate(),route={id:'a'};
  const first=gate.begin(route);gate.finish({route});assert.equal(gate.begin(route),null);
  gate.finish(first);gate.finish(first);assert.ok(gate.begin(route));
});
test('independent mounted pages have independent gates', () => {
  const a=createMatchRequestGate(),b=createMatchRequestGate(),route={id:'a'};
  assert.ok(a.begin(route));assert.ok(b.begin(route));assert.equal(a.begin(route),null);
});
console.log(JSON.stringify({suite:'detail request ownership',passed:count,failed:0}));
