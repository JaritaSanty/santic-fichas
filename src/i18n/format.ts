/** Formas de un mensaje con cantidad. En español e inglés solo 1 usa el singular. */
export interface PluralMessage {
  one: string;
  other: string;
}

export function formatPlural(message: PluralMessage, count: number, vars: Record<string, string | number> = {}): string {
  return formatMessage(count === 1 ? message.one : message.other, { ...vars, count });
}

export function formatMessage(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}
