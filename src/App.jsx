import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'time-manager-tasks'

const PRIORITIES = {
  high: {
    label: '紧急',
    tone: 'priority-high',
  },
  medium: {
    label: '重要',
    tone: 'priority-medium',
  },
  low: {
    label: '普通',
    tone: 'priority-low',
  },
}

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
]

function getDateString(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function shiftDate(dateString, amount) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + amount)
  return getDateString(date)
}

function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(year, month - 1, day))
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `task-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createTask(title, taskDate, dueTime, priority) {
  return {
    id: createId(),
    title: title.trim(),
    taskDate,
    dueTime,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  }
}

function normalizeTasks(savedTasks) {
  if (!Array.isArray(savedTasks)) {
    return []
  }

  return savedTasks
    .filter((task) => task && typeof task.title === 'string')
    .map((task) => {
      const createdAt = task.createdAt || new Date().toISOString()

      return {
        id: task.id || createId(),
        title: task.title,
        taskDate: task.taskDate || getDateString(new Date(createdAt)),
        dueTime: task.dueTime || '09:00',
        priority: PRIORITIES[task.priority] ? task.priority : 'medium',
        completed: Boolean(task.completed),
        createdAt,
        completedAt: task.completedAt || null,
      }
    })
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY)
    return savedTasks ? normalizeTasks(JSON.parse(savedTasks)) : []
  } catch {
    return []
  }
}

function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [title, setTitle] = useState('')
  const [selectedDate, setSelectedDate] = useState(getDateString)
  const [taskDate, setTaskDate] = useState(getDateString)
  const [dueTime, setDueTime] = useState('09:00')
  const [priority, setPriority] = useState('medium')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const selectedDateTasks = useMemo(
    () => tasks.filter((task) => task.taskDate === selectedDate),
    [selectedDate, tasks],
  )
  const completedCount = selectedDateTasks.filter((task) => task.completed).length
  const activeCount = selectedDateTasks.length - completedCount
  const completionRate =
    selectedDateTasks.length === 0
      ? 0
      : Math.round((completedCount / selectedDateTasks.length) * 100)
  const selectedDateLabel = formatDateLabel(selectedDate)
  const isViewingToday = selectedDate === getDateString()

  const visibleTasks = useMemo(() => {
    return selectedDateTasks
      .filter((task) => {
        if (filter === 'completed') {
          return task.completed
        }

        if (filter === 'active') {
          return !task.completed
        }

        return true
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return Number(a.completed) - Number(b.completed)
        }

        return a.dueTime.localeCompare(b.dueTime)
      })
  }, [filter, selectedDateTasks])

  function handleSubmit(event) {
    event.preventDefault()

    if (!title.trim()) {
      return
    }

    setTasks((currentTasks) => [
      ...currentTasks,
      createTask(title, taskDate, dueTime, priority),
    ])
    setTitle('')
    setPriority('medium')
    setSelectedDate(taskDate)
  }

  function selectDate(nextDate) {
    setSelectedDate(nextDate)
    setTaskDate(nextDate)
  }

  function toggleTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              completedAt: task.completed ? null : new Date().toISOString(),
            }
          : task,
      ),
    )
  }

  function removeTask(taskId) {
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId),
    )
  }

  function clearCompletedTasks() {
    setTasks((currentTasks) =>
      currentTasks.filter(
        (task) => task.taskDate !== selectedDate || !task.completed,
      ),
    )
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="app-header">
          <p className="eyebrow">私人时间管理</p>
          <div>
            <h1>{isViewingToday ? '今日待办' : '日程清单'}</h1>
            <p className="subtitle">
              {selectedDateLabel}，写下任务，约定完成时间，按缓急分类。
            </p>
          </div>
        </header>

        <form className="task-form" onSubmit={handleSubmit}>
          <label className="field task-title-field">
            <span>任务</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：整理今天的学习计划"
            />
          </label>

          <label className="field date-field">
            <span>任务日期</span>
            <input
              type="date"
              value={taskDate}
              onChange={(event) => setTaskDate(event.target.value)}
            />
          </label>

          <label className="field time-field">
            <span>完成时间</span>
            <input
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
            />
          </label>

          <label className="field priority-field">
            <span>缓急</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {Object.entries(PRIORITIES).map(([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button className="add-button" type="submit">
            添加
          </button>
        </form>

        <section className="date-panel" aria-label="日期切换">
          <button
            className="date-step-button"
            type="button"
            onClick={() => selectDate(shiftDate(selectedDate, -1))}
          >
            前一天
          </button>

          <label className="date-picker">
            <span>查看日期</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => selectDate(event.target.value)}
            />
          </label>

          <button
            className="today-button"
            type="button"
            onClick={() => selectDate(getDateString())}
          >
            今天
          </button>

          <button
            className="date-step-button"
            type="button"
            onClick={() => selectDate(shiftDate(selectedDate, 1))}
          >
            后一天
          </button>
        </section>

        <section className="summary" aria-label="当前日期完成情况">
          <div>
            <span className="summary-value">{selectedDateTasks.length}</span>
            <span className="summary-label">当天任务</span>
          </div>
          <div>
            <span className="summary-value">{activeCount}</span>
            <span className="summary-label">未完成</span>
          </div>
          <div>
            <span className="summary-value">{completionRate}%</span>
            <span className="summary-label">完成率</span>
          </div>
        </section>

        <div className="list-toolbar">
          <div className="filter-group" aria-label="任务筛选">
            {FILTERS.map((item) => (
              <button
                className={`filter-button ${
                  filter === item.value ? 'is-active' : ''
                }`}
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            className="clear-button"
            type="button"
            disabled={completedCount === 0}
            onClick={clearCompletedTasks}
          >
            清除已完成
          </button>
        </div>

        <section className="task-list" aria-label="待办事项列表">
          {visibleTasks.length === 0 ? (
            <div className="empty-state">
              <p>这里暂时没有任务</p>
              <span>给 {selectedDateLabel} 安排一件想完成的小事。</span>
            </div>
          ) : (
            visibleTasks.map((task) => {
              const priorityMeta = PRIORITIES[task.priority]

              return (
                <article
                  className={`task-item ${
                    task.completed ? 'is-completed' : ''
                  }`}
                  key={task.id}
                >
                  <button
                    className="check-button"
                    type="button"
                    aria-label={task.completed ? '标记为未完成' : '标记为完成'}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.completed ? '✓' : ''}
                  </button>

                  <button
                    className="task-content"
                    type="button"
                    onClick={() => toggleTask(task.id)}
                  >
                    <time>{task.dueTime}</time>
                    <span>{task.title}</span>
                    <strong className={`priority-pill ${priorityMeta.tone}`}>
                      {priorityMeta.label}
                    </strong>
                  </button>

                  <button
                    className="delete-button"
                    type="button"
                    aria-label="删除任务"
                    onClick={() => removeTask(task.id)}
                  >
                    删除
                  </button>
                </article>
              )
            })
          )}
        </section>
      </section>
    </main>
  )
}

export default App
