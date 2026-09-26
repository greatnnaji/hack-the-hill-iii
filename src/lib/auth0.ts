import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { OnCallbackHook } from "@auth0/nextjs-auth0/types";
import { NextResponse } from "next/server";
import { upsertUser } from "@/lib/users";

export function isAuthConfigured(): boolean {
  return [
    process.env.AUTH0_DOMAIN,
    process.env.AUTH0_CLIENT_ID,
    process.env.AUTH0_CLIENT_SECRET,
    process.env.AUTH0_SECRET,
    process.env.APP_BASE_URL,
  ].every(Boolean);
}

// Runs after Auth0 redirects back: saves the user row, then continues to the page they asked for.
export const onCallback: OnCallbackHook = async (error, ctx, session) => {
  if (error) {
    return new NextResponse(error.message, { status: 500 });
  }
  if (session) {
    try {
      await upsertUser({
        id: session.user.sub,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
      });
    } catch (upsertError) {
      console.error("Could not save the user row after login", upsertError);
    }
  }
  const base = ctx.appBaseUrl ?? process.env.APP_BASE_URL;
  if (!base) {
    return new NextResponse("APP_BASE_URL is not set", { status: 500 });
  }
  const appUrl = new URL(base);
  let destination: URL;
  try {
    destination = new URL(ctx.returnTo || "/", appUrl);
  } catch {
    destination = new URL("/", appUrl);
  }
  if (destination.origin !== appUrl.origin) {
    destination = new URL("/", appUrl);
  }
  return NextResponse.redirect(destination);
};

let client: Auth0Client | null = null;

// Created on first use so the dev bypass never builds a client with missing settings.
export function getAuth0(): Auth0Client {
  client ??= new Auth0Client({ onCallback });
  return client;
}
