import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'time-manager-tasks'
const HABIT_STORAGE_KEY = 'time-manager-habits'
const REVIEW_STORAGE_KEY = 'time-manager-daily-reviews'
const REVIEW_ANALYSIS_STORAGE_KEY = 'time-manager-review-analyses'
const AI_CONFIG_STORAGE_KEY = 'time-manager-ai-config'
const COIN_STORAGE_KEY = 'time-manager-coins'
const COINS_PER_COMPLETION = 1

const TIME_SLOTS = [
  { id: '1', label: '1', start: '08:00', end: '08:45', timeLabel: '8:00\n8:45' },
  { id: '2', label: '2', start: '08:50', end: '09:35', timeLabel: '8:50\n9:35' },
  { id: '3', label: '3', start: '09:50', end: '10:35', timeLabel: '9:50\n10:35' },
  { id: '4', label: '4', start: '10:40', end: '11:25', timeLabel: '10:40\n11:25' },
  { id: '5', label: '5', start: '11:30', end: '12:15', timeLabel: '11:30\n12:15' },
  { id: '6', label: '6', start: '14:05', end: '14:50', timeLabel: '14:05\n14:50' },
  { id: '7', label: '7', start: '14:55', end: '15:40', timeLabel: '14:55\n15:40' },
  { id: '8', label: '8', start: '15:45', end: '16:30', timeLabel: '15:45\n16:30' },
  { id: '9', label: '9', start: '16:40', end: '17:25', timeLabel: '16:40\n17:25' },
  { id: '10', label: '10', start: '17:30', end: '18:15', timeLabel: '17:30\n18:15' },
  { id: '11', label: '11', start: '18:30', end: '19:15', timeLabel: '18:30\n19:15' },
  { id: '12', label: '12', start: '19:20', end: '20:00', timeLabel: '19:20\n20:00' },
  { id: '13', label: '13', start: '20:10', end: '20:55', timeLabel: '20:10\n20:55' },
]

const TABS = [
  { id: 'plan', label: '当日计划' },
  { id: 'review', label: '总结复盘' },
  { id: 'reward', label: '奖励/惩罚' },
  { id: 'finance', label: '收支' },
]

const DATE_RAIL_TOTAL_DAYS = 220
const DATE_RAIL_PAST_DAYS = 7
const REVIEW_PAST_WEEKS = 28
const REVIEW_TOTAL_WEEKS = 60
const FINAL_BREAK_END = '23:30'
const REFERENCE_WEEK_SUNDAY = '2026-05-24'
const REFERENCE_WEEK_NUMBER = 12
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_OPTIONS = [
  { value: 0, label: '周日' },
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
  { value: 6, label: '周六' },
]
const REVIEW_SCOPES = [
  { id: 'day', label: '日' },
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
  { id: 'year', label: '年' },
]
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

function getMonthTone(dateString) {
  const [year, month] = dateString.split('-').map(Number)
  return (year * 12 + month) % 2 === 0 ? 'month-even' : 'month-odd'
}

function getWeekStart(dateString) {
  const date = parseDate(dateString)
  const weekday = date.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  date.setDate(date.getDate() + mondayOffset)
  return getDateString(date)
}

function getMonthStart(dateString) {
  const [year, month] = dateString.split('-').map(Number)
  return getDateString(new Date(year, month - 1, 1))
}

function getYearStart(dateString) {
  const [year] = dateString.split('-').map(Number)
  return getDateString(new Date(year, 0, 1))
}

function getPeriodRange(scope, dateString) {
  if (scope === 'week') {
    const start = getWeekStart(dateString)
    return { start, end: shiftDate(start, 6) }
  }

  if (scope === 'month') {
    const [year, month] = dateString.split('-').map(Number)
    const start = getMonthStart(dateString)
    const end = getDateString(new Date(year, month, 0))
    return { start, end }
  }

  if (scope === 'year') {
    const [year] = dateString.split('-').map(Number)
    return {
      start: getYearStart(dateString),
      end: getDateString(new Date(year, 11, 31)),
    }
  }

  return { start: dateString, end: dateString }
}

function getDateRange(startDate, endDate) {
  const dates = []
  let currentDate = startDate

  while (currentDate <= endDate) {
    dates.push(currentDate)
    currentDate = shiftDate(currentDate, 1)
  }

  return dates
}

function formatRangeLabel(range) {
  return range.start === range.end ? range.start : `${range.start} 至 ${range.end}`
}

function getCustomWeekNumber(dateString) {
  const date = parseDate(dateString)
  const referenceDate = parseDate(REFERENCE_WEEK_SUNDAY)
  const dayDifference = Math.round(
    (date.getTime() - referenceDate.getTime()) / 86400000,
  )

  return REFERENCE_WEEK_NUMBER + Math.round(dayDifference / 7)
}

function formatMonthLabel(dateString) {
  const [year, month] = dateString.split('-').map(Number)
  return `${year}年${month}月`
}

function formatDateLabel(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(year, month - 1, day))
}

function timeToMinutes(time) {
  if (typeof time !== 'string' || !time.includes(':')) {
    return null
  }

  const [hours, minutes] = time.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

function getCurrentMinute() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function isValidTimeRange(startTime, endTime) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  return start !== null && end !== null && end > start
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA
}

function minuteInRange(minute, startTime, endTime) {
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  return start !== null && end !== null && minute >= start && minute < end
}

function getBreakRangeAfterSlot(slotId) {
  const slotIndex = TIME_SLOTS.findIndex((slot) => slot.id === slotId)
  const slot = TIME_SLOTS[slotIndex]

  if (!slot) {
    return null
  }

  const nextSlot = TIME_SLOTS[slotIndex + 1]
  return {
    start: slot.end,
    end: nextSlot?.start || FINAL_BREAK_END,
  }
}

function getCurrentSlotId(currentMinute) {
  for (const slot of TIME_SLOTS) {
    if (minuteInRange(currentMinute, slot.start, slot.end)) {
      return slot.id
    }

    const breakRange = getBreakRangeAfterSlot(slot.id)
    if (breakRange && minuteInRange(currentMinute, breakRange.start, breakRange.end)) {
      return slot.id
    }
  }

  return null
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
        slotId: typeof task.slotId === 'string' ? task.slotId : '1',
        scheduleMode: task.scheduleMode === 'time' ? 'time' : 'slot',
        startTime: typeof task.startTime === 'string' ? task.startTime : '',
        endTime: typeof task.endTime === 'string' ? task.endTime : '',
        important:
          typeof task.important === 'boolean'
            ? task.important
            : fallbackQuadrant.important,
        urgent:
          typeof task.urgent === 'boolean' ? task.urgent : fallbackQuadrant.urgent,
        completed: Boolean(task.completed),
        createdAt,
        completedAt: task.completedAt || null,
        rewardedAt: task.rewardedAt || null,
      }
    })
}

function getTasksForDate(allTasks, allHabits, date) {
  const weekday = parseDate(date).getDay()
  const dailyTasks = allTasks
    .filter((task) => task.taskDate === date)
    .map(createTaskInstance)
  const habitTasks = allHabits
    .filter((habit) => habit.weekdays.includes(weekday))
    .map((habit) => createHabitInstance(habit, date))

  return [...dailyTasks, ...habitTasks]
}

