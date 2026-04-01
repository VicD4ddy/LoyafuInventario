import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Creamos el cliente usando las cookies de la petición entrante
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // Tratamos de obtener la sesión del usuario para refescar los tokens si expiran
  const { data: { user } } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')
  
  // Si no hay usuario en sesión y queremos ir a otra página diferente del login, expulsamos.
  if (!user && !isLoginPage) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Si hay usuario logueado en sesión, y trata de volver a la vista /login, mándalo al dashboard
  if (user && isLoginPage) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/'
    return NextResponse.redirect(dashUrl)
  }

  // Dejamos pasar la petición
  return supabaseResponse
}
