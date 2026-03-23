export function ObjectKeys<O extends object>(obj: O): (keyof O)[] {
  return Object.keys(obj) as (keyof O)[];
}
