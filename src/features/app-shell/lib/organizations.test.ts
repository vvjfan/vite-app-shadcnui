import { describe, expect, it } from "vitest"

import { WORKSPACES } from "@/features/app-shell/components/data"
import type { Workspace } from "@/features/app-shell/components/data"
import {
  logoAvatarFields,
  WORKSPACE_LOGOS,
} from "@/features/app-shell/components/workspace-logos"
import {
  activeWorkspace,
  addWorkspace,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInitials,
  renameWorkspace,
} from "@/features/app-shell/lib/organizations"

// ── Fixtures ──

const workspace = (overrides: Partial<Workspace> = {}): Workspace => ({
  id: "w1",
  name: "Acme",
  tier: "Pro",
  ...overrides,
})

const workspaces = (): Workspace[] => [
  workspace({ id: "w1", name: "Acme", imageUrl: "https://img.io/acme.png" }),
  workspace({ id: "w2", name: "Globex", logoId: "cursor" }),
  workspace({ id: "w3", name: "Initech" }),
]

// An id that resolves to a full-bleed image, and one that resolves to a drawn
// mark. The two take different branches of logoAvatarFields.
const IMAGE_LOGO = WORKSPACE_LOGOS.find((logo) => logo.imageUrl)!
const DRAWN_LOGO = WORKSPACE_LOGOS.find((logo) => !logo.imageUrl)!

// ── logoAvatarFields ──

describe("logoAvatarFields", () => {
  // AvatarImage paints over the AvatarFallback that holds the drawn mark, so a
  // record must never carry both. Whichever field the choice does not use has to
  // be written back as undefined, not simply left out, or the previous avatar
  // survives the spread and keeps painting.
  it("sets imageUrl and clears logoId for an image logo", () => {
    const fields = logoAvatarFields(IMAGE_LOGO.id)
    expect(fields.imageUrl).toBe(IMAGE_LOGO.imageUrl)
    expect(fields.logoId).toBeUndefined()
    expect("logoId" in fields).toBe(true)
  })

  it("sets logoId and clears imageUrl for a drawn mark", () => {
    const fields = logoAvatarFields(DRAWN_LOGO.id)
    expect(fields.logoId).toBe(DRAWN_LOGO.id)
    expect(fields.imageUrl).toBeUndefined()
    expect("imageUrl" in fields).toBe(true)
  })

  it("resolves every logo the picker offers to exactly one of the two", () => {
    for (const logo of WORKSPACE_LOGOS) {
      const fields = logoAvatarFields(logo.id)
      const usesImage = fields.imageUrl !== undefined
      const usesMark = fields.logoId !== undefined
      expect(usesImage || usesMark).toBe(true)
      expect(usesImage && usesMark).toBe(false)
    }
  })

  // An empty object means "change nothing", which is how a caller spreading the
  // result leaves the existing avatar alone.
  it("returns nothing to apply for an unknown id", () => {
    expect(logoAvatarFields("nope")).toEqual({})
  })
})

// ── Create ──

