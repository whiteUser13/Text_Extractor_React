import { createContext, useContext, useState } from "react"
import type { Task } from "@/types"

type TaskContextType = {
  selectedTaskId: string
  setSelectedTaskId: (id: string) => void
  selectedTask: Task | null
  setSelectedTask: (task: Task | null) => void
}
interface TaskProviderProps {
  children: React.ReactNode
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export const TaskProvider = ({ children }: TaskProviderProps) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  return (
    <TaskContext.Provider
      value={{
        selectedTaskId,
        setSelectedTaskId,
        selectedTask,
        setSelectedTask,
      }}>
      {children}
    </TaskContext.Provider>
  )
}

// 一个方便在组件中使用的 hook
export const useTaskStore = () => {
  const ctx = useContext(TaskContext)
  if (!ctx) {
    throw new Error("useTaskStore must be used inside <TaskProvider>")
  }
  return ctx
}
