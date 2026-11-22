import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STACK_MAX = 256;
const CALLS_MAX = 64;
const MEMORY_WORDS = 256;
const STEP_LIMIT = 1_000_000;
const OUTPUT_MAX = 65_536;

const TRAP = {
  UNDERFLOW: 2,
  OVERFLOW: 3,
  DIV_ZERO: 4,
  BAD_OPCODE: 5,
  MEMORY: 6,
  CALL_DEPTH: 7,
  RET_EMPTY: 8,
  PC: 9,
  STEPS: 10,
  OUTPUT: 11,
} as const;

function run(program: Uint8Array, input: Uint8Array): { out: Uint8Array; exit: number } {
  const n = program.length;
  const D = new Int32Array(STACK_MAX);
  let sp = 0;
  const C = new Int32Array(CALLS_MAX);
  let csp = 0;
  const M = new Int32Array(MEMORY_WORDS);
  const out = new Uint8Array(OUTPUT_MAX);
  let olen = 0;
  let ip = 0;
  let pc = 0;
  let steps = 0;

  const done = (exit: number) => ({ out: out.slice(0, olen), exit });
  const trap = (code: number) => done(code);

  for (;;) {
    if (steps === STEP_LIMIT) return trap(TRAP.STEPS);
    if (pc < 0 || pc >= n) return trap(TRAP.PC);
    const op = program[pc];
    let imm = 0;
    let pops = 0;
    let pushes = 0;

    switch (op) {
      case 0x00: imm = 0; pops = 0; pushes = 0; break;
      case 0x01: imm = 1; pops = 0; pushes = 1; break;
      case 0x02: imm = 4; pops = 0; pushes = 1; break;
      case 0x03: imm = 0; pops = 1; pushes = 0; break;
      case 0x04: imm = 0; pops = 1; pushes = 2; break;
      case 0x05: imm = 0; pops = 2; pushes = 2; break;
      case 0x06: imm = 0; pops = 2; pushes = 3; break;
      case 0x07: imm = 0; pops = 3; pushes = 3; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: imm = 0; pops = 2; pushes = 1; break;
      case 0x17: case 0x1b: imm = 0; pops = 1; pushes = 1; break;
      case 0x30: case 0x31: case 0x32: case 0x33: imm = 2; pops = 0; pushes = 0; break;
      case 0x34: imm = 0; pops = 0; pushes = 0; break;
      case 0x40: imm = 0; pops = 1; pushes = 1; break;
      case 0x41: imm = 0; pops = 2; pushes = 0; break;
      case 0x50: case 0x51: case 0x53: imm = 0; pops = 1; pushes = 0; break;
      case 0x52: imm = 0; pops = 0; pushes = 1; break;
      default: return trap(TRAP.BAD_OPCODE);
    }

    if (pc + imm >= n) return trap(TRAP.PC);
    if (sp < pops) return trap(TRAP.UNDERFLOW);
    if (sp - pops + pushes > STACK_MAX) return trap(TRAP.OVERFLOW);

    steps++;
    const next = pc + 1 + imm;
    pc = next;

    switch (op) {
      case 0x00: return done(0);
      case 0x01: D[sp++] = (program[next - 1] << 24) >> 24; break;
      case 0x02:
        D[sp++] = program[next - 4] | (program[next - 3] << 8) | (program[next - 2] << 16) | (program[next - 1] << 24);
        break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: {
        const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a;
        break;
      }
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1];
        const a = D[sp - 2];
        let r: number;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13:
            if (b === 0) return trap(TRAP.DIV_ZERO);
            r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
            break;
          case 0x14:
            if (b === 0) return trap(TRAP.DIV_ZERO);
            r = b === -1 ? 0 : a % b | 0;
            break;
          case 0x15:
            if (b === 0) return trap(TRAP.DIV_ZERO);
            r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
            break;
          case 0x16:
            if (b === 0) return trap(TRAP.DIV_ZERO);
            r = (a >>> 0) % (b >>> 0) | 0;
            break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          case 0x22: r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
        }
        sp -= 2;
        D[sp++] = r;
        break;
      }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((program[next - 2] | (program[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) {
          const v = D[--sp];
          take = op === 0x31 ? v === 0 : v !== 0;
        }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === CALLS_MAX) return trap(TRAP.CALL_DEPTH);
        C[csp++] = next;
        pc = program[next - 2] | (program[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return trap(TRAP.RET_EMPTY);
        pc = C[--csp];
        break;
      case 0x40: {
        const addr = D[sp - 1];
        if (addr < 0 || addr >= MEMORY_WORDS) return trap(TRAP.MEMORY);
        D[sp - 1] = M[addr];
        break;
      }
      case 0x41: {
        const addr = D[sp - 1];
        const v = D[sp - 2];
        if (addr < 0 || addr >= MEMORY_WORDS) return trap(TRAP.MEMORY);
        sp -= 2;
        M[addr] = v;
        break;
      }
      case 0x50: {
        const bytes = new TextEncoder().encode(String(D[sp - 1]));
        if (olen + bytes.length > OUTPUT_MAX) return trap(TRAP.OUTPUT);
        sp--;
        out.set(bytes, olen);
        olen += bytes.length;
        break;
      }
      case 0x51:
        if (olen + 1 > OUTPUT_MAX) return trap(TRAP.OUTPUT);
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52:
        D[sp++] = ip < input.length ? input[ip++] : -1;
        break;
      case 0x53:
        return done(D[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const program = new Uint8Array(readFileSync(join(I, id, 'program.bin')));
  const input = new Uint8Array(readFileSync(join(I, id, 'input.bin')));
  const { out, exit } = run(program, input);
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), out);
  writeFileSync(join(O, id, 'exit.txt'), `${exit}\n`);
}