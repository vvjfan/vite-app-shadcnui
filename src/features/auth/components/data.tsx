import type { ReactNode } from "react"

import { Apple } from "@/components/ui/svgs/apple"
import { AppleDark } from "@/components/ui/svgs/appleDark"
import { GithubDark } from "@/components/ui/svgs/githubDark"
import { GithubLight } from "@/components/ui/svgs/githubLight"
import { Google } from "@/components/ui/svgs/google"
import { OpenaiWordmarkDark } from "@/components/ui/svgs/openaiWordmarkDark"
import { OpenaiWordmarkLight } from "@/components/ui/svgs/openaiWordmarkLight"
import { SlackWordmark } from "@/components/ui/svgs/slackWordmark"
import { StripeWordmark } from "@/components/ui/svgs/stripeWordmark"
import { SupabaseWordmarkDark } from "@/components/ui/svgs/supabaseWordmarkDark"
import { SupabaseWordmarkLight } from "@/components/ui/svgs/supabaseWordmarkLight"

export type AuthProvider = {
  id: string
  label: string
  logo: ReactNode
}

export type TrustBrand = {
  id: string
  logo: ReactNode
}

export type Testimonial = {
  quote: string
  name: string
  role: string
  company: string
  avatar: string
  fallback: string
  stars: number
}

function ThemeLogo({ light, dark }: { light: ReactNode; dark: ReactNode }) {
  return (
    <>
      <span aria-hidden="true" className="dark:hidden">
        {light}
      </span>
      <span aria-hidden="true" className="hidden dark:block">
        {dark}
      </span>
    </>
  )
}

export const AUTH3_SOCIAL_PROVIDERS: AuthProvider[] = [
  {
    id: "google",
    label: "Continue with Google",
    logo: <Google aria-hidden="true" data-icon="inline-start" />,
  },
  {
    id: "apple",
    label: "Continue with Apple",
    logo: (
      <ThemeLogo
        light={<Apple aria-hidden="true" data-icon="inline-start" />}
        dark={<AppleDark aria-hidden="true" data-icon="inline-start" />}
      />
    ),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    logo: (
      <ThemeLogo
        light={<GithubLight aria-hidden="true" data-icon="inline-start" />}
        dark={<GithubDark aria-hidden="true" data-icon="inline-start" />}
      />
    ),
  },
]

export const AUTH3_TRUST_BRANDS: TrustBrand[] = [
  {
    id: "openai",
    logo: (
      <ThemeLogo
        light={
          <OpenaiWordmarkLight aria-hidden="true" className="h-4 w-auto" />
        }
        dark={<OpenaiWordmarkDark aria-hidden="true" className="h-4 w-auto" />}
      />
    ),
  },
  {
    id: "stripe",
    logo: <StripeWordmark aria-hidden="true" className="h-4 w-auto" />,
  },
  {
    id: "supabase",
    logo: (
      <ThemeLogo
        light={
          <SupabaseWordmarkLight aria-hidden="true" className="h-4 w-auto" />
        }
        dark={
          <SupabaseWordmarkDark aria-hidden="true" className="h-4 w-auto" />
        }
      />
    ),
  },
  {
    id: "slack",
    logo: (
      <SlackWordmark
        aria-hidden="true"
        className="h-4 w-auto text-foreground"
      />
    ),
  },
]

export const AUTH3_TESTIMONIAL: Testimonial = {
  quote: "The best login pages disappear. This one already feels fast.",
  name: "Sean Bold",
  role: "Co-founder",
  company: "ReUI",
  avatar:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
  fallback: "SB",
  stars: 5,
}
