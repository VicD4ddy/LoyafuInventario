const { createClient } = require('@supabase/supabase-js');

async function limpiar() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  const { error: authErr } = await s.auth.signInWithPassword({ email: 'karina@loyafu.com', password: 'karina@loyafu.com' });
  if (authErr) { console.error('Login falló:', authErr.message); return; }
  console.log('Login OK. Iniciando limpieza...');

  // Nombres que NO son productos reales (son metadatos del Excel viejo)
  const basura = ['DIRECCION FISCAL', 'FECHA', 'BASE LEGAL', 'CODIGO'];

  for (const codigo of basura) {
    const { error } = await s.from('products').delete().eq('codigo', codigo);
    console.log(`  ${codigo}: ${error ? 'ERROR - ' + error.message : '✅ ELIMINADO'}`);
  }

  // También eliminar cualquier producto cuyo código tenga espacios largos o sea claramente basura
  const { data: todos } = await s.from('products').select('id, codigo, descripcion');
  if (todos) {
    for (const p of todos) {
      // Si el código mide más de 20 caracteres o contiene frases largas, no es un código real
      if (p.codigo && (p.codigo.length > 20 || p.codigo.includes(' DE ') || p.codigo.includes('ARTICULO'))) {
        const { error } = await s.from('products').delete().eq('id', p.id);
        console.log(`  BASURA DETECTADA "${p.codigo.substring(0,30)}...": ${error ? 'ERROR' : '✅ ELIMINADO'}`);
      }
    }
  }

  console.log('\n🧹 Limpieza finalizada.');
}

limpiar();
