/** Exporta linhas para CSV (UTF-8 com BOM, separador ";" para abrir direto no Excel pt-BR). */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    // Evita injeção de fórmulas em planilhas.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(url);
}
