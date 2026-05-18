import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'time-manager-tasks'

const TIME_SLOTS = [
  { id: '1', label: '1', timeLabel: '8:00\n8:45' },
  { id: '2', label: '2', timeLabel: '8:50\n9:35' },
  { id: '3', label: '3', timeLabel: '9:50\n10:35' },
  { id: '4', label: '4', timeLabel: '10:40\n11:25' },
  { id: '5', label: '5', timeLabel: '11:30\n12:15' },
  { id: '6', label: '6', timeLabel: '14:05\n14:50' },
  { id: '7', label: '7', timeLabel: '14:55\n15:40' },
  { id: '8', label: '8', timeLabel: '15:45\n16:30' },
  { id: '9', label: '9', timeLabel: '16:40\n17:25' },
  { id: '10', label: '10', timeLabel: '17:30\n18:15' },
  { id: '11', label: '11', timeLabel: '18:30\n19:15' },
  { id: '12', label: '12', timeLabel: '19:20\n20:00' },
  { id: '13', label: '13', timeLabel: '20:10\n20:55' },
]

const TABS = [
  { id: 'plan', label: '当日计划' },
  { id: 'review', label: '总结复盘' },
  { id: 'reward', label: '奖励/惩罚' },
]

const DATE_RAIL_PAST_DAYS = 21
const DATE_RAIL_TOTAL_DAYS = 90
const REFERENCE_WEEK_SUNDAY = '2026-05-24'
const REFERENCE_WEEK_NUMBER = 12
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DRAG_START_THRESHOLD = 8

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

function parseDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getWeekdayLabel(dateString) {
  return WEEKDAY_LABELS[parseDate(dateString).getDay()]
}

function isWeekend(dateString) {
  const day = parseDate(dateString).getDay()
  return day === 0 || day === 6
}

function isSunday(dateString) {
  return parseDate(dateString).getDay() === 0
}

