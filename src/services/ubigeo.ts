export interface Department { id: number; departamento: string; ubigeo: string; }
export interface Province { id: number; provincia: string; ubigeo: string; departamento_id: number; }
export interface District { id: number; distrito: string; ubigeo: string; provincia_id: number; departamento_id: number; }
let cache: Promise<{ departments: Department[]; provinces: Province[]; districts: District[] }> | null = null;
export function loadUbigeo() {
  if (!cache) cache = Promise.all([
    fetch('/data/1_ubigeo_departamentos.json').then((r) => r.json()),
    fetch('/data/2_ubigeo_provincias.json').then((r) => r.json()),
    fetch('/data/3_ubigeo_distritos.json').then((r) => r.json()),
  ]).then(([d, p, x]) => ({ departments: d.ubigeo_departamentos, provinces: p.ubigeo_provincias, districts: x.ubigeo_distritos }));
  return cache;
}
