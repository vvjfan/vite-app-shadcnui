import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { signIn } from "@/lib/auth/session"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Item, ItemMedia } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { signInSchema } from "../lib/sign-in-schema"
import type { SignInValues } from "../lib/sign-in-schema"
import { AuthLogo } from "./auth-logo"
import {
  AUTH3_SOCIAL_PROVIDERS,
  AUTH3_TESTIMONIAL,
  AUTH3_TRUST_BRANDS,
} from "./data"
import { WaveDots } from "./wave-dots"
import { StarIcon, ArrowRightIcon } from "@phosphor-icons/react"

const SIGN_IN_FORM_ID = "auth-3-form"

function SidebarBackground() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {/* Dense dot grid with waves rippling out from random points (wave-dots). */}
      <WaveDots className="[mask-image:radial-gradient(86%_76%_at_50%_46%,black,transparent)] text-muted-foreground" />
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="relative flex min-h-[34rem] overflow-hidden border-border/70 bg-muted/25 px-8 py-10 sm:px-12 lg:min-h-svh lg:border-l lg:px-14 lg:py-12">
      {/* Sidebar */}
      <SidebarBackground />

      <div className="relative z-10 flex min-h-full w-full flex-col justify-between gap-10">
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1 text-primary">
            {Array.from({ length: AUTH3_TESTIMONIAL.stars }).map((_, index) => (
              <StarIcon
                aria-hidden="true"
                className="size-4 fill-current"
                key={index}
              />
            ))}
          </div>

          <blockquote className="mt-6 max-w-[28rem] text-[1.625rem] leading-[1.34] font-semibold text-balance">
            “{AUTH3_TESTIMONIAL.quote}”
          </blockquote>

          <div className="mt-5 flex w-full justify-center">
            <div className="flex min-w-0 items-center gap-1.5">
              <Avatar className="size-8">
                <AvatarImage
                  src={AUTH3_TESTIMONIAL.avatar}
                  alt={AUTH3_TESTIMONIAL.name}
                />
                <AvatarFallback>{AUTH3_TESTIMONIAL.fallback}</AvatarFallback>
              </Avatar>

              <div className="flex min-w-0 flex-col items-start gap-0 text-left">
                <div className="text-sm font-medium">
                  {AUTH3_TESTIMONIAL.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{AUTH3_TESTIMONIAL.role}</span>
                  <span
                    aria-hidden="true"
                    className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
                  />
                  <span>{AUTH3_TESTIMONIAL.company}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-sm font-medium text-foreground">
            Trusted by leading teams
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {AUTH3_TRUST_BRANDS.map((brand) => (
              <Item
                key={brand.id}
                className="flex w-auto items-center border-0 p-0 text-foreground/90"
              >
                <ItemMedia variant="icon" className="size-auto">
                  {brand.logo}
                </ItemMedia>
              </Item>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

// The block ships a presentational form; wired here to the simulated auth session.
// `redirect` is the sanitized path to land on after signing in (the guard's target).
export function Auth({ redirect }: { redirect: string }) {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)

  // Validate on blur, then live while the field is being corrected.
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  })

  // Simulated magic-link / social sign-in: set the session, then land on the target.
  function completeSignIn(input: { email?: string; provider?: string }) {
    setPending(true)
    signIn(input)
    void navigate({ to: redirect })
  }

  return (
    <div className="w-full lg:grid lg:min-h-svh lg:grid-cols-[minmax(0,1fr)_600px]">
      {/* Section */}
      <section className="flex min-h-svh items-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-8">
          <div className="flex flex-col gap-6">
            <AuthLogo />

            <div className="flex flex-col gap-2">
              <h1 className="text-3xl leading-tight font-semibold text-balance">
                Sign in
              </h1>
              <p className="text-base text-pretty text-muted-foreground">
                Enter your work email to get a magic link.
              </p>
            </div>
          </div>

          <form
            id={SIGN_IN_FORM_ID}
            className="flex flex-col gap-5"
            onSubmit={form.handleSubmit((values) =>
              completeSignIn({ email: values.email })
            )}
            noValidate
          >
            <FieldGroup className="gap-4">
              <Controller
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <Field
                    className="gap-2"
                    data-invalid={fieldState.invalid || undefined}
                  >
                    <FieldLabel htmlFor="auth-3-email">Work email</FieldLabel>
                    <Input
                      {...field}
                      id="auth-3-email"
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      className="bg-background"
                      aria-invalid={fieldState.invalid || undefined}
                      aria-describedby="auth-3-email-hint"
                    />
                    {/* The hint doubles as the error slot, so the description and
                        the message share one aria-describedby target. */}
                    {fieldState.error ? (
                      <FieldError
                        id="auth-3-email-hint"
                        errors={[fieldState.error]}
                      />
                    ) : (
                      <FieldDescription id="auth-3-email-hint">
                        Your magic link stays active for 15 minutes.
                      </FieldDescription>
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Sending..." : "Send magic link"}
              {!pending && (
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">
              Or continue with
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="grid gap-3">
            {AUTH3_SOCIAL_PROVIDERS.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="w-full justify-center px-4 [&_svg:not([class*='size-'])]:size-4"
                disabled={pending}
                onClick={() => completeSignIn({ provider: provider.id })}
              >
                {provider.logo}
                {provider.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Sidebar */}
      <Sidebar />
    </div>
  )
}
