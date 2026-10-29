import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/about")({ component: About })

function About() {
  return <div className="p-6">Hello from About!</div>
}