function normalizeHabits(savedHabits) {
  if (!Array.isArray(savedHabits)) {
    return []
  }

  return savedHabits
    .filter((habit) => habit && typeof habit.title === 'string')
    .map((habit) => {
      const fallbackQuadrant = priorityToQuadrant(habit.priority)
      const weekdays = Array.isArray(habit.weekdays)
        ? habit.weekdays
            .map(Number)
            .filter((weekday) => weekday >= 0 && weekday <= 6)
        : WEEKDAY_OPTIONS.map((weekday) => weekday.value)

      return {
        id: habit.id || createId(),
        title: habit.title,
        slotId: typeof habit.slotId === 'string' ? habit.slotId : '',
        scheduleMode: habit.scheduleMode === 'time' ? 'time' : 'slot',
        startTime: typeof habit.startTime === 'string' ? habit.startTime : '',
        endTime: typeof habit.endTime === 'string' ? habit.endTime : '',
        important:
          typeof habit.important === 'boolean'
            ? habit.important
            : fallbackQuadrant.important,
        urgent:
          typeof habit.urgent === 'boolean' ? habit.urgent : fallbackQuadrant.urgent,
        weekdays: [...new Set(weekdays)].sort((a, b) => a - b),
        completedDates: Array.isArray(habit.completedDates)
          ? habit.completedDates.filter((date) => typeof date === 'string')
          : [],
        rewardedDates: Array.isArray(habit.rewardedDates)
          ? habit.rewardedDates.filter((date) => typeof date === 'string')
          : [],
        createdAt: habit.createdAt || new Date().toISOString(),
      }
    })
}

function normalizeReviews(savedReviews) {
  if (!savedReviews || typeof savedReviews !== 'object' || Array.isArray(savedReviews)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(savedReviews)
      .filter(([date, review]) => typeof date === 'string' && review)
      .map(([date, review]) => [
        date,
        {
          note: typeof review.note === 'string' ? review.note : '',
          updatedAt: review.updatedAt || null,
        },
      ]),
  )
}

function normalizeReviewAnalyses(savedAnalyses) {
  if (!savedAnalyses || typeof savedAnalyses !== 'object' || Array.isArray(savedAnalyses)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(savedAnalyses)
      .filter(([key, analysis]) => typeof key === 'string' && analysis)
      .map(([key, analysis]) => [
        key,
        {
          scope: analysis.scope || 'day',
          range: analysis.range || null,
          generatedAt: analysis.generatedAt || null,
          summary: typeof analysis.summary === 'string' ? analysis.summary : '',
          positives: Array.isArray(analysis.positives) ? analysis.positives : [],
          blockers: Array.isArray(analysis.blockers) ? analysis.blockers : [],
          tomorrowSuggestion:
            typeof analysis.tomorrowSuggestion === 'string'
              ? analysis.tomorrowSuggestion
              : '',
          encouragement:
            typeof analysis.encouragement === 'string' ? analysis.encouragement : '',
          tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        },
      ]),
  )
}

function normalizeAiConfig(savedConfig) {
  if (!savedConfig || typeof savedConfig !== 'object') {
    return null
  }

  return {
    endpoint: typeof savedConfig.endpoint === 'string' ? savedConfig.endpoint : '',
    apiKey: typeof savedConfig.apiKey === 'string' ? savedConfig.apiKey : '',
    model: typeof savedConfig.model === 'string' ? savedConfig.model : '',
    mode: savedConfig.mode === 'custom' ? 'custom' : 'compatible',
  }
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY)
    return savedTasks ? normalizeTasks(JSON.parse(savedTasks)) : []
  } catch {
    return []
  }
}

function loadHabits() {
  try {
    const savedHabits = localStorage.getItem(HABIT_STORAGE_KEY)
    return savedHabits ? normalizeHabits(JSON.parse(savedHabits)) : []
  } catch {
    return []
  }
}

function loadReviews() {
  try {
    const savedReviews = localStorage.getItem(REVIEW_STORAGE_KEY)
    return savedReviews ? normalizeReviews(JSON.parse(savedReviews)) : {}
  } catch {
    return {}
  }
}

function loadReviewAnalyses() {
  try {
    const savedAnalyses = localStorage.getItem(REVIEW_ANALYSIS_STORAGE_KEY)
    return savedAnalyses ? normalizeReviewAnalyses(JSON.parse(savedAnalyses)) : {}
  } catch {
    return {}
  }
}

function loadAiConfig() {
  try {
    const savedConfig = localStorage.getItem(AI_CONFIG_STORAGE_KEY)
    return savedConfig ? normalizeAiConfig(JSON.parse(savedConfig)) : null
  } catch {
    return null
  }
}

function loadCoins() {
  try {
    const savedCoins = Number(localStorage.getItem(COIN_STORAGE_KEY))
    return Number.isFinite(savedCoins) && savedCoins >= 0 ? savedCoins : 0
  } catch {
    return 0
  }
}

function createTask(form) {
  return {
    id: createId(),
    title: form.title.trim(),
    taskDate: form.taskDate,
    slotId: form.scheduleMode === 'slot' ? form.slotId : '',
    scheduleMode: form.scheduleMode,
    startTime: form.scheduleMode === 'time' ? form.startTime : '',
    endTime: form.scheduleMode === 'time' ? form.endTime : '',
    important: form.important,
    urgent: form.urgent,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    rewardedAt: null,
  }
}

function createHabit(form) {
  return {
    id: createId(),
    title: form.title.trim(),
    slotId: form.scheduleMode === 'slot' ? form.slotId : '',
    scheduleMode: form.scheduleMode,
    startTime: form.scheduleMode === 'time' ? form.startTime : '',
    endTime: form.scheduleMode === 'time' ? form.endTime : '',
    important: form.important,
    urgent: form.urgent,
    weekdays: [...form.weekdays].sort((a, b) => a - b),
    completedDates: [],
    rewardedDates: [],
    createdAt: new Date().toISOString(),
  }
}

function getEmptyForm(date) {
  return {
    title: '',
    taskDate: date,
    slotId: '',
    scheduleMode: 'slot',
    startTime: '',
    endTime: '',
    important: true,
    urgent: false,
    weekdays: WEEKDAY_OPTIONS.map((weekday) => weekday.value),
  }
}

function createHabitInstance(habit, date) {
  const completed = habit.completedDates.includes(date)

  return {
    ...habit,
    itemType: 'habit',
    renderKey: `habit-${habit.id}-${date}`,
    taskDate: date,
    completed,
    completedAt: completed ? date : null,
  }
}

function createTaskInstance(task) {
  return {
    ...task,
    itemType: 'task',
    renderKey: task.id,
  }
}

function hasTaskSchedule(task) {
  return (
    (task.scheduleMode === 'time' &&
      isValidTimeRange(task.startTime, task.endTime)) ||
    Boolean(task.slotId)
  )
}

function taskOverlapsRange(task, startTime, endTime) {
  if (task.scheduleMode !== 'time' || !isValidTimeRange(task.startTime, task.endTime)) {
    return false
  }

  return rangesOverlap(
    timeToMinutes(task.startTime),
    timeToMinutes(task.endTime),
    timeToMinutes(startTime),
    timeToMinutes(endTime),
  )
}

function taskBelongsToSlot(task, slot) {
  if (!slot) {
    return false
  }

  if (task.scheduleMode === 'time') {
    return taskOverlapsRange(task, slot.start, slot.end)
  }

  return task.slotId === slot.id
}

function getTaskScheduleLabel(task) {
  if (task.scheduleMode === 'time' && isValidTimeRange(task.startTime, task.endTime)) {
    return `${task.startTime}-${task.endTime}`
  }

  return task.slotId ? `第 ${task.slotId} 时段` : '未安排时段'
}

