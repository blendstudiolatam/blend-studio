import "server-only";
import ExcelJS from "exceljs";

export type Fila = Record<string, string>;
export type Columna = { titulo: string; clave: string; ancho?: number };

const MAX_FILAS = 2000;

/** Encabezado comparable: sin tildes, minúsculas y sin símbolos ("Teléfono" → "telefono"). */
export const claveEncabezado = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function textoCelda(valor: ExcelJS.CellValue): string {
  if (valor == null) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") {
    if ("result" in valor) return textoCelda(valor.result as ExcelJS.CellValue);
    if ("text" in valor) return String(valor.text);
    if ("richText" in valor) return valor.richText.map((r) => r.text).join("");
    return "";
  }
  return String(valor);
}

/** Separa una línea CSV respetando comillas. Detecta ; o , como separador. */
function leerCsv(texto: string): string[][] {
  const limpio = texto.replace(/^\uFEFF/, "");
  const primera = limpio.slice(0, limpio.indexOf("\n") >>> 0);
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  if (campo !== "" || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

/**
 * Lee un archivo .xlsx o .csv y devuelve sus filas como objetos cuyas claves son
 * los encabezados normalizados (primera fila). Ignora filas vacías.
 */
export async function leerHoja(archivo: File): Promise<{ filas: Fila[]; error?: string }> {
  const nombre = archivo.name.toLowerCase();
  let tabla: string[][];
  try {
    if (nombre.endsWith(".csv")) {
      tabla = leerCsv(await archivo.text());
    } else if (nombre.endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await archivo.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) return { filas: [], error: "El archivo no tiene hojas." };
      tabla = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const celdas: string[] = [];
        for (let c = 1; c <= ws.columnCount; c++) celdas.push(textoCelda(row.getCell(c).value));
        tabla.push(celdas);
      });
    } else {
      return { filas: [], error: "Usa un archivo de Excel (.xlsx) o CSV." };
    }
  } catch {
    return { filas: [], error: "No se pudo leer el archivo. Revisa que no esté dañado." };
  }

  const [encabezados, ...resto] = tabla;
  if (!encabezados) return { filas: [], error: "El archivo está vacío." };
  const claves = encabezados.map((e) => claveEncabezado(e));
  const filas = resto
    .map((celdas) => Object.fromEntries(claves.map((k, i) => [k, (celdas[i] ?? "").trim()])))
    .filter((f) => Object.values(f).some(Boolean));
  if (filas.length > MAX_FILAS) return { filas: [], error: `El archivo tiene más de ${MAX_FILAS} filas. Divídelo en partes.` };
  return { filas };
}

/** Evita que Excel interprete un texto como fórmula al abrir un CSV. */
function seguroCsv(v: string): string {
  const peligroso = /^[=@\t\r]/.test(v) || (/^[+-]/.test(v) && !/^[+-][\d\s()-]+$/.test(v));
  const texto = peligroso ? `'${v}` : v;
  return /[",;\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function crearCsv(columnas: Columna[], filas: Fila[]): string {
  const lineas = [columnas.map((c) => seguroCsv(c.titulo)).join(",")];
  for (const f of filas) lineas.push(columnas.map((c) => seguroCsv(f[c.clave] ?? "")).join(","));
  // BOM para que Excel abra bien las tildes.
  return `\uFEFF${lineas.join("\r\n")}\r\n`;
}

export async function crearXlsx(hoja: string, columnas: Columna[], filas: Fila[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Blend Studio";
  const ws = wb.addWorksheet(hoja, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columnas.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho ?? 18 }));
  const h = ws.getRow(1);
  h.font = { bold: true, color: { argb: "FFF6F1E9" } };
  h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B0B0B" } };
  // Todo como texto: nada se interpreta como fórmula.
  for (const f of filas) ws.addRow(Object.fromEntries(columnas.map((c) => [c.clave, f[c.clave] ?? ""])));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
