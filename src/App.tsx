import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import './App.css'
import taskApi, { TodoItem } from './services/contentful'

function App() {
  const [tasks, setTasks] = useState<TodoItem[]>([])
  const [taskInput, setTaskInput] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [tasksPerPage] = useState<number>(5)

  // 初期ロード
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true)
        const taskData = await taskApi.getAllTasks()
        setTasks(taskData)
        setError(null)
      } catch (err) {
        console.error('データの取得に失敗しました:', err)
        setError('タスクの読み込みに失敗しました。後でもう一度お試しください。')
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  const [addingTask, setAddingTask] = useState<boolean>(false)

  const addTask = async (e: FormEvent) => {
    e.preventDefault()
    if (taskInput.trim() === '' || addingTask) return

    try {
      setAddingTask(true)
      setLoading(true)
      const newTask = await taskApi.createTask(taskInput)
      setTasks([...tasks, newTask])
      setTaskInput('')
      setError(null)
    } catch (err) {
      console.error('タスクの追加に失敗しました:', err)
      setError('タスクの追加に失敗しました。後でもう一度お試しください。')
    } finally {
      setLoading(false)
      // Add a small delay before allowing another submission to prevent accidental double-clicks
      setTimeout(() => {
        setAddingTask(false)
      }, 500)
    }
  }

  // Track in-progress operations
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({})

  const toggleComplete = async (id: string) => {
    // Prevent toggling if already in progress for this task
    if (pendingToggles[id]) return

    try {
      const taskToToggle = tasks.find(task => task.id === id)
      if (!taskToToggle) return

      // Mark this task as pending
      setPendingToggles(prev => ({ ...prev, [id]: true }))

      // 楽観的UI更新（即時反映）
      setTasks(tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      ))

      // バックエンド更新
      await taskApi.toggleTaskCompletion(id, taskToToggle.completed)
    } catch (err) {
      console.error('タスクの更新に失敗しました:', err)
      setError('タスクの更新に失敗しました。後でもう一度お試しください。')

      // エラー時に元に戻す
      const taskData = await taskApi.getAllTasks()
      setTasks(taskData)
    } finally {
      // Reset pending status for this task
      setPendingToggles(prev => ({ ...prev, [id]: false }))
    }
  }

  // Track tasks being deleted
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, boolean>>({})

  const deleteTask = async (id: string) => {
    // Prevent duplicate deletes
    if (pendingDeletes[id]) return
    
    try {
      // Mark as pending
      setPendingDeletes(prev => ({ ...prev, [id]: true }))
      
      // 楽観的UI更新
      setTasks(tasks.filter(task => task.id !== id))

      // バックエンド削除
      await taskApi.deleteTask(id)
    } catch (err) {
      console.error('タスクの削除に失敗しました:', err)
      setError('タスクの削除に失敗しました。後でもう一度お試しください。')

      // エラー時に元に戻す
      const taskData = await taskApi.getAllTasks()
      setTasks(taskData)
    } finally {
      // Reset pending status
      setPendingDeletes(prev => ({ ...prev, [id]: false }))
    }
  }

  const [clearingCompleted, setClearingCompleted] = useState<boolean>(false)

  const clearCompleted = async () => {
    // Prevent duplicate operations
    if (clearingCompleted) return
    
    try {
      setClearingCompleted(true)
      
      // 完了済みタスクのIDリスト
      const completedTaskIds = tasks
        .filter(task => task.completed)
        .map(task => task.id)

      // 楽観的UI更新
      setTasks(tasks.filter(task => !task.completed))

      // 順次削除
      for (const id of completedTaskIds) {
        await taskApi.deleteTask(id)
      }
    } catch (err) {
      console.error('完了済みタスクの削除に失敗しました:', err)
      setError('完了済みタスクの削除に失敗しました。後でもう一度お試しください。')

      // エラー時に元に戻す
      const taskData = await taskApi.getAllTasks()
      setTasks(taskData)
    } finally {
      setClearingCompleted(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed
    if (filter === 'active') return !task.completed
    return true
  })
  
  // Get current tasks for pagination
  const indexOfLastTask = currentPage * tasksPerPage
  const indexOfFirstTask = indexOfLastTask - tasksPerPage
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask)
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)
  
  // Reset to first page when filter changes or when tasks are added/deleted
  useEffect(() => {
    setCurrentPage(1)
  }, [filter])
  
  // Make sure current page is valid when total pages changes
  useEffect(() => {
    const totalPages = Math.ceil(filteredTasks.length / tasksPerPage)
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [filteredTasks.length, tasksPerPage, currentPage])

  return (
    <div className="todo-app">
      <h1>ToDoリスト</h1>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={addTask} className="task-form">
        <input
          type="text"
          value={taskInput}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTaskInput(e.target.value)}
          placeholder="新しいタスクを入力..."
          className="task-input"
          disabled={loading}
        />
        <button
          type="submit"
          className="add-button"
          disabled={loading}
        >
          {loading ? '追加中...' : '追加'}
        </button>
      </form>

      <div className="filter-buttons">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          すべて
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          未完了
        </button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          完了済み
        </button>
        <button
          onClick={clearCompleted}
          className="clear-button"
          disabled={loading || clearingCompleted}
        >
          {clearingCompleted ? '削除中...' : '完了済みを削除'}
        </button>
      </div>

      {loading && tasks.length === 0 ? (
        <div className="loading-message">タスクを読み込み中...</div>
      ) : (
        <>
          <ul className="task-list">
            {filteredTasks.length === 0 ? (
              <li className="empty-message">タスクがありません</li>
            ) : (
              currentTasks.map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${pendingToggles[task.id] ? 'updating' : ''}`}>
                  <div className="task-content">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleComplete(task.id)}
                      className="task-checkbox"
                      disabled={loading || pendingToggles[task.id]}
                    />
                    <span className="task-text">{task.text}</span>
                    {pendingToggles[task.id] && <span className="updating-indicator">更新中...</span>}
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="delete-button"
                    disabled={loading || pendingToggles[task.id]}
                  >
                    削除
                  </button>
                </li>
              ))
            )}
          </ul>
          
          {filteredTasks.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                {`${indexOfFirstTask + 1}-${Math.min(indexOfLastTask, filteredTasks.length)} / ${filteredTasks.length}件表示`}
              </div>
              
              {filteredTasks.length > tasksPerPage && (
                <div className="pagination">
                  <button 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-button"
                  >
                    前へ
                  </button>
                  
                  {Array.from({ length: Math.ceil(filteredTasks.length / tasksPerPage) }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => paginate(index + 1)}
                      className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  
                  <button 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === Math.ceil(filteredTasks.length / tasksPerPage)}
                    className="pagination-button"
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="task-count">
        {tasks.filter(task => !task.completed).length} 個のタスクが残っています
      </div>
    </div>
  )
}

export default App
