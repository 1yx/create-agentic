/**
 *
 */
export function hello(name: string): string {
  return `Hello, ${name}!`;
}

/**
 *
 */
export function main(): void {
  console.log(hello("World"));
}

if (import.meta.main) {
  main();
}