function getTaskIdentity(task) {
  return task.renderKey || `${task.itemType}-${task.id}`
}

function uniqueTasks(tasksToDedupe) {
  const seenTasks = new Set()

  return tasksToDedupe.filter((task) => {
    const identity = getTaskIdentity(task)
    if (seenTasks.has(identity)) {
      return false
    }

    seenTasks.add(identity)
    return true
  })
}

function getTasksForSlotAndBreak(dayTasks, slot) {
  const breakRange = getBreakRangeAfterSlot(slot.id)

  return uniqueTasks(
    dayTasks.filter(
      (task) =>
        taskBelongsToSlot(task, slot) ||
        (breakRange && taskOverlapsRange(task, breakRange.start, breakRange.end)),
    ),
  )
}

function getReviewScopeLabel(scope) {
  return REVIEW_SCOPES.find((reviewScope) => reviewScope.id === scope)?.label || '日'
}

function getReviewAnalysisKey(scope, range) {
  return `${scope}:${range.start}:${range.end}`
}

function createReviewAnalysisPayload(scope, date, allReviews, allTasks, allHabits) {
  const range = getPeriodRange(scope, date)
  const dates = getDateRange(range.start, range.end)
  const dailyEntries = dates.map((entryDate) => {
    const dayTasks = getTasksForDate(allTasks, allHabits, entryDate)
    const note = allReviews[entryDate]?.note || ''

    return {
      date: entryDate,
      note,
      tasks: dayTasks,
    }
  })
  const periodTasks = dailyEntries.flatMap((entry) => entry.tasks)
  const completedTasks = periodTasks.filter((task) => task.completed)
  const unfinishedTasks = periodTasks.filter((task) => !task.completed)
  const habitTasks = periodTasks.filter((task) => task.itemType === 'habit')
  const combinedNote = dailyEntries
    .filter((entry) => entry.note.trim())
    .map((entry) => `${entry.date}：${entry.note.trim()}`)
    .join('\n')
  const completionRate =
    periodTasks.length === 0
      ? 0
      : Math.round((completedTasks.length / periodTasks.length) * 100)

  return {
    scope,
    scopeLabel: getReviewScopeLabel(scope),
    range,
    rangeLabel: formatRangeLabel(range),
    note: combinedNote,
    daysWithReviews: dailyEntries.filter((entry) => entry.note.trim()).length,
    totalDays: dates.length,
    stats: {
      totalTasks: periodTasks.length,
      completedTasks: completedTasks.length,
      unfinishedTasks: unfinishedTasks.length,
      completionRate,
      habitTasks: habitTasks.length,
    },
    completedTaskTitles: completedTasks.map((task) => task.title),
    unfinishedTaskTitles: unfinishedTasks.map((task) => task.title),
    habitTaskTitles: habitTasks.map((task) => task.title),
  }
}

function createMockReviewAnalysis(payload) {
  const hasNote = payload.note.trim().length > 0
  const hasUnfinishedTasks = payload.unfinishedTaskTitles.length > 0
  const completionRate = payload.stats.completionRate
  const scopeText = `${payload.scopeLabel}复盘`

  return {
    scope: payload.scope,
    range: payload.range,
    generatedAt: new Date().toISOString(),
    summary: hasNote
      ? `${scopeText}覆盖 ${payload.rangeLabel}，已有 ${payload.daysWithReviews}/${payload.totalDays} 天记录，任务完成率 ${completionRate}%。`
      : `${scopeText}覆盖 ${payload.rangeLabel}，目前还没有复盘文字，任务完成率 ${completionRate}%。`,
    positives:
      completionRate >= 80
        ? ['完成率很高，说明这段时间的计划和执行比较贴合。']
        : payload.completedTaskTitles.length > 0
          ? [`已经完成 ${payload.completedTaskTitles.length} 项任务，有持续推进就值得记录。`]
          : ['这段时间的记录还比较轻，可以先补一个最小收获。'],
    blockers: hasUnfinishedTasks
      ? [
          `还有 ${payload.unfinishedTaskTitles.length} 项未完成，可能需要重新估算任务量或调整安排方式。`,
        ]
      : ['没有明显未完成项，适合补充这段时间为什么顺利。'],
    tomorrowSuggestion: hasUnfinishedTasks
      ? `下一阶段优先处理：${payload.unfinishedTaskTitles.slice(0, 2).join('、')}。`
      : '下一阶段可以继续保持同样节奏，并提前留出一个缓冲时段。',
    encouragement:
      completionRate >= 80
        ? '这段时间的节奏不错，继续把这种稳定感攒起来。'
        : '复盘不是审判，是给下一阶段的自己递一张更清楚的地图。',
    tags: [
      completionRate >= 80 ? '高完成率' : '需调整',
      hasNote ? '有记录' : '待补充',
      payload.stats.habitTasks > 0 ? '含习惯' : '无习惯',
      scopeText,
    ],
  }
}

function getAnalysisPrompt() {
  return [
    '你是一个私人时间管理复盘助手。',
    '请基于用户提供的任务、习惯和复盘文字，给出简洁、具体、可执行的中文分析。',
    '只返回 JSON，不要返回 Markdown。',
    'JSON 结构必须包含：summary 字符串，positives 字符串数组，blockers 字符串数组，tomorrowSuggestion 字符串，encouragement 字符串，tags 字符串数组。',
  ].join('\n')
}

function normalizeAiAnalysis(rawAnalysis, payload) {
  const fallbackAnalysis = createMockReviewAnalysis(payload)
  const analysis = rawAnalysis?.analysis || rawAnalysis

  if (!analysis || typeof analysis !== 'object') {
    return fallbackAnalysis
  }

  return {
    scope: payload.scope,
    range: payload.range,
    generatedAt: new Date().toISOString(),
    summary:
      typeof analysis.summary === 'string'
        ? analysis.summary
        : fallbackAnalysis.summary,
    positives: Array.isArray(analysis.positives)
      ? analysis.positives.map(String)
      : fallbackAnalysis.positives,
    blockers: Array.isArray(analysis.blockers)
      ? analysis.blockers.map(String)
      : fallbackAnalysis.blockers,
    tomorrowSuggestion:
      typeof analysis.tomorrowSuggestion === 'string'
        ? analysis.tomorrowSuggestion
        : fallbackAnalysis.tomorrowSuggestion,
    encouragement:
      typeof analysis.encouragement === 'string'
        ? analysis.encouragement
        : fallbackAnalysis.encouragement,
    tags: Array.isArray(analysis.tags)
      ? analysis.tags.map(String)
      : fallbackAnalysis.tags,
  }
}

function extractAiJson(data) {
  if (data?.analysis) {
    return data.analysis
  }

  if (data?.summary) {
    return data
  }

  const content =
    data?.choices?.[0]?.message?.content ||
    data?.output_text ||
    data?.content ||
    ''

  if (typeof content !== 'string') {
    return data
  }

  const cleanedContent = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  return JSON.parse(cleanedContent)
}

async function requestAiAnalysis(aiConfig, payload) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (aiConfig.apiKey.trim()) {
    headers.Authorization = `Bearer ${aiConfig.apiKey.trim()}`
  }

  const body =
    aiConfig.mode === 'custom'
      ? {
          payload,
          instruction: getAnalysisPrompt(),
        }
      : {
          ...(aiConfig.model.trim() ? { model: aiConfig.model.trim() } : {}),
          messages: [
            {
              role: 'system',
              content: getAnalysisPrompt(),
            },
            {
              role: 'user',
              content: JSON.stringify(payload),
            },
          ],
          temperature: 0.3,
        }

  const response = await fetch(aiConfig.endpoint.trim(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`接口返回 ${response.status}`)
  }

  const data = await response.json()
  return normalizeAiAnalysis(extractAiJson(data), payload)
}

