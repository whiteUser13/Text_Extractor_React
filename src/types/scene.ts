// types/scene.ts
export interface Scene {
  id: string
  name: string
  description: string
  province?: string
  groupName?: string
  taskCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface SceneWithTasks extends Scene {
  tasks: Task[]
}