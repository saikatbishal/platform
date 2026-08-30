/**
 * mapshaper ships no types. Only applyCommands is used here, and only with
 * an in-memory {filename: contents} map, so this narrow declaration is enough.
 */
declare module 'mapshaper' {
  export function applyCommands(
    commands: string,
    input: Record<string, string | Buffer>,
  ): Promise<Record<string, string>>
}
