import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const publicPaths = [
  '/',
  '/login',
  '/create-account',
  '/forgot-password',
  '/auth/callback',
  '/auth/reset-password',
  '/auth/auth-error',
  '/profile/:id',
];

export async function updateSession(request: NextRequest): Promise<NextResponse | void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is missing');
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const currentPath = request.nextUrl.pathname;

  const nextPath =
    currentPath === '/login' || currentPath === '/create-account'
      ? request.nextUrl.searchParams.get('next') || '/'
      : currentPath;

  const isPublicPath = publicPaths.some((path) => {
    const pattern = path.replace(':id', '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(currentPath);
  });

  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', currentPath);
    return NextResponse.redirect(url);
  }

  if (session && (currentPath === '/login' || currentPath === '/create-account')) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  return supabaseResponse;
}
