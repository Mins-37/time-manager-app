import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'time-manager-tasks'

const TIME_SLOTS = Array.from({ length: 13 }, (_, index) => ({
  id: String(index + 1),
  label: String(index + 1),
}))

const TABS = [
  { id: 'plan', label: '当日计划' },
  { id: 'review', label: '总结复盘' },
  { id: 'reward', label: '奖励/惩罚' },
]

const QUADRANTS = [
  {
    id: 'important-urgent',
    title: '重要 / 紧急',
    hint: '先处理',
    important: true,
    urgent: true,
  },
  {
    id: 'important-not-urgent',
    title: '重要 / 不紧急',
    hint: '重点推进',
    important: true,
    urgent: false,
  },
  {
    id: 'not-important-urgent',
    title: '不重要 / 紧急',
    hint: '尽快安排',
    important: false,
    urgent: true,
  },
  {
    id: 'not-important-not-urgent',
    title: '不重要 / 不紧急',
    hint: '低优先级',
    important: false,
    urgent: false,
  },
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

function formatDateChip(dateString) {
  const [, month, day] = dateString.split('-').map(Number)
  return `${month}.${day}`
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

function priorityToQuadrant(priority) {
  if (priority === 'high') {
    return { important: true, urgent: true }
  }

  if (priority === 'medium') {
    return { important: true, urgent: false }
  }

  return { important: false, urgent: false }
}

function normalizeTasks(savedTasks) {
  if (!Array.isArray(savedTasks)) {
    return []
  }

  return savedTasks
    .filter((task) => task && typeof task.title === 'string')
    .map((task) => {
      const createdAt = task.createdAt || new Date().toISOString()
      const fallbackQuadrant = priorityToQuadrant(task.priority)

      return {
        id: task.id || createId(),
        title: task.title,
        taskDate: task.taskDate || getDateString(new Date(createdAt)),
        slotId: task.slotId || '1',
        important:
          typeof task.important === 'boolean'
            ? task.important
            : fallbackQuadrant.important,
        urgent:
          typeof task.urgent === 'boolean' ? task.urgent : fallbackQuadrant.urgent,
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

function createTask(form) {
  return {
    id: createId(),
    title: form.title.trim(),
    taskDate: form.taskDate,
    slotId: form.slotId,
    important: form.important,
    urgent: form.urgent,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  }
}

function getEmptyForm(date) {
  return {
    title: '',
    taskDate: date,
    slotId: '1',
    important: true,
    urgent: false,
  }
}

function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [selectedDate, setSelectedDate] = useState(getDateString)
  const [activeTab, setActiveTab] = useState('plan')
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [taskForm, setTaskForm] = useState(() => getEmptyForm(getDateString()))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const dateRail = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => shiftDate(selectedDate, index - 3))
  }, [selectedDate])

  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.taskDate === selectedDate),
    [selectedDate, tasks],
  )

  const completedCount = selectedTasks.filter((task) => task.completed).length
  const completionRate =
    selectedTasks.length === 0
      ? 0
      : Math.round((completedCount / selectedTasks.length) * 100)

  function selectDate(nextDate) {
    setSelectedDate(nextDate)
    setTaskForm((currentForm) => ({ ...currentForm, taskDate: nextDate }))
  }

  function openCreatePanel(slotId = '1') {
    setEditingTaskId(null)
    setTaskForm({ ...getEmptyForm(selectedDate), slotId })
    setIsTaskPanelOpen(true)
  }

  function openEditPanel(task) {
    setEditingTaskId(task.id)
    setTaskForm({
      title: task.title,
      taskDate: task.taskDate,
      slotId: task.slotId,
      important: task.important,
      urgent: task.urgent,
    })
    setIsTaskPanelOpen(true)
  }

  function closeTaskPanel() {
    setIsTaskPanelOpen(false)
    setEditingTaskId(null)
    setTaskForm(getEmptyForm(selectedDate))
  }

  function updateTaskForm(field, value) {
    setTaskForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function saveTask(event) {
    event.preventDefault()

    if (!taskForm.title.trim()) {
      return
    }

    if (editingTaskId) {
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: taskForm.title.trim(),
                taskDate: taskForm.taskDate,
                slotId: taskForm.slotId,
                important: taskForm.important,
                urgent: taskForm.urgent,
              }
            : task,
        ),
      )
    } else {
      setTasks((currentTasks) => [...currentTasks, createTask(taskForm)])
    }

    selectDate(taskForm.taskDate)
    closeTaskPanel()
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
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
    if (editingTaskId === taskId) {
      closeTaskPanel()
    }
  }

  function renderTaskCard(task) {
    return (
      <article className={`plan-task ${task.completed ? 'is-done' : ''}`} key={task.id}>
        <button
          className="task-check"
          type="button"
          aria-label={task.completed ? '标记为未完成' : '标记为完成'}
          onClick={() => toggleTask(task.id)}
        >
          {task.completed ? '✓' : ''}
        </button>
        <button
          className="task-card-content"
          type="button"
          onClick={() => openEditPanel(task)}
        >
          <span>{task.title}</span>
          <small>第 {task.slotId} 时段</small>
        </button>
        <button
          className="task-delete"
          type="button"
          aria-label="删除任务"
          onClick={() => removeTask(task.id)}
        >
          ×
        </button>
      </article>
    )
  }

  return (
    <main className="app-shell">
      <section className="phone-shell">
        <header className="date-rail" aria-label="日期栏">
          {dateRail.map((date) => (
            <button
              className={`date-chip ${date === selectedDate ? 'is-selected' : ''}`}
              key={date}
              type="button"
              onClick={() => selectDate(date)}
            >
              <span>{formatDateChip(date)}</span>
            </button>
          ))}
        </header>

        <section className="tab-content">
          {activeTab === 'plan' ? (
            <div className="planner-view">
              <aside className="time-rail" aria-label="时间段">
                {TIME_SLOTS.map((slot) => (
                  <button
                    className="time-slot"
                    key={slot.id}
                    type="button"
                    onClick={() => openCreatePanel(slot.id)}
                  >
                    {slot.label}
                  </button>
                ))}
              </aside>

              <section className="quadrant-board" aria-label="四象限任务区">
                <div className="day-summary">
                  <strong>{formatDateLabel(selectedDate)}</strong>
                  <span>
                    {selectedTasks.length} 项 · 完成率 {completionRate}%
                  </span>
                </div>

                {QUADRANTS.map((quadrant) => {
                  const quadrantTasks = selectedTasks.filter(
                    (task) =>
                      task.important === quadrant.important &&
                      task.urgent === quadrant.urgent,
                  )

                  return (
                    <section className="quadrant" key={quadrant.id}>
                      <div className="quadrant-heading">
                        <h2>{quadrant.title}</h2>
                        <span>{quadrant.hint}</span>
                      </div>

                      <div className="quadrant-tasks">
                        {quadrantTasks.length === 0 ? (
                          <p className="quadrant-empty">暂无任务</p>
                        ) : (
                          quadrantTasks.map(renderTaskCard)
                        )}
                      </div>
                    </section>
                  )
                })}
              </section>
            </div>
          ) : (
            <section className="placeholder-view">
              <h1>{TABS.find((tab) => tab.id === activeTab)?.label}</h1>
              <p>这里先留白，等当日计划稳定后再继续做。</p>
            </section>
          )}
        </section>

        <button
          className="floating-add"
          type="button"
          aria-label="添加任务"
          onClick={() => openCreatePanel()}
        >
          +
        </button>

        <nav className="bottom-tabs" aria-label="主菜单">
          {TABS.map((tab) => (
            <button
              className={activeTab === tab.id ? 'is-active' : ''}
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {isTaskPanelOpen ? (
        <div className="task-panel-backdrop" role="presentation">
          <form className="task-panel" onSubmit={saveTask}>
            <div className="task-panel-header">
              <h2>{editingTaskId ? '编辑任务' : '添加任务'}</h2>
              <button type="button" onClick={closeTaskPanel} aria-label="关闭">
                ×
              </button>
            </div>

            <label className="field">
              <span>任务</span>
              <input
                type="text"
                value={taskForm.title}
                onChange={(event) => updateTaskForm('title', event.target.value)}
                placeholder="写下这件事"
              />
            </label>

            <div className="form-grid">
              <label className="field">
                <span>日期</span>
                <input
                  type="date"
                  value={taskForm.taskDate}
                  onChange={(event) => updateTaskForm('taskDate', event.target.value)}
                />
              </label>

              <label className="field">
                <span>时段</span>
                <select
                  value={taskForm.slotId}
                  onChange={(event) => updateTaskForm('slotId', event.target.value)}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      第 {slot.label} 时段
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={taskForm.important}
                  onChange={(event) =>
                    updateTaskForm('important', event.target.checked)
                  }
                />
                <span>重要</span>
              </label>

              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={taskForm.urgent}
                  onChange={(event) => updateTaskForm('urgent', event.target.checked)}
                />
                <span>紧急</span>
              </label>
            </div>

            <button className="panel-save" type="submit">
              保存
            </button>
          </form>
        </div>
      ) : null}
    </main>
  )
}

export default App