function vibrateOnComplete() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(18)
  }
}

function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [habits, setHabits] = useState(loadHabits)
  const [dailyReviews, setDailyReviews] = useState(loadReviews)
  const [reviewAnalyses, setReviewAnalyses] = useState(loadReviewAnalyses)
  const [aiConfig, setAiConfig] = useState(loadAiConfig)
  const [aiConfigForm, setAiConfigForm] = useState(
    () =>
      loadAiConfig() || {
        endpoint: '',
        apiKey: '',
        model: '',
        mode: 'compatible',
      },
  )
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false)
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState('idle')
  const [aiAnalysisError, setAiAnalysisError] = useState('')
  const [coins, setCoins] = useState(loadCoins)
  const [selectedDate, setSelectedDate] = useState(getDateString)
  const [reviewDate, setReviewDate] = useState(getDateString)
  const [reviewScope, setReviewScope] = useState('day')
  const [currentMinute, setCurrentMinute] = useState(getCurrentMinute)
  const [activeTab, setActiveTab] = useState('plan')
  const [selectedSlotId, setSelectedSlotId] = useState(null)
  const [timeRailMode, setTimeRailMode] = useState('period')
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false)
  const [taskPanelMode, setTaskPanelMode] = useState('task')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState(null)
  const [pendingDeleteTaskType, setPendingDeleteTaskType] = useState('task')
  const [taskForm, setTaskForm] = useState(() => getEmptyForm(getDateString()))
  const [dragState, setDragState] = useState(null)
  const [expandedStackKey, setExpandedStackKey] = useState(null)
  const longPressTimerRef = useRef(null)
  const didLongPressRef = useRef(false)
  const didDragTaskRef = useRef(false)
  const dateRailRef = useRef(null)
  const reviewCalendarRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(habits))
  }, [habits])

  useEffect(() => {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(dailyReviews))
  }, [dailyReviews])

  useEffect(() => {
    localStorage.setItem(
      REVIEW_ANALYSIS_STORAGE_KEY,
      JSON.stringify(reviewAnalyses),
    )
  }, [reviewAnalyses])

  useEffect(() => {
    if (aiConfig) {
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(aiConfig))
    } else {
      localStorage.removeItem(AI_CONFIG_STORAGE_KEY)
    }
  }, [aiConfig])

  useEffect(() => {
    localStorage.setItem(COIN_STORAGE_KEY, String(coins))
  }, [coins])

  useEffect(() => {
    const updateCurrentMinute = () => setCurrentMinute(getCurrentMinute())
    const currentTimeTimer = window.setInterval(updateCurrentMinute, 30000)

    document.addEventListener('visibilitychange', updateCurrentMinute)

    return () => {
      window.clearInterval(currentTimeTimer)
      document.removeEventListener('visibilitychange', updateCurrentMinute)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'review') {
      return
    }

    requestAnimationFrame(() => {
      reviewCalendarRef.current
        ?.querySelector(`[data-review-date="${reviewDate}"]`)
        ?.closest('.review-week')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
    })
  }, [activeTab, reviewDate])

  useEffect(() => {
    if (activeTab !== 'plan') {
      return
    }

    const today = getDateString()
    requestAnimationFrame(() => {
      dateRailRef.current
        ?.querySelector(`[data-date="${today}"]`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'start',
        })
    })
  }, [activeTab])

  useEffect(() => {
    if (!dragState) {
      return undefined
    }

    function getDropTargetFromPoint(x, y) {
      const element = document.elementFromPoint(x, y)
      const slotId = element?.closest('[data-slot-id]')?.dataset.slotId || null
      const quadrantId =
        element?.closest('[data-quadrant-id]')?.dataset.quadrantId || null

      return { quadrantId, slotId }
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
        const dropTarget = isDragging
          ? getDropTargetFromPoint(event.clientX, event.clientY)
          : { quadrantId: null, slotId: null }

        if (isDragging) {
          didDragTaskRef.current = true
        }

        return {
          ...currentDrag,
          x: event.clientX,
          y: event.clientY,
          isDragging,
          overQuadrantId: dropTarget.quadrantId,
          overSlotId: dropTarget.slotId,
        }
      })
    }

    function handlePointerUp() {
      if (
        dragState.isDragging &&
        (dragState.overSlotId || dragState.overQuadrantId)
      ) {
        const targetQuadrant = QUADRANTS.find(
          (quadrant) => quadrant.id === dragState.overQuadrantId,
        )

        const updateDraggedItem = (item) =>
          item.id === dragState.taskId
            ? {
                ...item,
                ...(dragState.overSlotId
                  ? {
                      slotId: dragState.overSlotId,
                      scheduleMode: 'slot',
                      startTime: '',
                      endTime: '',
                    }
                  : {}),
                ...(targetQuadrant
                  ? {
                      important: targetQuadrant.important,
                      urgent: targetQuadrant.urgent,
                    }
                  : {}),
              }
            : item

        if (dragState.itemType === 'habit') {
          setHabits((currentHabits) => currentHabits.map(updateDraggedItem))
        } else {
          setTasks((currentTasks) => currentTasks.map(updateDraggedItem))
        }

        if (selectedSlotId && dragState.overSlotId) {
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
      shiftDate(getDateString(), index - DATE_RAIL_PAST_DAYS),
    )
  }, [])

  const selectedTasks = useMemo(
    () => getTasksForDate(tasks, habits, selectedDate),
    [habits, selectedDate, tasks],
  )
  const slotTaskStats = useMemo(() => {
    return Object.fromEntries(
      TIME_SLOTS.map((slot) => {
        const slotTasks = getTasksForSlotAndBreak(selectedTasks, slot)
        const incompleteCount = slotTasks.filter((task) => !task.completed).length

        return [
          slot.id,
          {
            incompleteCount,
            totalCount: slotTasks.length,
          },
        ]
      }),
    )
  }, [selectedTasks])
  const reviewWeeks = useMemo(() => {
    const currentWeekStart = getWeekStart(getDateString())

    return Array.from({ length: REVIEW_TOTAL_WEEKS }, (_, weekIndex) => {
      const weekStart = shiftDate(
        currentWeekStart,
        (weekIndex - REVIEW_PAST_WEEKS) * 7,
      )

      return Array.from({ length: 7 }, (_, dayIndex) =>
        shiftDate(weekStart, dayIndex),
      )
    })
  }, [])
  const reviewTasks = useMemo(
    () => getTasksForDate(tasks, habits, reviewDate),
    [habits, reviewDate, tasks],
  )
  const reviewCompletedCount = reviewTasks.filter((task) => task.completed).length
  const reviewCompletionRate =
    reviewTasks.length === 0
      ? 0
      : Math.round((reviewCompletedCount / reviewTasks.length) * 100)
  const reviewText = dailyReviews[reviewDate]?.note || ''
  const reviewRange = useMemo(
    () => getPeriodRange(reviewScope, reviewDate),
    [reviewDate, reviewScope],
  )
  const reviewAnalysisKey = getReviewAnalysisKey(reviewScope, reviewRange)
  const reviewAnalysis = reviewAnalyses[reviewAnalysisKey] || null
  const currentSlotId =
    selectedDate === getDateString() ? getCurrentSlotId(currentMinute) : null
  const selectedSlot = TIME_SLOTS.find((slot) => slot.id === selectedSlotId)
  const selectedBreakRange = selectedSlotId
    ? getBreakRangeAfterSlot(selectedSlotId)
    : null
  const selectedSlotTasks = useMemo(
    () => selectedTasks.filter((task) => taskBelongsToSlot(task, selectedSlot)),
    [selectedSlot, selectedTasks],
  )
  const selectedBreakTasks = useMemo(
    () =>
      selectedBreakRange
        ? selectedTasks.filter((task) =>
            taskOverlapsRange(task, selectedBreakRange.start, selectedBreakRange.end),
          )
        : [],
    [selectedBreakRange, selectedTasks],
  )
  const pendingDeleteTask =
    pendingDeleteTaskType === 'habit'
      ? habits.find((habit) => habit.id === pendingDeleteTaskId)
      : tasks.find((task) => task.id === pendingDeleteTaskId)

  const completedCount = selectedTasks.filter((task) => task.completed).length
  const completionRate =
    selectedTasks.length === 0
      ? 0
      : Math.round((completedCount / selectedTasks.length) * 100)

  function selectDate(nextDate) {
    setSelectedDate(nextDate)
    setSelectedSlotId(null)
    setExpandedStackKey(null)
    setTaskForm((currentForm) => ({ ...currentForm, taskDate: nextDate }))
  }

  function handleTabChange(nextTab) {
    if (nextTab === 'plan') {
      selectDate(getDateString())
    }

    setActiveTab(nextTab)
  }

  function handleDateDoubleClick(date) {
    if (date === selectedDate) {
      const today = getDateString()
      selectDate(today)
      requestAnimationFrame(() => {
        dateRailRef.current
          ?.querySelector(`[data-date="${today}"]`)
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
          })
      })
    }
  }

  function openCreatePanel(slotId = '') {
    setTaskPanelMode('task')
    setEditingTaskId(null)
    setTaskForm({
      ...getEmptyForm(selectedDate),
      slotId,
      scheduleMode: 'slot',
    })
    setIsTaskPanelOpen(true)
  }

  function switchTaskPanelMode(nextMode) {
    setTaskPanelMode(nextMode)
    setEditingTaskId(null)
    setTaskForm({
      ...getEmptyForm(selectedDate),
      slotId: selectedSlotId || '',
      scheduleMode: 'slot',
    })
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
    setTaskPanelMode(task.itemType)
    setEditingTaskId(task.id)
    setTaskForm({
      title: task.title,
      taskDate: task.taskDate,
      slotId: task.slotId,
      scheduleMode: task.scheduleMode || 'slot',
      startTime: task.startTime || '',
      endTime: task.endTime || '',
      important: task.important,
      urgent: task.urgent,
      weekdays: task.weekdays || WEEKDAY_OPTIONS.map((weekday) => weekday.value),
    })
    setIsTaskPanelOpen(true)
  }

  function closeTaskPanel() {
    setIsTaskPanelOpen(false)
    setEditingTaskId(null)
    setTaskPanelMode('task')
    setTaskForm(getEmptyForm(selectedDate))
  }

  function updateTaskForm(field, value) {
    setTaskForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function updateDailyReview(date, note) {
    setDailyReviews((currentReviews) => ({
      ...currentReviews,
      [date]: {
        note,
        updatedAt: new Date().toISOString(),
      },
    }))
  }

  function updateAiConfigForm(field, value) {
    setAiConfigForm((currentForm) => ({ ...currentForm, [field]: value }))
  }

  function openAiConfigPanel() {
    setAiConfigForm(
      aiConfig || {
        endpoint: '',
        apiKey: '',
        model: '',
        mode: 'compatible',
      },
    )
    setIsAiConfigOpen(true)
  }

  function saveAiConfig(event) {
    event.preventDefault()

    if (!aiConfigForm.endpoint.trim()) {
      setAiAnalysisError('请先填写接口网址。')
      return
    }

    setAiConfig({
      ...aiConfigForm,
      endpoint: aiConfigForm.endpoint.trim(),
      apiKey: aiConfigForm.apiKey.trim(),
      model: aiConfigForm.model.trim(),
    })
    setAiAnalysisError('')
    setIsAiConfigOpen(false)
  }

  async function analyzeReviewPeriod() {
    const payload = createReviewAnalysisPayload(
      reviewScope,
      reviewDate,
      dailyReviews,
      tasks,
      habits,
    )

    if (!aiConfig?.endpoint?.trim()) {
      setAiAnalysisError('请先设置 AI 接口。')
      openAiConfigPanel()
      return
    }

    setAiAnalysisStatus('loading')
    setAiAnalysisError('')

    try {
      const analysis = await requestAiAnalysis(aiConfig, payload)

      setReviewAnalyses((currentAnalyses) => ({
        ...currentAnalyses,
        [getReviewAnalysisKey(reviewScope, payload.range)]: analysis,
      }))
      setAiAnalysisStatus('idle')
    } catch (error) {
      setAiAnalysisStatus('idle')
      setAiAnalysisError(
        error instanceof Error ? error.message : 'AI 分析失败，请检查接口设置。',
      )
    }
  }

  function runMockReviewAnalysis() {
    const payload = createReviewAnalysisPayload(
      reviewScope,
      reviewDate,
      dailyReviews,
      tasks,
      habits,
    )
    const analysis = createMockReviewAnalysis(payload)

    setReviewAnalyses((currentAnalyses) => ({
      ...currentAnalyses,
      [getReviewAnalysisKey(reviewScope, payload.range)]: analysis,
    }))
    setAiAnalysisError('')
  }

  function toggleHabitWeekday(weekday) {
    setTaskForm((currentForm) => {
      const nextWeekdays = currentForm.weekdays.includes(weekday)
        ? currentForm.weekdays.filter((currentWeekday) => currentWeekday !== weekday)
        : [...currentForm.weekdays, weekday]

      return {
        ...currentForm,
        weekdays: nextWeekdays.sort((a, b) => a - b),
      }
    })
  }

  function saveTask(event) {
    event.preventDefault()

    if (!taskForm.title.trim()) {
      return
    }

    if (taskPanelMode === 'habit' && taskForm.weekdays.length === 0) {
      return
    }

    if (
      taskForm.scheduleMode === 'time' &&
      !isValidTimeRange(taskForm.startTime, taskForm.endTime)
    ) {
      return
    }

    if (editingTaskId) {
      if (taskPanelMode === 'habit') {
        setHabits((currentHabits) =>
          currentHabits.map((habit) =>
            habit.id === editingTaskId
              ? {
                  ...habit,
                  title: taskForm.title.trim(),
                  slotId: taskForm.scheduleMode === 'slot' ? taskForm.slotId : '',
                  scheduleMode: taskForm.scheduleMode,
                  startTime:
                    taskForm.scheduleMode === 'time' ? taskForm.startTime : '',
                  endTime: taskForm.scheduleMode === 'time' ? taskForm.endTime : '',
                  important: taskForm.important,
                  urgent: taskForm.urgent,
                  weekdays: [...taskForm.weekdays].sort((a, b) => a - b),
                }
              : habit,
          ),
        )
      } else {
        setTasks((currentTasks) =>
          currentTasks.map((task) =>
            task.id === editingTaskId
              ? {
                  ...task,
                  title: taskForm.title.trim(),
                  taskDate: taskForm.taskDate,
                  slotId: taskForm.scheduleMode === 'slot' ? taskForm.slotId : '',
                  scheduleMode: taskForm.scheduleMode,
                  startTime:
                    taskForm.scheduleMode === 'time' ? taskForm.startTime : '',
                  endTime: taskForm.scheduleMode === 'time' ? taskForm.endTime : '',
                  important: taskForm.important,
                  urgent: taskForm.urgent,
                }
              : task,
          ),
        )
      }
    } else if (taskPanelMode === 'habit') {
      setHabits((currentHabits) => [...currentHabits, createHabit(taskForm)])
    } else {
      setTasks((currentTasks) => [...currentTasks, createTask(taskForm)])
    }

    selectDate(taskForm.taskDate)
    closeTaskPanel()
  }

  function toggleTask(task) {
    if (task.itemType === 'habit') {
      const shouldComplete = !task.completed
      const shouldReward =
        shouldComplete && !task.rewardedDates.includes(selectedDate)

      if (shouldComplete) {
        vibrateOnComplete()
      }
      if (shouldReward) {
        setCoins((currentCoins) => currentCoins + COINS_PER_COMPLETION)
      }

      setHabits((currentHabits) =>
        currentHabits.map((habit) =>
          habit.id === task.id
            ? {
                ...habit,
                completedDates: shouldComplete
                  ? [...new Set([...habit.completedDates, selectedDate])]
                  : habit.completedDates.filter((date) => date !== selectedDate),
                rewardedDates: shouldReward
                  ? [...new Set([...habit.rewardedDates, selectedDate])]
                  : habit.rewardedDates,
              }
            : habit,
        ),
      )
      return
    }

    const targetTask = tasks.find((currentTask) => currentTask.id === task.id)
    const shouldComplete = targetTask && !targetTask.completed
    const shouldReward = shouldComplete && !targetTask.rewardedAt

    if (shouldComplete) {
      vibrateOnComplete()
    }
    if (shouldReward) {
      setCoins((currentCoins) => currentCoins + COINS_PER_COMPLETION)
    }

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? {
              ...currentTask,
              completed: !currentTask.completed,
              completedAt: currentTask.completed ? null : new Date().toISOString(),
              rewardedAt:
                !currentTask.completed && !currentTask.rewardedAt
                  ? new Date().toISOString()
                  : currentTask.rewardedAt,
            }
          : currentTask,
      ),
    )
  }

  function requestDeleteTask(task) {
    setPendingDeleteTaskId(task.id)
    setPendingDeleteTaskType(task.itemType)
  }

  function cancelDeleteTask() {
    setPendingDeleteTaskId(null)
    setPendingDeleteTaskType('task')
  }

  function confirmDeleteTask() {
    if (!pendingDeleteTaskId) {
      return
    }

    if (pendingDeleteTaskType === 'habit') {
      setHabits((currentHabits) =>
        currentHabits.filter((habit) => habit.id !== pendingDeleteTaskId),
      )
    } else {
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== pendingDeleteTaskId),
      )
    }
    if (editingTaskId === pendingDeleteTaskId) {
      closeTaskPanel()
    }
    setPendingDeleteTaskId(null)
    setPendingDeleteTaskType('task')
  }

  function beginTaskDrag(event, task) {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Some browsers skip pointer capture for synthetic mouse events.
    }

    setDragState({
      taskId: task.id,
      itemType: task.itemType,
      title: task.title,
      originSlotId: task.slotId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      isDragging: false,
      overQuadrantId: null,
      overSlotId: null,
    })
  }

  function renderTaskCard(task) {
    return (
      <article
        className={`plan-task ${task.completed ? 'is-done' : ''} ${
          task.itemType === 'habit' ? 'is-habit' : ''
        }`}
        key={task.renderKey}
      >
        <button
          className="task-check"
          type="button"
          aria-label={task.completed ? '标记为未完成' : '标记为完成'}
          onClick={() => toggleTask(task)}
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
        >
          <span className={`task-title ${hasTaskSchedule(task) ? 'is-scheduled' : ''}`}>
            {task.title}
          </span>
          <small>
            {task.itemType === 'habit' ? '习惯 · ' : ''}
            {getTaskScheduleLabel(task)}
          </small>
        </button>
        <button
          className="task-drag-handle"
          type="button"
          aria-label="拖动任务"
          onPointerDown={(event) => beginTaskDrag(event, task)}
        >
          ⋮⋮
        </button>
        <button
          className="task-delete"
          type="button"
          aria-label="删除任务"
          onClick={() => requestDeleteTask(task)}
        >
          ×
        </button>
      </article>
    )
  }

  function renderTaskStack(tasksToStack, stackKey) {
    if (tasksToStack.length === 1) {
      return renderTaskCard(tasksToStack[0])
    }

    const isExpanded = expandedStackKey === stackKey
    const previewTasks = tasksToStack.slice(0, 4)

    if (isExpanded) {
      return (
        <div className="task-stack is-expanded">
          <button
            className="task-stack-toggle"
            type="button"
            onClick={() => setExpandedStackKey(null)}
          >
            收起已完成 / 已安排 · {tasksToStack.length}
          </button>
          <div className="task-stack-expanded-list">
            {tasksToStack.map(renderTaskCard)}
          </div>
        </div>
      )
    }

    return (
      <button
        className="task-stack is-collapsed"
        style={{ '--stack-size': tasksToStack.length }}
        type="button"
        onClick={() => setExpandedStackKey(stackKey)}
      >
        <span className="task-stack-label">已完成 / 已安排 · {tasksToStack.length}</span>
        {previewTasks.map((task, index) => (
          <div
            className="task-stack-card"
            key={task.renderKey}
            style={{ '--stack-index': index }}
          >
            <span>{task.title}</span>
            <small>
              {task.itemType === 'habit' ? '习惯 · ' : ''}
              {getTaskScheduleLabel(task)}
            </small>
          </div>
        ))}
      </button>
    )
  }

  function renderQuadrantTasks(quadrantTasks, quadrantId) {
    if (quadrantTasks.length === 0) {
      return <p className="quadrant-empty">暂无任务</p>
    }

    const looseTasks = quadrantTasks.filter(
      (task) => !task.completed && !hasTaskSchedule(task),
    )
    const stackedTasks = quadrantTasks.filter(
      (task) => task.completed || hasTaskSchedule(task),
    )

    return (
      <>
        {looseTasks.map(renderTaskCard)}
        {stackedTasks.length > 0
          ? renderTaskStack(stackedTasks, `${selectedDate}-${quadrantId}`)
          : null}
      </>
    )
  }

  function renderReviewView() {
    return (
      <section
        className={`review-view ${reviewAnalysis ? 'has-analysis' : ''}`}
        aria-label="总结复盘"
      >
        <div className="review-header">
          <div>
            <span>总结复盘</span>
            <h1>{formatMonthLabel(reviewDate)}</h1>
          </div>
          <button
            className="review-today"
            type="button"
            onClick={() => setReviewDate(getDateString())}
          >
            今天
          </button>
        </div>

        <div className="review-weekdays" aria-hidden="true">
          {WEEKDAY_OPTIONS.slice(1)
            .concat(WEEKDAY_OPTIONS[0])
            .map((weekday) => (
              <span key={weekday.value}>{weekday.label.replace('周', '')}</span>
            ))}
        </div>

        <div className="review-calendar" aria-label="复盘日历" ref={reviewCalendarRef}>
          {reviewWeeks.map((week) => (
            <div className="review-week" key={week[0]}>
              {week.map((date) => {
                const dayTasks = getTasksForDate(tasks, habits, date)
                const doneCount = dayTasks.filter((task) => task.completed).length
                const hasReview = Boolean(dailyReviews[date]?.note?.trim())
                const isSelected = date === reviewDate
                const isToday = date === getDateString()

                return (
                  <button
                    className={`review-day ${isSelected ? 'is-selected' : ''} ${
                      isToday ? 'is-today' : ''
                    } ${getMonthTone(date)} ${isWeekend(date) ? 'is-weekend' : ''} ${
                      hasReview ? 'has-review' : ''
                    }`}
                    key={date}
                    data-review-date={date}
                    type="button"
                    onClick={() => setReviewDate(date)}
                  >
                    <strong>{parseDate(date).getDate()}</strong>
                    <small>
                      {dayTasks.length === 0 ? '无' : `${doneCount}/${dayTasks.length}`}
                    </small>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <section className="review-editor" aria-label="每日总结编辑">
          <div className="review-editor-head">
            <div className="review-editor-title">
              <span>{formatDateLabel(reviewDate)}</span>
              <strong>
                {reviewTasks.length} 项 · 完成率 {reviewCompletionRate}%
              </strong>
            </div>
            <div className="review-ai-toolbar">
              <div className="review-scope-tabs" aria-label="分析范围">
                {REVIEW_SCOPES.map((scope) => (
                  <button
                    className={reviewScope === scope.id ? 'is-active' : ''}
                    key={scope.id}
                    type="button"
                    onClick={() => setReviewScope(scope.id)}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
              <button
                className="review-ai-button"
                type="button"
                disabled={aiAnalysisStatus === 'loading'}
                onClick={analyzeReviewPeriod}
              >
                {aiAnalysisStatus === 'loading'
                  ? '分析中'
                  : `AI${getReviewScopeLabel(reviewScope)}`}
              </button>
              <button
                className="review-ai-config-button"
                type="button"
                onClick={openAiConfigPanel}
                aria-label="AI 接口设置"
              >
                接口
              </button>
            </div>
          </div>
          {aiAnalysisError ? (
            <div className="review-ai-error">{aiAnalysisError}</div>
          ) : null}
          <textarea
            value={reviewText}
            onChange={(event) => updateDailyReview(reviewDate, event.target.value)}
            placeholder="写下今天发生了什么、做得好的地方、卡住的地方，或者明天想调整的事。"
          />
          {reviewAnalysis ? (
            <section className="review-analysis" aria-label="AI 分析结果">
              <div className="review-analysis-head">
                <strong>模拟 AI {getReviewScopeLabel(reviewScope)}分析</strong>
                <span>
                  {reviewAnalysis.generatedAt
                    ? new Date(reviewAnalysis.generatedAt).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>
              {reviewAnalysis.range ? (
                <small className="analysis-range">
                  {formatRangeLabel(reviewAnalysis.range)}
                </small>
              ) : null}
              <p>{reviewAnalysis.summary}</p>
              <div className="analysis-tags">
                {reviewAnalysis.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <dl className="analysis-list">
                <dt>做得好的地方</dt>
                <dd>{reviewAnalysis.positives.join(' ')}</dd>
                <dt>可能的卡点</dt>
                <dd>{reviewAnalysis.blockers.join(' ')}</dd>
                <dt>明日建议</dt>
                <dd>{reviewAnalysis.tomorrowSuggestion}</dd>
              </dl>
              <blockquote>{reviewAnalysis.encouragement}</blockquote>
            </section>
          ) : null}
        </section>
      </section>
    )
  }

  function renderSlotDetail() {
    const totalSlotItems = uniqueTasks([
      ...selectedSlotTasks,
      ...selectedBreakTasks,
    ]).length

    return (
      <section className="slot-detail" aria-label="时段任务详情">
        <div className="slot-detail-header">
          <div>
            <span>第 {selectedSlot?.label} 时段</span>
            <h2>{selectedSlot?.timeLabel.replace('\n', ' - ')}</h2>
          </div>
          <strong>{totalSlotItems} 项</strong>
        </div>

        <div className="slot-task-list">
          <section className="slot-section">
            <div className="slot-section-title">
              <span>本时段</span>
              <strong>{selectedSlotTasks.length} 项</strong>
            </div>
            {selectedSlotTasks.length === 0 ? (
              <div className="slot-empty">
                <p>这个时段还没有任务</p>
                <span>用右下角加号添加，或把未安排任务拖到这个时段。</span>
              </div>
            ) : (
              selectedSlotTasks.map(renderTaskCard)
            )}
          </section>

          {selectedBreakRange ? (
            <section className="slot-section">
              <div className="slot-section-title is-break">
                <span>
                  休息板块 {selectedBreakRange.start} - {selectedBreakRange.end}
                </span>
                <strong>{selectedBreakTasks.length} 项</strong>
              </div>
              {selectedBreakTasks.length === 0 ? (
                <div className="slot-break-empty">这个间隔暂时空着</div>
              ) : (
                selectedBreakTasks.map(renderTaskCard)
              )}
            </section>
          ) : null}
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
      <section
        className={`phone-shell ${activeTab === 'plan' ? 'has-date-rail' : ''} ${
          dragState?.isDragging ? 'is-dragging' : ''
        }`}
      >
        {activeTab === 'plan' ? (
          <header className="date-rail" aria-label="日期栏" ref={dateRailRef}>
            {dateRail.map((date) => (
              <button
                className={`date-chip ${
                  date === selectedDate ? 'is-selected' : ''
                } ${getMonthTone(date)} ${isWeekend(date) ? 'is-weekend' : ''}`}
                key={date}
                data-date={date}
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
        ) : null}

        <section className="tab-content">
          {activeTab === 'plan' ? (
            <div className="planner-view">
              <aside className="time-rail" aria-label="时间段">
                {TIME_SLOTS.map((slot) => {
                  const taskStats = slotTaskStats[slot.id] || {
                    incompleteCount: 0,
                    totalCount: 0,
                  }

                  return (
                    <button
                      className={`time-slot ${
                        selectedSlotId === slot.id ? 'is-selected' : ''
                      } ${currentSlotId === slot.id ? 'is-current' : ''} ${
                        dragState?.overSlotId === slot.id ? 'is-drop-target' : ''
                      } ${timeRailMode === 'time' ? 'is-time-mode' : ''}`}
                      key={slot.id}
                      data-slot-id={slot.id}
                      type="button"
                      onClick={() => handleSlotClick(slot.id)}
                      onPointerDown={handleSlotPointerDown}
                      onPointerLeave={handleSlotPointerEnd}
                      onPointerUp={handleSlotPointerEnd}
                    >
                      {currentSlotId === slot.id ? (
                        <span className="time-current-arrow" aria-hidden="true">
                          ▶
                        </span>
                      ) : null}
                      {taskStats.totalCount > 0 ? (
                        <span
                          className={`time-task-count ${
                            taskStats.incompleteCount === 0 ? 'is-complete' : ''
                          }`}
                          aria-label={
                            taskStats.incompleteCount === 0
                              ? '该时段任务已完成'
                              : `该时段还有 ${taskStats.incompleteCount} 个未完成任务`
                          }
                        >
                          {taskStats.incompleteCount === 0
                            ? '✓'
                            : taskStats.incompleteCount}
                        </span>
                      ) : null}
                      <span className="time-slot-main">
                        {timeRailMode === 'time'
                          ? slot.timeLabel.split('\n').map((line) => (
                              <span className="time-slot-line" key={line}>
                                {line}
                              </span>
                            ))
                          : slot.label}
                      </span>
                    </button>
                  )
                })}
              </aside>

              {selectedSlotId ? (
                renderSlotDetail()
              ) : (
                <section className="quadrant-board" aria-label="四象限任务区">
                <div className="day-summary">
                  <strong>{formatDateLabel(selectedDate)}</strong>
                  <span>
                    {selectedTasks.length} 项 · 完成率 {completionRate}% · 金币 {coins}
                  </span>
                </div>

                {QUADRANTS.map((quadrant) => {
                  const quadrantTasks = selectedTasks.filter(
                    (task) =>
                      task.important === quadrant.important &&
                      task.urgent === quadrant.urgent,
                  )

                  return (
                    <section
                      className={`quadrant ${
                        dragState?.overQuadrantId === quadrant.id
                          ? 'is-drop-target'
                          : ''
                      }`}
                      data-quadrant-id={quadrant.id}
                      key={quadrant.id}
                    >
                      <div className="quadrant-heading">
                        <h2>{quadrant.title}</h2>
                        <span>{quadrant.hint}</span>
                      </div>

                      <div className="quadrant-tasks">
                        {renderQuadrantTasks(quadrantTasks, quadrant.id)}
                      </div>
                    </section>
                  )
                })}
                </section>
              )}
            </div>
          ) : activeTab === 'review' ? (
            renderReviewView()
          ) : (
            <section className="placeholder-view">
              <h1>{TABS.find((tab) => tab.id === activeTab)?.label}</h1>
              <p>这里先留白，等当日计划稳定后再继续做。</p>
            </section>
          )}
        </section>

        {activeTab === 'plan' ? (
          <button
            className="floating-add"
            type="button"
            aria-label="添加任务"
            onClick={() => openCreatePanel(selectedSlotId || '')}
          >
            +
          </button>
        ) : null}

        <nav className="bottom-tabs" aria-label="主菜单">
          {TABS.map((tab) => (
            <button
              className={activeTab === tab.id ? 'is-active' : ''}
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
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
              <h2>
                {editingTaskId
                  ? taskPanelMode === 'habit'
                    ? '编辑习惯'
                    : '编辑任务'
                  : '添加任务'}
              </h2>
              <button type="button" onClick={closeTaskPanel} aria-label="关闭">
                ×
              </button>
            </div>

            <div className="panel-mode-tabs" aria-label="任务类型">
              <button
                className={taskPanelMode === 'task' ? 'is-active' : ''}
                type="button"
                onClick={() => switchTaskPanelMode('task')}
              >
                日常
              </button>
              <button
                className={taskPanelMode === 'habit' ? 'is-active' : ''}
                type="button"
                onClick={() => switchTaskPanelMode('habit')}
              >
                习惯
              </button>
            </div>

            <label className="field">
              <span>{taskPanelMode === 'habit' ? '习惯' : '任务'}</span>
              <input
                type="text"
                value={taskForm.title}
                onChange={(event) => updateTaskForm('title', event.target.value)}
                placeholder={
                  taskPanelMode === 'habit' ? '例如：背单词 20 分钟' : '写下这件事'
                }
              />
            </label>

            <div className="form-grid">
              {taskPanelMode === 'task' ? (
                <label className="field">
                  <span>日期</span>
                  <input
                    type="date"
                    value={taskForm.taskDate}
                    onChange={(event) =>
                      updateTaskForm('taskDate', event.target.value)
                    }
                  />
                </label>
              ) : null}
            </div>

            <div className="schedule-mode-tabs" aria-label="安排方式">
              <button
                className={taskForm.scheduleMode === 'slot' ? 'is-active' : ''}
                type="button"
                onClick={() => updateTaskForm('scheduleMode', 'slot')}
              >
                选择时段
              </button>
              <button
                className={taskForm.scheduleMode === 'time' ? 'is-active' : ''}
                type="button"
                onClick={() => updateTaskForm('scheduleMode', 'time')}
              >
                开始 / 截止
              </button>
            </div>

            {taskForm.scheduleMode === 'slot' ? (
              <label className="field">
                <span>时段</span>
                <select
                  value={taskForm.slotId}
                  onChange={(event) => updateTaskForm('slotId', event.target.value)}
                >
                  <option value="">无时段安排</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      第 {slot.label} 时段（{slot.start}-{slot.end}）
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="form-grid">
                <label className="field">
                  <span>开始时间</span>
                  <input
                    type="time"
                    value={taskForm.startTime}
                    onChange={(event) =>
                      updateTaskForm('startTime', event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>截止时间</span>
                  <input
                    type="time"
                    value={taskForm.endTime}
                    onChange={(event) => updateTaskForm('endTime', event.target.value)}
                  />
                </label>
              </div>
            )}

            {taskPanelMode === 'habit' ? (
              <fieldset className="weekday-picker">
                <legend>重复星期</legend>
                <div>
                  {WEEKDAY_OPTIONS.map((weekday) => (
                    <button
                      className={
                        taskForm.weekdays.includes(weekday.value) ? 'is-active' : ''
                      }
                      key={weekday.value}
                      type="button"
                      onClick={() => toggleHabitWeekday(weekday.value)}
                    >
                      {weekday.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

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

      {isAiConfigOpen ? (
        <div className="task-panel-backdrop" role="presentation">
          <form className="task-panel ai-config-panel" onSubmit={saveAiConfig}>
            <div className="task-panel-header">
              <h2>AI 接口设置</h2>
              <button
                type="button"
                onClick={() => setIsAiConfigOpen(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <p className="ai-config-note">
              仅保存在当前浏览器本地，适合个人自用；更安全的做法是填写你自己的后端代理接口。
            </p>

            <div className="panel-mode-tabs" aria-label="接口类型">
              <button
                className={aiConfigForm.mode === 'compatible' ? 'is-active' : ''}
                type="button"
                onClick={() => updateAiConfigForm('mode', 'compatible')}
              >
                兼容接口
              </button>
              <button
                className={aiConfigForm.mode === 'custom' ? 'is-active' : ''}
                type="button"
                onClick={() => updateAiConfigForm('mode', 'custom')}
              >
                自定义代理
              </button>
            </div>

            <label className="field">
              <span>接口网址</span>
              <input
                type="url"
                value={aiConfigForm.endpoint}
                onChange={(event) =>
                  updateAiConfigForm('endpoint', event.target.value)
                }
                placeholder="https://api.example.com/v1/chat/completions"
              />
            </label>

            <label className="field">
              <span>API 密钥</span>
              <input
                type="password"
                value={aiConfigForm.apiKey}
                onChange={(event) => updateAiConfigForm('apiKey', event.target.value)}
                placeholder="只保存在本机浏览器"
              />
            </label>

            <label className="field">
              <span>模型名</span>
              <input
                type="text"
                value={aiConfigForm.model}
                onChange={(event) => updateAiConfigForm('model', event.target.value)}
                placeholder="例如 gpt-4o-mini / deepseek-chat"
              />
            </label>

            <div className="ai-config-actions">
              <button className="panel-save" type="submit">
                保存接口
              </button>
              <button
                className="mock-analysis-button"
                type="button"
                onClick={() => {
                  runMockReviewAnalysis()
                  setIsAiConfigOpen(false)
                }}
              >
                先用模拟分析
              </button>
            </div>
          </form>
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