describe("createWorkspace", () => {
  it("keeps the name and files the organization on the free tier", () => {
    const created = createWorkspace({ name: "Acme", logoId: null })
    expect(created.name).toBe("Acme")
    expect(created.tier).toBe("Free")
  })

  it("carries the image of an image logo", () => {
    const created = createWorkspace({ name: "Acme", logoId: IMAGE_LOGO.id })
    expect(created.imageUrl).toBe(IMAGE_LOGO.imageUrl)
    expect(created.logoId).toBeUndefined()
  })

  it("carries the id of a drawn mark and no image", () => {
    const created = createWorkspace({ name: "Acme", logoId: DRAWN_LOGO.id })
    expect(created.logoId).toBe(DRAWN_LOGO.id)
    expect(created.imageUrl).toBeUndefined()
  })

  // No logo at all is legal: the avatar falls back to the initial.
  it("leaves both avatar fields unset when no logo was picked", () => {
    const created = createWorkspace({ name: "Acme", logoId: null })
    expect(created.imageUrl).toBeUndefined()
    expect(created.logoId).toBeUndefined()
  })

  it("never repeats an id", () => {
    const ids = Array.from(
      { length: 200 },
      (_, n) => createWorkspace({ name: `Org ${n}`, logoId: null }).id
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  // renameWorkspace and deleteWorkspace both key on the id, so a generated id
  // that collided with a seed id would edit or remove the wrong organization.
  it("cannot collide with a seeded id", () => {
    const seedIds = new Set(WORKSPACES.map((w) => w.id))
    for (let n = 0; n < 50; n++) {
      expect(seedIds.has(createWorkspace({ name: "X", logoId: null }).id)).toBe(
        false
      )
    }
  })
})

describe("addWorkspace", () => {
  it("appends, so the menu order matches creation order", () => {
    const next = addWorkspace(
      workspaces(),
      workspace({ id: "w4", name: "New" })
    )
    expect(next.map((w) => w.id)).toEqual(["w1", "w2", "w3", "w4"])
  })

  it("returns a new array and does not mutate the input", () => {
    const source = workspaces()
    const next = addWorkspace(source, workspace({ id: "w4" }))
    expect(next).not.toBe(source)
    expect(source).toHaveLength(3)
  })

  it("does not mutate the real seed", () => {
    const before = structuredClone(WORKSPACES)
    addWorkspace(WORKSPACES, workspace({ id: "w4" }))
    expect(WORKSPACES).toEqual(before)
  })
})

// ── Rename ──

describe("renameWorkspace", () => {
  it("renames only the target", () => {
    const next = renameWorkspace(workspaces(), "w2", {
      name: "Globex Inc",
      logoId: null,
    })
    expect(next.map((w) => w.name)).toEqual(["Acme", "Globex Inc", "Initech"])
  })

  // A null logoId is the picker's "keep current" option, which is how the three
  // seeded organizations hold on to their remote image through a rename.
  it("leaves the avatar untouched when no logo was picked", () => {
    const next = renameWorkspace(workspaces(), "w1", {
      name: "Acme Inc",
      logoId: null,
    })
    expect(next[0].imageUrl).toBe("https://img.io/acme.png")
    expect(next[0].logoId).toBeUndefined()
  })

  it("swapping to a drawn mark clears the image that would paint over it", () => {
    const next = renameWorkspace(workspaces(), "w1", {
      name: "Acme",
      logoId: DRAWN_LOGO.id,
    })
    expect(next[0].logoId).toBe(DRAWN_LOGO.id)
    expect(next[0].imageUrl).toBeUndefined()
  })

  it("swapping to an image logo clears the drawn mark", () => {
    const next = renameWorkspace(workspaces(), "w2", {
      name: "Globex",
      logoId: IMAGE_LOGO.id,
    })
    expect(next[1].imageUrl).toBe(IMAGE_LOGO.imageUrl)
    expect(next[1].logoId).toBeUndefined()
  })

  it("keeps every other field of the renamed record", () => {
    const next = renameWorkspace(workspaces(), "w3", {
      name: "Initech Ltd",
      logoId: null,
    })
    expect(next[2]).toEqual({ id: "w3", name: "Initech Ltd", tier: "Pro" })
  })

  it("changes nothing for an unknown id", () => {
    const source = workspaces()
    expect(
      renameWorkspace(source, "nope", { name: "X", logoId: null })
    ).toEqual(source)
  })

  it("does not mutate the input or the real seed", () => {
    const source = workspaces()
    renameWorkspace(source, "w1", { name: "Changed", logoId: DRAWN_LOGO.id })
    expect(source[0].name).toBe("Acme")
    expect(source[0].imageUrl).toBe("https://img.io/acme.png")

    const before = structuredClone(WORKSPACES)
    renameWorkspace(WORKSPACES, WORKSPACES[0].id, {
      name: "Changed",
      logoId: DRAWN_LOGO.id,
    })
    expect(WORKSPACES).toEqual(before)
  })
})

// ── Delete ──

describe("deleteWorkspace", () => {
  it("removes only the target and reports what went", () => {
    const next = deleteWorkspace(workspaces(), "w2", "w1")
    expect(next.workspaces.map((w) => w.id)).toEqual(["w1", "w3"])
    expect(next.deleted?.name).toBe("Globex")
  })

  it("leaves the active organization alone when another one is deleted", () => {
    expect(deleteWorkspace(workspaces(), "w2", "w1").activeId).toBe("w1")
  })

  // Deleting the organization you are in has to land you somewhere, or the
  // sidebar header would be pointing at a record that no longer exists.
  it("switches to the first survivor when the active one is deleted", () => {
    expect(deleteWorkspace(workspaces(), "w1", "w1").activeId).toBe("w2")
  })

  it("switches to the survivor even when the deleted one was last in the list", () => {
    expect(deleteWorkspace(workspaces(), "w3", "w3").activeId).toBe("w1")
  })

  // The workspace always renders one organization, so the last cannot go. The
  // manage dialog also disables the control, but this is the real guard.
  it("refuses to delete the last organization", () => {
    const source = [workspace({ id: "only" })]
    const next = deleteWorkspace(source, "only", "only")
    expect(next.deleted).toBeNull()
    expect(next.workspaces).toBe(source)
    expect(next.activeId).toBe("only")
  })

  it("refuses an unknown id", () => {
    const source = workspaces()
    const next = deleteWorkspace(source, "nope", "w1")
    expect(next.deleted).toBeNull()
    expect(next.workspaces).toBe(source)
    expect(next.activeId).toBe("w1")
  })

  it("returns a new array and does not mutate the input", () => {
    const source = workspaces()
    const next = deleteWorkspace(source, "w1", "w1")
    expect(next.workspaces).not.toBe(source)
    expect(source).toHaveLength(3)
  })

  it("does not mutate the real seed", () => {
    const before = structuredClone(WORKSPACES)
    deleteWorkspace(WORKSPACES, WORKSPACES[0].id, WORKSPACES[0].id)
    expect(WORKSPACES).toEqual(before)
  })

  // Deleting down to one, from the real seed, is the path to the guard.
  it("lets the seeded organizations go one at a time until one is left", () => {
    let list: Workspace[] = [...WORKSPACES]
    let activeId = WORKSPACES[0].id
    while (list.length > 1) {
      const next = deleteWorkspace(list, list[0].id, activeId)
      expect(next.deleted).not.toBeNull()
      list = next.workspaces
      activeId = next.activeId
    }
    expect(list).toHaveLength(1)
    expect(activeId).toBe(list[0].id)
    expect(deleteWorkspace(list, list[0].id, activeId).deleted).toBeNull()
  })
})

// ── Selection ──

describe("activeWorkspace", () => {
  it("finds the organization by id", () => {
    expect(activeWorkspace(workspaces(), "w2").name).toBe("Globex")
  })

  // A stale id would otherwise render an empty header; the first organization is
  // the same fallback the delete path lands on.
  it("falls back to the first for an unknown id", () => {
    expect(activeWorkspace(workspaces(), "nope").id).toBe("w1")
  })

  it("resolves the menu's default id against the real seed", () => {
    expect(activeWorkspace(WORKSPACES, "claude").name).toBe("Claude")
  })
})

describe("getWorkspaceInitials", () => {
  it("uppercases the first letter", () => {
    expect(getWorkspaceInitials("acme")).toBe("A")
  })

  it("already-uppercase names are unchanged", () => {
    expect(getWorkspaceInitials("Acme")).toBe("A")
  })

  it("takes the first character whatever it is", () => {
    expect(getWorkspaceInitials("1Password")).toBe("1")
  })

  // The dialog blocks an empty name, so this only documents that an empty
  // fallback is returned rather than throwing.
  it("returns nothing for an empty name", () => {
    expect(getWorkspaceInitials("")).toBe("")
  })

  it("initials every seeded organization", () => {
    for (const seeded of WORKSPACES) {
      expect(getWorkspaceInitials(seeded.name)).toBe(
        seeded.name.charAt(0).toUpperCase()
      )
    }
  })
})
