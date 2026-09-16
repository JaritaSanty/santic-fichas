import { describe, expect, it } from 'vitest';
import { worksheetFilename } from './filename';

describe('worksheetFilename', () => {
  it('convierte el título en un nombre ASCII seguro', () => {
    expect(worksheetFilename('Animales de la granja: ñandú', 'ficha')).toBe('animales-de-la-granja-nandu.pdf');
  });
  it('usa el respaldo si no queda nada utilizable', () => {
    expect(worksheetFilename('¡¡!!', 'ficha')).toBe('ficha.pdf');
    expect(worksheetFilename('   ', 'worksheet')).toBe('worksheet.pdf');
  });
  it('limita la longitud sin guion final', () => {
    const name = worksheetFilename('palabra '.repeat(20), 'ficha');
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name).not.toMatch(/-\.pdf$/);
  });
});
