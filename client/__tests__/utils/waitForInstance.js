export async function waitForInstance(fakeConstructor) {
  while (fakeConstructor.instances.length === 0) {
    await Promise.resolve();
  }
  return fakeConstructor.instances[0];
}
