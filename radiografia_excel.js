const xlsx = require('xlsx');
const wb = xlsx.readFile('public/1_5064672954961365207.xlsx');

// Las hojas principales son los meses, las AUX son auxiliares de detalle
// Necesitamos leer en modo raw (sin headers) para ver la estructura real
const hojas = ['SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'AUX NOVIEMBRE', 'DICIEMBRE', 'AUX DICIEMBRE'];

hojas.forEach(name => {
  const sheet = wb.Sheets[name];
  // Leer como array de arrays (sin asumir headers)
  const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📄 HOJA: "${name}" (${raw.length} filas totales)`);
  console.log(`${'='.repeat(60)}`);
  
  // Mostrar las primeras 15 filas para entender la estructura
  const limit = Math.min(raw.length, 15);
  for (let i = 0; i < limit; i++) {
    const row = raw[i];
    // Solo mostrar celdas con contenido
    const cleaned = row.map((c, idx) => c !== '' ? `[${idx}]=${String(c).substring(0, 25)}` : null).filter(Boolean);
    if (cleaned.length > 0) {
      console.log(`  Fila ${i}: ${cleaned.join(' | ')}`);
    }
  }
  
  // También ver desde la fila 15 a 25 para ver los datos de producto
  console.log('  --- Zona de datos (filas 15-25) ---');
  for (let i = 15; i < Math.min(raw.length, 25); i++) {
    const row = raw[i];
    const cleaned = row.map((c, idx) => c !== '' ? `[${idx}]=${String(c).substring(0, 20)}` : null).filter(Boolean);
    if (cleaned.length > 0) {
      console.log(`  Fila ${i}: ${cleaned.join(' | ')}`);
    }
  }
});
