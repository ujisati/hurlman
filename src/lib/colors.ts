const CSI = '\x1b[';

function color(code: string, s: string): string {
  return `${CSI}${code}m${s}${CSI}0m`;
}

export function bold(s: string): string {
  return color('1', s);
}

export function cyan(s: string): string {
  return color('36', s);
}

export function green(s: string): string {
  return color('32', s);
}

export function yellow(s: string): string {
  return color('33', s);
}

export function red(s: string): string {
  return color('31', s);
}

export function dim(s: string): string {
  return color('2', s);
}

export function supportsColor(): boolean {
  return process.stdout.isTTY;
}

export function styled(fn: (s: string) => string): (s: string) => string {
  return supportsColor() ? fn : (s: string) => s;
}
