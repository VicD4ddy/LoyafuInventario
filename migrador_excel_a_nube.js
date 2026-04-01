// script nativo
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

async function importExcel() {
  console.log("Iniciando migración Inteligente desde Excel a Supabase...");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log("Iniciando Sesión para pasar la Seguridad Bóveda (RLS)...");
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: 'karina@loyafu.com', password: 'karina@loyafu.com' });
  if(authErr) return console.error("Fallo Login Robot", authErr.message);

  const wb = xlsx.readFile('public/1_5064672954961365207.xlsx');
  
  const productsMap = new Map();

  // Mapeamos los meses oficiales excluyendo los "AUX" que son diarios irrelevantes
  const mainSheets = ['SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  for (const name of mainSheets) {
    if(!wb.Sheets[name]) continue;
    const data = xlsx.utils.sheet_to_json(wb.Sheets[name]);
    
    for (const row of data) {
      const codigo = String(row['EMPRESA'] || '').trim();
      const descripcion = String(row['INVERSIONES & SUMINISTROS LOYAFU, C. A.'] || '').trim();
      
      // Ignorar basurillas y encabezados oficiales
      if (!codigo || codigo === 'RIF' || !descripcion || descripcion.length < 3) continue;

      // Según nuestro informe forense, Diciembre almacenabe el saldo de Cierre aquí:
      const qty = parseFloat(row['__EMPTY_17']) || 0;
      const cost = parseFloat(row['__EMPTY_16']) || 0;

      // El diccionarió absorberá la última cantidad matemática que encuentre
      productsMap.set(codigo, {
        codigo,
        descripcion,
        qty: qty > 0 ? qty : 0, // Solo permitiremos saldos positivos de corte
        cost: cost > 0 ? cost : 0
      });
    }
  }

  console.log(`\n✅ Catálogo extraído: ${productsMap.size} Referencias Únicas de Productos Leyafu.`);

  // 1. Insertar a Supabase PostgreSQL via API (Pase Completo)
  let successCount = 0;
  for (const p of productsMap.values()) {
    // Buscar si ya existía para evitar colapsos
    const { data: existing } = await supabase.from('products').select('id').eq('codigo', p.codigo).single();
    
    let productId;
    if (!existing) {
      const { data: newProd, error: insertProdErr } = await supabase.from('products')
        .insert([{ codigo: p.codigo, descripcion: p.descripcion, marca: 'GENERICA', is_active: 1 }])
        .select().single();
      if(insertProdErr) {
        console.error("Error Catálogo:", p.codigo, insertProdErr.message);
        continue;
      }
      productId = newProd.id;
    } else {
      productId = existing.id;
    }

    // 2. Insertar transaccion de inventario base SOLO si traía existencias de Diciembre
    if (p.qty > 0) {
      const { error: txErr } = await supabase.from('transactions').insert([{
        product_id: productId,
        type: 'entrada',
        quantity: p.qty,
        date: new Date().toISOString().split('T')[0], // La fecha de la Resurección en la V4
        costo_unitario: p.cost,
        total_bolivares: p.qty * p.cost,
        factura: 'SALDO_MIGRADO_2026',
        destino: 'CORTE EXCEL SENIAT'
      }]);
      if(txErr) {
        console.error("Error Contable transpasando", p.codigo, txErr.message);
      } else {
        successCount++;
      }
    }
  }

  console.log(`\n✨ ¡Migración Total a la Nube Lograda!`);
  console.log(`   🔸 Productos con saldos de transferencia detectados y guardados: ${successCount}`);
}

importExcel().catch(console.error);
