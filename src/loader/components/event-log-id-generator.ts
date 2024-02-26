export function* infiniteSequence(start: number): Generator<number> {
  let i = start;
  while (true) {
    yield i++;
  }
}
