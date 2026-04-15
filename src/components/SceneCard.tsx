// components/SceneCard.tsx
import React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Scene } from "@/types/scene"

interface SceneCardProps {
  scene: Scene
  taskCount: number
  onEnter: (sceneId: string) => void
  onEdit: (scene: Scene) => void
  onDelete: (sceneId: string) => void
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  taskCount,
  onEnter,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{scene.name}</CardTitle>
            <CardDescription className="mt-1">
              {scene.description}
            </CardDescription>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(scene)
              }}>
              编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(scene.id)
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
              <p className="text-2xl font-bold">{taskCount}</p>
              <p className="text-xs text-gray-500">任务数量</p>
            </div>
            {scene.province && (
              <div>
                <Badge variant="outline">{scene.province}</Badge>
              </div>
            )}
          </div>
          <Button
            onClick={() => onEnter(scene.id)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600">
            进入场景
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
