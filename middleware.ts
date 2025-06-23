import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow access to auth pages and verification pages
    const allowedPaths = [
      '/login',
      '/register', 
      '/verify-email',
      '/forgot-password',
      '/reset-password',
      '/api/auth',
      '/api/verify-email',
      '/api/resend-verification',
      '/',
      '/premium/pricing' // Allow viewing pricing when not logged in
    ];

    const isAllowedPath = allowedPaths.some(path => 
      req.nextUrl.pathname.startsWith(path)
    );

    if (isAllowedPath) {
      return NextResponse.next();
    }

    // Check if user is authenticated
    if (!req.nextauth.token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if email is verified for email/password users
    // Social login users (Google/Discord) are automatically verified
    const hasImage = req.nextauth.token.picture || req.nextauth.token.image;
    const isEmailVerified = req.nextauth.token.email_verified;

    // If user doesn't have a profile image (likely email signup) and email is not verified
    if (!hasImage && !isEmailVerified) {
      return NextResponse.redirect(
        new URL('/verify-email?message=Please verify your email to continue', req.url)
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true, // Let the middleware function handle authorization
    },
  }
);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
