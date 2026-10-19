import { Button } from "@/components/ui/button"
import { Badge } from "@/components/reui/badge"
import { Kbd } from "@/components/ui/kbd"

export function App() {
  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Project ready!</h1>
          <p>You may now add components and start building.</p>
          <p>We&apos;ve already added the button component for you.</p>
          <p>这是正文内容。当我们在 Tailwind v4 引擎中重写了 <code className="font-mono">--font-sans</code> 变量后，页面将会自动首选苹方（PingFang SC）或微软雅黑（Microsoft YaHei）进行完美的跨平台中文渲染。</p>
          <div className="my-2 flex gap-2">
            <Badge>默认</Badge>
            <Badge variant="destructive">错误</Badge>
            <Badge variant="success">成功</Badge>
            <Badge variant="warning">警告</Badge>
            <Badge variant="info">信息</Badge>
          </div>
          <div className="my-2 flex gap-2">
            <Badge variant="primary-light">默认</Badge>
            <Badge variant="destructive-light">错误</Badge>
            <Badge variant="success-light">成功</Badge>
            <Badge variant="warning-light">警告</Badge>
            <Badge variant="info-light">信息</Badge>
          </div>
          <div className="my-2 flex gap-2">
            <Button>Button</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          (Press <Kbd>d</Kbd> to toggle dark mode)
        </div>
      </div>
    </div>
  )
}

export default App
