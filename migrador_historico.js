const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

async function migrarHistorico() {
  console.log('🚀 MIGRADOR HISTÓRICO TOTAL - Inversiones Loyafu');
  console.log('   Usando SERVICE_ROLE (Bypass RLS)\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const wb = xlsx.readFile('public/1_5064672954961365207.xlsx');

  // 1. Primero obtener los productos existentes en Supabase para mapear nombres -> IDs
  const { data: productos, error: prodErr } = await supabase.from('products').select('*');
  if (prodErr) { console.error('Error leyendo productos:', prodErr.message); return; }
  console.log(`✅ ${productos.length} productos encontrados en Supabase.\n`);

  // Mapa de descripción (limpia) -> product
  const productoMap = new Map();
  productos.forEach(p => {
    productoMap.set(p.descripcion.trim().toUpperCase().substring(0, 20), p);
  });

  // Función para convertir fecha serial de Excel a formato YYYY-MM-DD
  function excelDateToISO(serial) {
    if (!serial || typeof serial !== 'number') return null;
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // Función para buscar producto por descripción parcial
  function findProduct(descExcel) {
    if (!descExcel) return null;
    const clean = String(descExcel).trim().toUpperCase().substring(0, 20);
    
    // Buscar match exacto primero
    if (productoMap.has(clean)) return productoMap.get(clean);
    
    // Buscar match parcial
    for (const [key, prod] of productoMap.entries()) {
      if (key.includes(clean) || clean.includes(key)) return prod;
    }
    
    // Buscar por las primeras 10 letras
    const short = clean.substring(0, 10);
    for (const [key, prod] of productoMap.entries()) {
      if (key.startsWith(short)) return prod;
    }
    
    return null;
  }

  // 2. Procesar las hojas AUX (tienen transacciones detalladas)
  // Estructura AUX: Fila 8-9 = headers, Fila 10+ = datos
  // [0]=Fecha(serial), [1]=Descripción, [2]=Costo, [3]=Unid, [4]=TotalBs (existencia anterior)
  // [5]=Costo, [6]=Unid, [7]=TotalBs (ENTRADAS)
  // [8]=Costo, [9]=Unid, [10]=TotalBs (SALIDAS)
  // [11]=Costo, [12]=Unid, [13]=TotalBs (RETIRO)
  // [14]=Costo, [15]=Unid, [16]=TotalBs (AUTOCONSUMO)

  const hojasAux = ['AUX NOVIEMBRE', 'AUX DICIEMBRE'];
  let totalInsertados = 0;
  let totalErrores = 0;
  let transacciones = [];

  for (const nombreHoja of hojasAux) {
    console.log(`\n📄 Procesando hoja: ${nombreHoja}`);
    const sheet = wb.Sheets[nombreHoja];
    const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    for (let i = 10; i < raw.length; i++) {
      const row = raw[i];
      const fechaSerial = row[0];
      const descripcion = row[1];
      const fecha = excelDateToISO(fechaSerial);
      
      if (!fecha || !descripcion || typeof descripcion !== 'string') continue;
      
      const product = findProduct(descripcion);
      if (!product) {
        console.log(`   ⚠️ Producto NO encontrado: "${descripcion}" (Fila ${i})`);
        totalErrores++;
        continue;
      }

      // Detectar tipo de transacción según qué columnas tienen datos
      const entradaUnid = parseFloat(row[6]) || 0;
      const entradaCosto = parseFloat(row[5]) || 0;
      const salidaUnid = parseFloat(row[9]) || 0;
      const salidaCosto = parseFloat(row[8]) || 0;
      const retiroUnid = parseFloat(row[12]) || 0;
      const retiroCosto = parseFloat(row[11]) || 0;
      const autoconsumoUnid = parseFloat(row[15]) || 0;
      const autoconsumoCosto = parseFloat(row[14]) || 0;

      if (entradaUnid > 0) {
        transacciones.push({
          product_id: product.id,
          type: 'entrada',
          quantity: entradaUnid,
          costo_unitario: entradaCosto,
          total_bolivares: entradaUnid * entradaCosto,
          date: fecha,
          factura: `Importación Histórica ${nombreHoja}`,
          destino: ''
        });
      }
      if (salidaUnid > 0) {
        transacciones.push({
          product_id: product.id,
          type: 'salida',
          quantity: salidaUnid,
          costo_unitario: salidaCosto,
          total_bolivares: salidaUnid * salidaCosto,
          date: fecha,
          factura: '',
          destino: `Venta Histórica ${nombreHoja}`
        });
      }
      if (retiroUnid > 0) {
        transacciones.push({
          product_id: product.id,
          type: 'perdida',
          quantity: retiroUnid,
          costo_unitario: retiroCosto,
          total_bolivares: retiroUnid * retiroCosto,
          date: fecha,
          factura: '',
          destino: `Retiro Histórico ${nombreHoja}`
        });
      }
      if (autoconsumoUnid > 0) {
        transacciones.push({
          product_id: product.id,
          type: 'consumo',
          quantity: autoconsumoUnid,
          costo_unitario: autoconsumoCosto,
          total_bolivares: autoconsumoUnid * autoconsumoCosto,
          date: fecha,
          factura: '',
          destino: `Autoconsumo Histórico ${nombreHoja}`
        });
      }
    }
  }

  // 3. También procesar las hojas principales (SEPT, OCT) para los saldos iniciales
  // Estructura Principal: Fila 10+ = datos
  // [0]=Código, [1]=Descripción, [2]=Costo, [3]=Unid, [4]=TotalBs (existencia inicial)
  // Las hojas SEPT y OCT solo tienen ~21 filas = encabezados + pocos productos

  const hojasPrincipales = ['SEPTIEMBRE', 'OCTUBRE'];
  for (const nombreHoja of hojasPrincipales) {
    console.log(`\n📄 Procesando saldos de: ${nombreHoja}`);
    const sheet = wb.Sheets[nombreHoja];
    const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Determinar fecha del mes
    let mesDate = '2025-09-01';
    if (nombreHoja === 'OCTUBRE') mesDate = '2025-10-01';

    for (let i = 10; i < raw.length; i++) {
      const row = raw[i];
      const codigo = row[0];
      const descripcion = row[1];
      
      if (!descripcion || typeof descripcion !== 'string') continue;
      if (String(codigo).includes('TOTAL') || String(descripcion).includes('TOTAL')) continue;
      
      const product = findProduct(descripcion);
      if (!product) {
        console.log(`   ⚠️ Producto NO encontrado: "${descripcion}" (${nombreHoja} Fila ${i})`);
        totalErrores++;
        continue;
      }

      // Entradas del mes
      const entradaUnid = parseFloat(row[7]) || 0;
      const entradaCosto = parseFloat(row[6]) || 0;
      if (entradaUnid > 0) {
        transacciones.push({
          product_id: product.id,
          type: 'entrada',
          quantity: entradaUnid,
          costo_unitario: entradaCosto,
          total_bolivares: entradaUnid * entradaCosto,
          date: mesDate,
          factura: `Importación Histórica ${nombreHoja}`,
          destino: ''
        });
      }

      // Salidas del mes  
      const salidaUnid = parseFloat(row[10]) || 0;
      const salidaCosto = parseFloat(row[9]) || 0;
      if (salidaUnid > 0) {
        transacciones.push({
          product_id: product.id,
          type: 'salida',
          quantity: salidaUnid,
          costo_unitario: salidaCosto,
          total_bolivares: salidaUnid * salidaCosto,
          date: mesDate,
          factura: '',
          destino: `Venta Histórica ${nombreHoja}`
        });
      }
    }
  }

  console.log(`\n📊 RESUMEN DE EXTRACCIÓN:`);
  console.log(`   Total de transacciones a insertar: ${transacciones.length}`);
  console.log(`   Errores (productos no encontrados): ${totalErrores}`);

  // 4. Insertar en lotes de 50
  const batchSize = 50;
  for (let i = 0; i < transacciones.length; i += batchSize) {
    const batch = transacciones.slice(i, i + batchSize);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) {
      console.error(`   ❌ Error en lote ${Math.floor(i/batchSize)+1}:`, error.message);
    } else {
      totalInsertados += batch.length;
      console.log(`   ✅ Lote ${Math.floor(i/batchSize)+1} insertado (${batch.length} registros)`);
    }
  }

  console.log(`\n🎊 ¡MIGRACIÓN HISTÓRICA COMPLETADA!`);
  console.log(`   ${totalInsertados} transacciones guardadas en Supabase.`);
  console.log(`   ${totalErrores} productos sin mapear (revisar manualmente).`);
}

migrarHistorico();
