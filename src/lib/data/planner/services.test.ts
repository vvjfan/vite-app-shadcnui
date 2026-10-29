import { describe, expect, it } from "vitest"

import { TASKS } from "@/lib/data/planner/seed/tasks"
import { PROJECTS } from "@/lib/data/planner/seed/projects"
import { TEAM } from "@/lib/data/planner/seed/team"
import {
  computeReports,
  getTask,
  getTasks,
  indexById,
} from "@/lib/data/planner/services"
import { TASK_STATUS_ORDER } from "@/lib/data/planner/types"

describe("planner services", () => {
  it("getTasks resolves the full TASKS seed", async () => {
    expect(await getTasks()).toEqual(TASKS)
  })

  it("getTask resolves a known task by id", async () => {
    expect((await getTask("TASK-1024"))?.title).toBe("Ship responsive nav bar")
  })

  it("getTask resolves undefined for an unknown id", async () => {
    expect(await getTask("nope")).toBeUndefined()
  })

  it("indexById maps records by id", () => {
    const map = indexById(TEAM)
    expect(map["U-1"]?.name).toBe("Daniel Parker")
    expect(Object.keys(map)).toHaveLength(TEAM.length)
  })
})

describe("computeReports", () => {
  const report = computeReports(TASKS, PROJECTS, TEAM)

  it("counts completed tasks and completion rate", () => {
    const done = TASKS.filter((t) => t.status === "Done").length
    expect(report.completedTasks).toBe(done)
    expect(report.completionRate).toBe(Math.round((done / TASKS.length) * 100))
  })

  it("byStatus covers every status in board order and sums to the total", () => {
    expect(report.byStatus.map((s) => s.status)).toEqual(TASK_STATUS_ORDER)
    const sum = report.byStatus.reduce((n, s) => n + s.count, 0)
    expect(sum).toBe(TASKS.length)
  })

  it("byProject reports one row per project", () => {
    expect(report.byProject).toHaveLength(PROJECTS.length)
  })

  it("perMember reports one row per team member", () => {
    expect(report.perMember).toHaveLength(TEAM.length)
  })
})
