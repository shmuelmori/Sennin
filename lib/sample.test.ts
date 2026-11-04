// Smoke test for the test runner (step 0.2).
// Delete it once lib/ has real tests (step 2.1).
describe('test runner', () => {
  it('runs TypeScript tests', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(2, 3)).toBe(5);
  });
});