function getCustomWeekNumber(dateString) {
  const date = parseDate(dateString)
  const referenceDate = parseDate(REFERENCE_WEEK_SUNDAY)
  const dayDifference = Math.round(
    (date.getTime() - referenceDate.getTime()) / 86400000,
  )

  return REFERENCE_WEEK_NUMBER + Math.round(dayDifference / 7)
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
  const [dateRailAnchor] = useState(getDateString)
  const [activeTab, setActiveTab] = useState('plan')
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [timeRailMode, setTimeRailMode] = useState('period')
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null)
  const [taskForm, setTaskForm] = useState(() => getEmptyForm(getDateString()))
  const [dragState, setDragState] = useState(null)
  const longPressTimerRef = useRef(null)
  const didLongPressRef = useRef(false)
  const didDragTaskRef = useRef(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    if (!dragState) {
      return undefined
    }

    function getSlotIdFromPoint(x, y) {
      return document.elementFromPoint(x, y)?.closest('[data-slot-id]')?.dataset
        .slotId
    }

    function handlePointerMove(event) {
      setDragState((currentDrag) => {
        if (!currentDrag) {
          return null
        }

        const distance = Math.hypot(
          event.clientX - currentDrag.startX,
          event.clientY - currentDrag.startY,
        )
        const isDragging =
          currentDrag.isDragging || distance > DRAG_START_THRESHOLD
        const overSlotId = isDragging
          ? getSlotIdFromPoint(event.clientX, event.clientY) || null
          : null

        if (isDragging) {
          didDragTaskRef.current = true
        }

        return {
          ...currentDrag,
          x: event.clientX,
          y: event.clientY,
          isDragging,
          overSlotId,
        }
      })
    }

    function handlePointerUp() {
      if (dragState.isDragging && dragState.overSlotId) {
        setTasks((currentTasks) =>
          currentTasks.map((task) =>
            task.id === dragState.taskId
              ? { ...task, slotId: dragState.overSlotId }
              : task,
          ),
        )

        if (selectedSlotId) {
          setSelectedSlotId(dragState.overSlotId)
        }
      }

      setDragState(null)
      window.setTimeout(() => {
        didDragTaskRef.current = false
      }, 150)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragState, selectedSlotId])

  const dateRail = useMemo(() => {
    return Array.from({ length: DATE_RAIL_TOTAL_DAYS }, (_, index) =>
      shiftDate(dateRailAnchor, index - DATE_RAIL_PAST_DAYS),
    )
  }, [dateRailAnchor])

  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.taskDate === selectedDate),
    [selectedDate, tasks],
  )
  const selectedSlot = TIME_SLOTS.find((slot) => slot.id === selectedSlotId)
  const selectedSlotTasks = useMemo(
    () => selectedTasks.filter((task) => task.slotId === selectedSlotId),
    [selectedSlotId, selectedTasks],
  )
  const pendingDeleteTask = tasks.find((task) => task.id === pendingDeleteTaskId)

  const completedCount = selectedTasks.filter((task) => task.completed).length
  const completionRate =
    selectedTasks.length === 0
      ? 0
      : Math.round((completedCount / selectedTasks.length) * 100)

  function selectDate(nextDate) {
    setSelectedDate(nextDate)
    setSelectedSlotId(null)
    setTaskForm((currentForm) => ({ ...currentForm, taskDate: nextDate }))
  }

  function handleDateDoubleClick(date) {
    if (date === selectedDate) {
      selectDate(getDateString())
    }
  }

  function openCreatePanel(slotId = '1') {
    setEditingTaskId(null)
    setTaskForm({ ...getEmptyForm(selectedDate), slotId })
    setIsTaskPanelOpen(true)
  }

  function handleSlotPointerDown() {
    didLongPressRef.current = false
    window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true
      setTimeRailMode((currentMode) =>
        currentMode === 'period' ? 'time' : 'period',
      )
    }, 550)
  }

  function handleSlotPointerEnd() {
    window.clearTimeout(longPressTimerRef.current)
  }

  function handleSlotClick(slotId) {
    if (didLongPressRef.current) {
      didLongPressRef.current = false
      return
    }

    setSelectedSlotId(slotId)
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

  function requestDeleteTask(taskId) {
    setPendingDeleteTaskId(taskId)
  }

  function cancelDeleteTask() {
    setPendingDeleteTaskId(null)
  }

  function confirmDeleteTask() {
    if (!pendingDeleteTaskId) {
      return
    }

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== pendingDeleteTaskId),
    )
    if (editingTaskId === pendingDeleteTaskId) {
      closeTaskPanel()
    }
    setPendingDeleteTaskId(null)
  }

  function beginTaskDrag(event, task) {
    if (event.button !== 0) {
      return
    }

    setDragState({
      taskId: task.id,
      title: task.title,
      originSlotId: task.slotId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      isDragging: false,
      overSlotId: null,
    })
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
          onClick={() => {
            if (didDragTaskRef.current) {
              didDragTaskRef.current = false
              return
            }

            openEditPanel(task)
          }}
          onPointerDown={(event) => beginTaskDrag(event, task)}
        >
          <span className="task-title is-scheduled">{task.title}</span>
          <small>第 {task.slotId} 时段</small>
        </button>
        <button
          className="task-delete"
          type="button"
          aria-label="删除任务"
          onClick={() => requestDeleteTask(task.id)}
        >
          ×
        </button>
      </article>
    )
  }

  function renderSlotDetail() {
    return (
      <section className="slot-detail" aria-label="时段任务详情">
        <div className="slot-detail-header">
          <div>
            <span>第 {selectedSlot?.label} 时段</span>
            <h2>{selectedSlot?.timeLabel.replace('\n', ' - ')}</h2>
          </div>
          <strong>{selectedSlotTasks.length} 项</strong>
        </div>

        <div className="slot-task-list">
          {selectedSlotTasks.length === 0 ? (
            <div className="slot-empty">
              <p>这个时段还没有任务</p>
              <span>用右下角加号添加，并选择第 {selectedSlot?.label} 时段。</span>
            </div>
          ) : (
            selectedSlotTasks.map(renderTaskCard)
          )}
        </div>

        <button
          className="back-to-board"
          type="button"
          onClick={() => setSelectedSlotId(null)}
        >
          返回四象限
        </button>
      </section>
    )
  }

  return (
    <main className="app-shell">
      <section className="phone-shell">
        <header className="date-rail" aria-label="日期栏">
          {dateRail.map((date) => (
            <button
              className={`date-chip ${
                date === selectedDate ? 'is-selected' : ''
              } ${isWeekend(date) ? 'is-weekend' : ''}`}
              key={date}
              type="button"
              onClick={() => selectDate(date)}
              onDoubleClick={() => handleDateDoubleClick(date)}
            >
              <span className="date-number">{formatDateChip(date)}</span>
              <span className="weekday-label">{getWeekdayLabel(date)}</span>
              {isSunday(date) ? (
                <small className="week-number">{getCustomWeekNumber(date)}</small>
              ) : null}
            </button>
          ))}
        </header>

        <section className="tab-content">
          {activeTab === 'plan' ? (
            <div className="planner-view">
              <aside className="time-rail" aria-label="时间段">
                {TIME_SLOTS.map((slot) => (
                  <button
                    className={`time-slot ${
                      selectedSlotId === slot.id ? 'is-selected' : ''
                    } ${dragState?.overSlotId === slot.id ? 'is-drop-target' : ''
                    } ${timeRailMode === 'time' ? 'is-time-mode' : ''}`}
                    key={slot.id}
                    data-slot-id={slot.id}
                    type="button"
                    onClick={() => handleSlotClick(slot.id)}
                    onPointerDown={handleSlotPointerDown}
                    onPointerLeave={handleSlotPointerEnd}
                    onPointerUp={handleSlotPointerEnd}
                  >
                    {timeRailMode === 'time'
                      ? slot.timeLabel.split('\n').map((line) => (
                          <span key={line}>{line}</span>
                        ))
                      : slot.label}
                  </button>
                ))}
              </aside>

              {selectedSlotId ? (
                renderSlotDetail()
              ) : (
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
              )}
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
          onClick={() => openCreatePanel(selectedSlotId || '1')}
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
                      第 {slot.label} 时段（{slot.timeLabel.replace('\n', '-')}）
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

      {pendingDeleteTask ? (
        <div className="confirm-backdrop" role="presentation">
          <section className="confirm-dialog" role="dialog" aria-modal="true">
            <h2>删除任务？</h2>
            <p>{pendingDeleteTask.title}</p>
            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                type="button"
                onClick={cancelDeleteTask}
              >
                取消
              </button>
              <button
                className="confirm-delete"
                type="button"
                onClick={confirmDeleteTask}
              >
                删除
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {dragState?.isDragging ? (
        <div
          className="drag-preview"
          style={{
            left: dragState.x,
            top: dragState.y,
          }}
        >
          {dragState.title}
        </div>
      ) : null}
    </main>
  )
}

export default App
