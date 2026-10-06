export function csvCell(value: unknown) {
  let text = String(value ?? '');
  // Spreadsheet software may execute quoted cells as formulas.
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function movementsCsv(events: any[]) {
  return (
    '\ufeff' +
    [
      ['Data', 'Tipo', 'Descrição', 'Valor', 'Responsável'],
      ...events.map((e) => [
        e.ts,
        e.type,
        e.description,
        String(e.value).replace('.', ','),
        e.actor,
      ]),
    ]
      .map((row) => row.map(csvCell).join(';'))
      .join('\r\n')
  );
}
