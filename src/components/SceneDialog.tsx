// components/SceneDialog.tsx
import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Scene } from "@/types/scene"

interface SceneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scene?: Scene | null
  onSave: (sceneData: Partial<Scene>) => void
}

export const SceneDialog: React.FC<SceneDialogProps> = ({
  open,
  onOpenChange,
  scene,
  onSave,
}) => {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [province, setProvince] = useState("")

  useEffect(() => {
    if (scene) {
      setName(scene.name)
      setDescription(scene.description)
      setProvince(scene.province || "")
    } else {
      setName("")
      setDescription("")
      setProvince("")
    }
  }, [scene, open])

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim(),
      province: province || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{scene ? "编辑场景" : "创建场景"}</DialogTitle>
          <DialogDescription>
            {scene ? "修改场景的基本信息" : "创建一个新的任务管理场景"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">场景名称 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：华东地区任务"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="场景描述..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="province">关联省份（可选）</Label>
            <Input
              id="province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="例如：浙江省"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}