// pages/ScenesPage.tsx
import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Briefcase, Plus } from "lucide-react"
import { dataService } from "@/services/dataService"
import { useToast } from "@/hooks/use-toast"
import { getTokenStore } from "@/utils/store"
import { validatenull } from "@/utils/validete"
import { redirectToOAuthLogin } from "@/api/auth"

const ScenesPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [scenes, setScenes] = useState<any[]>([])
  const [sceneStats, setSceneStats] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingScene, setEditingScene] = useState<any | null>(null)
  const [dialogName, setDialogName] = useState("")
  const [dialogDescription, setDialogDescription] = useState("")
  const [dialogProvince, setDialogProvince] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const accessToken = getTokenStore({ name: "access_token" })
    if (validatenull(accessToken)) {
      redirectToOAuthLogin()
      return
    }
    localStorage.removeItem("current_scene_id")
    localStorage.removeItem("current_scene_name")
    loadScenes()
  }, [])

  const loadScenes = () => {
    const allScenes = dataService.getAllScenes()
    setScenes(allScenes)

    const stats: Record<string, any> = {}
    allScenes.forEach((scene: any) => {
      stats[scene.id] = dataService.getSceneStats(scene.id)
    })
    setSceneStats(stats)
    setIsLoading(false)
  }

  const handleCreateScene = () => {
    if (validatenull(dialogName.trim())) {
      toast({ title: "请输入场景名称", variant: "destructive" })
      return
    }

    dataService.createScene({
      name: dialogName.trim(),
      description: dialogDescription.trim(),
      province: dialogProvince || undefined,
    })

    loadScenes()
    setIsDialogOpen(false)
    setDialogName("")
    setDialogDescription("")
    setDialogProvince("")

    toast({
      title: "创建成功",
      description: `场景"${dialogName}"已创建`,
    })
  }

  const handleUpdateScene = () => {
    if (editingScene && !validatenull(dialogName.trim())) {
      dataService.updateScene(editingScene.id, {
        name: dialogName.trim(),
        description: dialogDescription.trim(),
        province: dialogProvince || undefined,
      })
      loadScenes()
      toast({
        title: "更新成功",
        description: `场景"${dialogName}"已更新`,
      })
    }
    setIsDialogOpen(false)
    setEditingScene(null)
    setDialogName("")
    setDialogDescription("")
    setDialogProvince("")
  }

  const handleDeleteScene = (sceneId: string) => {
    if (scenes.length === 1) {
      toast({
        title: "无法删除",
        description: "至少需要保留一个场景",
        variant: "destructive",
      })
      return
    }

    const result = dataService.deleteScene(sceneId)
    if (result) {
      loadScenes()
      toast({
        title: "删除成功",
        description: "场景已删除",
      })
    }
  }

  const handleEnterScene = (sceneId: string) => {
    // 跳转到 Dashboard 页面，传递场景ID
    navigate(`/dashboard/${sceneId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="border-l-[3px] border-[#1890ff] pl-4">
            <h1 className="text-2xl font-semibold leading-8 text-slate-900">
              任务场景
            </h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              选择或创建一个场景，开始你的审核任务
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingScene(null)
              setDialogName("")
              setDialogDescription("")
              setDialogProvince("")
              setIsDialogOpen(true)
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            创建场景
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenes.map((scene) => (
            <Card
              key={scene.id}
              className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-500" />
                    <div>
                      <CardTitle className="text-xl">{scene.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {scene.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingScene(scene)
                        setDialogName(scene.name)
                        setDialogDescription(scene.description || "")
                        setDialogProvince(scene.province || "")
                        setIsDialogOpen(true)
                      }}>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteScene(scene.id)
                      }}
                      className="text-red-500 hover:text-red-700">
                      删除
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-2xl font-bold">
                        {sceneStats[scene.id]?.totalTasks || 0}
                      </p>
                      <p className="text-xs text-gray-500">任务数量</p>
                    </div>
                    {!validatenull(scene.province) && (
                      <Badge variant="outline">{scene.province}</Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => handleEnterScene(scene.id)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    进入工作台
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingScene ? "编辑场景" : "创建场景"}
              </DialogTitle>
              <DialogDescription>
                {editingScene
                  ? "修改场景的基本信息"
                  : "创建一个新的任务管理场景"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">场景名称 *</Label>
                <Input
                  id="name"
                  value={dialogName}
                  onChange={(e) => setDialogName(e.target.value)}
                  placeholder="例如：华东地区任务"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  value={dialogDescription}
                  onChange={(e) => setDialogDescription(e.target.value)}
                  placeholder="场景描述..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={editingScene ? handleUpdateScene : handleCreateScene}>
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default ScenesPage
