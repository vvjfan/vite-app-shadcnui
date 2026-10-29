import type { ReactNode } from "react"

import type { FileMetadata } from "@/hooks/use-file-upload"
import {
  BuildingsIcon as Building2Icon,
  CreditCardIcon,
  SlidersHorizontalIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react"

export type ProfileDialogTab =
  "profile" | "workspace" | "team" | "billing" | "preferences"

export interface ProfileDialogTabRecord {
  value: ProfileDialogTab
  label: string
  title: string
  description: string
  icon: ReactNode
}

export interface ProfileSelectOption {
  value: string
  label: string
  description: string
}

export interface ProfileIdentity {
  name: string
  email: string
  username: string
  role: string
  timezone: string
  website: string
  bio: string
  avatarAlt: string
  initials: string
  avatarFile: FileMetadata
}

export interface WorkspaceIdentity {
  name: string
  subdomain: string
  domainSuffix: string
  supportEmail: string
  inviteDomain: string
  logoAlt: string
  logoFallback: string
  logoFile: FileMetadata
}

export interface BillingIdentity {
  billingEmail: string
  legalName: string
  taxId: string
  purchaseOrder: string
}

export const PROFILE_DIALOG_SURFACE = {
  uploadAvatarLabel: "Upload profile avatar",
  uploadWorkspaceLogoLabel: "Upload workspace logo",
  changeImageLabel: "Change",
  changeImageTooltip: "JPG or PNG. Square works best.",
  removeImageLabel: "Remove",
  removeImageTooltip: "Clears the image; shows initials.",
  verifiedLabel: "Verified",
  verifiedTooltip: "Confirmed for sign-in and account recovery.",
  publicDetailsTooltip:
    "Role, time zone, and website show on your public profile.",
  currentLabel: "Current",
  profilePhotoLabel: "Profile photo",
  profilePhotoDescription: "Shown in comments and mentions.",
  nameLabel: "Full name",
  nameDescription: "Used across ReUI.",
  emailLabel: "Email address",
  emailDescription: "Primary sign-in email.",
  usernameLabel: "Username",
  usernameDescription: "Used in mentions and links.",
  publicDetailsLabel: "Public details",
  publicDetailsDescription: "Shown across ReUI.",
  roleLabel: "Role",
  timezoneLabel: "Time zone",
  websiteLabel: "Website",
  bioLabel: "Bio",
  bioDescription: "Short profile summary.",
  workspaceLogoLabel: "Workspace logo",
  workspaceLogoDescription: "Used in navigation and shared links.",
  workspaceNameLabel: "Workspace name",
  workspaceUrlLabel: "Workspace URL",
  workspaceUrlDescription: "Link for teammates and clients.",
  supportEmailLabel: "Support email",
  supportEmailDescription: "Shown on help surfaces.",
  defaultLandingLabel: "Default landing view",
  defaultLandingDescription: "Choose where teammates start.",
  externalSharingLabel: "External sharing",
  externalSharingDescription: "Create client-safe links.",
  inviteDomainLabel: "Invite domain",
  inviteDomainDescription: "Approved email domain.",
  defaultRoleLabel: "Default role",
  defaultRoleDescription: "Applied to new invited members.",
  inviteApprovalsLabel: "Invite approvals",
  inviteApprovalsDescription: "Require owner review.",
  memberInvitesLabel: "Member invites",
  memberInvitesDescription: "Let members invite teammates.",
  teamVisibilityLabel: "Team visibility",
  teamVisibilityDescription: "Control profile discovery.",
  planLabel: "Plan",
  planDescription: "Current billing package.",
  billingEmailLabel: "Billing email",
  billingEmailDescription: "Receives invoices.",
  legalNameLabel: "Legal name",
  legalNameDescription: "Displayed on receipts.",
  taxIdLabel: "Tax ID",
  taxIdDescription: "Optional business tax reference.",
  purchaseOrderLabel: "Purchase order",
  purchaseOrderDescription: "Attached to invoices.",
  spendLimitLabel: "Spend limit",
  spendLimitDescription: "Alert before the threshold.",
  invoiceCadenceLabel: "Invoice cadence",
  invoiceCadenceDescription: "Choose statement timing.",
  paymentApprovalLabel: "Payment approval",
  paymentApprovalDescription: "Review plan changes.",
  themeLabel: "Theme",
  themeDescription: "Choose the interface tone.",
  smoothCursorLabel: "Smooth cursor",
  smoothCursorDescription: "Softer pointer motion.",
  languageLabel: "Language",
  languageDescription: "Set product language.",
  weekStartLabel: "First day of week",
  weekStartDescription: "Controls calendar layout.",
  digestLabel: "Digest cadence",
  digestDescription: "Pick summary timing.",
  cancelLabel: "Cancel",
  saveLabel: "Save changes",
} as const

export const PROFILE_IDENTITY: ProfileIdentity = {
  name: "Nick Bold",
  email: "nick@reui.io",
  username: "nickbold",
  role: "Staff Product Lead",
  timezone: "(GMT-5) New York",
  website: "nick.reui.io",
  bio: "Leading launch systems, product operations, and internal tooling across the ReUI workspace.",
  avatarAlt: "Nick Bold profile photo",
  initials: "NB",
  avatarFile: {
    id: "profile-avatar",
    name: "nick-bold.jpg",
    size: 144000,
    type: "image/jpeg",
    url: "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=160&h=160&dpr=2&q=80",
  },
}

export const WORKSPACE_IDENTITY: WorkspaceIdentity = {
  name: "ReUI",
  subdomain: "hq",
  domainSuffix: ".reui.io",
  supportEmail: "support@reui.io",
  inviteDomain: "reui.io",
  logoAlt: "ReUI workspace logo",
  logoFallback: "RE",
  logoFile: {
    id: "workspace-logo",
    name: "reui-logo.jpg",
    size: 82000,
    type: "image/jpeg",
    url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=160&h=160&fit=crop&dpr=2&q=80",
  },
}

export const BILLING_IDENTITY: BillingIdentity = {
  billingEmail: "ap@reui.io",
  legalName: "ReUI Inc.",
  taxId: "US-82-1847291",
  purchaseOrder: "PO-2026-0412",
}

export const PROFILE_DIALOG_TABS: ProfileDialogTabRecord[] = [
  {
    value: "profile",
    label: "Profile",
    title: "Profile",
    description: "Manage your account identity.",
    icon: <UserIcon aria-hidden="true" />,
  },
  {
    value: "workspace",
    label: "Workspace",
    title: "Workspace",
    description: "Update brand and sharing defaults.",
    icon: <Building2Icon aria-hidden="true" />,
  },
  {
    value: "team",
    label: "Team",
    title: "Team",
    description: "Set member access defaults.",
    icon: <UsersIcon aria-hidden="true" />,
  },
  {
    value: "billing",
    label: "Billing",
    title: "Billing",
    description: "Manage plan and invoice settings.",
    icon: <CreditCardIcon aria-hidden="true" />,
  },
  {
    value: "preferences",
    label: "Preferences",
    title: "Preferences",
    description: "Tune your workspace behavior.",
    icon: <SlidersHorizontalIcon aria-hidden="true" />,
  },
]

export const ROLE_OPTIONS: ProfileSelectOption[] = [
  {
    value: "staff-product-lead",
    label: "Staff Product Lead",
    description: "Owns product operations",
  },
  {
    value: "product-manager",
    label: "Product Manager",
    description: "Drives roadmap execution",
  },
  {
    value: "design-lead",
    label: "Design Lead",
    description: "Owns system quality",
  },
]

export const TIMEZONE_OPTIONS: ProfileSelectOption[] = [
  {
    value: "new-york",
    label: "(GMT-5) New York",
    description: "Eastern team coverage",
  },
  {
    value: "los-angeles",
    label: "(GMT-8) Los Angeles",
    description: "Pacific team coverage",
  },
  {
    value: "london",
    label: "(GMT+0) London",
    description: "Europe team coverage",
  },
  {
    value: "singapore",
    label: "(GMT+8) Singapore",
    description: "APAC team coverage",
  },
]

export const LANDING_VIEW_OPTIONS: ProfileSelectOption[] = [
  {
    value: "home",
    label: "Home overview",
    description: "Recent activity first",
  },
  {
    value: "pipeline",
    label: "Pipeline board",
    description: "Jump into execution",
  },
  {
    value: "inbox",
    label: "Priority inbox",
    description: "Focus on approvals",
  },
]

export const ACCESS_ROLE_OPTIONS: ProfileSelectOption[] = [
  {
    value: "member",
    label: "Member",
    description: "Standard workspace access",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Manage team settings",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only workspace access",
  },
]

export const TEAM_VISIBILITY_OPTIONS: ProfileSelectOption[] = [
  {
    value: "workspace",
    label: "Workspace visible",
    description: "All teammates can discover profiles",
  },
  {
    value: "department",
    label: "Department only",
    description: "Limit discovery to groups",
  },
  {
    value: "private",
    label: "Private",
    description: "Hide directory discovery",
  },
]

export const PLAN_OPTIONS: ProfileSelectOption[] = [
  {
    value: "business",
    label: "Business",
    description: "Current workspace plan",
  },
  {
    value: "scale",
    label: "Scale",
    description: "Advanced governance",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    description: "Custom controls",
  },
]

export const SPEND_LIMIT_OPTIONS: ProfileSelectOption[] = [
  {
    value: "250",
    label: "$250 monthly",
    description: "Alert before $250",
  },
  {
    value: "500",
    label: "$500 monthly",
    description: "Alert before $500",
  },
  {
    value: "1000",
    label: "$1,000 monthly",
    description: "Alert before $1,000",
  },
]

export const INVOICE_CADENCE_OPTIONS: ProfileSelectOption[] = [
  {
    value: "monthly",
    label: "Monthly",
    description: "Send every month",
  },
  {
    value: "quarterly",
    label: "Quarterly",
    description: "Bundle by quarter",
  },
  {
    value: "annual",
    label: "Annual",
    description: "One yearly statement",
  },
]

export const THEME_OPTIONS: ProfileSelectOption[] = [
  {
    value: "system",
    label: "System",
    description: "Follow device setting",
  },
  {
    value: "light",
    label: "Light",
    description: "Bright workspace tone",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-light workspace tone",
  },
]

export const LANGUAGE_OPTIONS: ProfileSelectOption[] = [
  {
    value: "en-us",
    label: "English (US)",
    description: "Default product language",
  },
  {
    value: "en-gb",
    label: "English (UK)",
    description: "Regional spelling",
  },
  {
    value: "de",
    label: "German",
    description: "Regional operations",
  },
]

export const WEEK_START_OPTIONS: ProfileSelectOption[] = [
  {
    value: "monday",
    label: "Monday",
    description: "Operational week start",
  },
  {
    value: "sunday",
    label: "Sunday",
    description: "Calendar week start",
  },
]

export const DIGEST_OPTIONS: ProfileSelectOption[] = [
  {
    value: "weekday-am",
    label: "Weekday mornings",
    description: "Sent before standup",
  },
  {
    value: "daily-pm",
    label: "Daily evenings",
    description: "Wrap the workday",
  },
  {
    value: "weekly",
    label: "Weekly summary",
    description: "Monday planning recap",
  },
]
