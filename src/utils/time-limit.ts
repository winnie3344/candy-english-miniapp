/**
 * 每日学习时间限制工具
 * 家长可以设置每日学习时长上限，到时间后自动提示休息
 */

export interface TimeLimitConfig {
  enabled: boolean       // 是否启用时间限制
  dailyLimitMinutes: number  // 每日学习时长上限（分钟）
  warningMinutes: number     // 提前N分钟提醒
}

const DEFAULT_CONFIG: TimeLimitConfig = {
  enabled: false,
  dailyLimitMinutes: 30,
  warningMinutes: 5,
}

const STORAGE_KEY = 'timeLimitConfig'
const TODAY_USAGE_KEY = 'todayStudyUsage'

export interface DailyUsage {
  date: string           // YYYY-MM-DD
  totalSeconds: number   // 今日已学习秒数
  flashcardSeconds: number
  playSeconds: number
}

/**
 * 获取时间限制配置
 */
export function getTimeLimitConfig(): TimeLimitConfig {
  const saved = uni.getStorageSync(STORAGE_KEY)
  if (saved) {
    return { ...DEFAULT_CONFIG, ...saved }
  }
  return { ...DEFAULT_CONFIG }
}

/**
 * 保存时间限制配置（需要家长密码验证后才能调用）
 */
export function saveTimeLimitConfig(config: Partial<TimeLimitConfig>): void {
  const current = getTimeLimitConfig()
  const updated = { ...current, ...config }
  uni.setStorageSync(STORAGE_KEY, updated)
}

/**
 * 获取今日学习使用情况
 */
export function getTodayUsage(): DailyUsage {
  const today = new Date().toISOString().split('T')[0]
  const saved: DailyUsage | null = uni.getStorageSync(TODAY_USAGE_KEY)
  
  if (!saved || saved.date !== today) {
    // 新的一天，重置
    const newUsage: DailyUsage = {
      date: today,
      totalSeconds: 0,
      flashcardSeconds: 0,
      playSeconds: 0,
    }
    uni.setStorageSync(TODAY_USAGE_KEY, newUsage)
    return newUsage
  }
  return saved
}

/**
 * 增加今日闪卡学习时间
 */
export function addFlashcardTime(seconds: number): void {
  const usage = getTodayUsage()
  usage.flashcardSeconds += seconds
  usage.totalSeconds = usage.flashcardSeconds + usage.playSeconds
  uni.setStorageSync(TODAY_USAGE_KEY, usage)
}

/**
 * 增加今日播放学习时间
 */
export function addPlayTime(seconds: number): void {
  const usage = getTodayUsage()
  usage.playSeconds += seconds
  usage.totalSeconds = usage.flashcardSeconds + usage.playSeconds
  uni.setStorageSync(TODAY_USAGE_KEY, usage)
}

/**
 * 检查是否已经超过今日学习时间限制
 */
export function isTimeLimitExceeded(): boolean {
  const config = getTimeLimitConfig()
  if (!config.enabled) return false
  
  const usage = getTodayUsage()
  const limitSeconds = config.dailyLimitMinutes * 60
  return usage.totalSeconds >= limitSeconds
}

/**
 * 检查是否接近时间限制（需要提醒）
 */
export function isTimeLimitWarning(): boolean {
  const config = getTimeLimitConfig()
  if (!config.enabled) return false
  
  const usage = getTodayUsage()
  const limitSeconds = config.dailyLimitMinutes * 60
  const warningSeconds = (config.dailyLimitMinutes - config.warningMinutes) * 60
  
  return usage.totalSeconds >= warningSeconds && usage.totalSeconds < limitSeconds
}

/**
 * 获取今日剩余学习时间（秒）
 */
export function getRemainingTime(): number {
  const config = getTimeLimitConfig()
  if (!config.enabled) return Infinity
  
  const usage = getTodayUsage()
  const limitSeconds = config.dailyLimitMinutes * 60
  return Math.max(0, limitSeconds - usage.totalSeconds)
}

/**
 * 获取今日已学习时间（格式化字符串）
 */
export function getTodayUsageFormatted(): string {
  const usage = getTodayUsage()
  const minutes = Math.floor(usage.totalSeconds / 60)
  const seconds = usage.totalSeconds % 60
  return `${minutes}分${seconds}秒`
}

/**
 * 格式化秒数为可读时间
 */
export function formatSeconds(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分`
  }
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  }
  return `${seconds}秒`
}

/**
 * 时间限制检查计时器
 * 在学习页面使用，定期检查是否超时
 */
export class TimeLimitChecker {
  private timer: ReturnType<typeof setInterval> | null = null
  private onWarning: (() => void) | null = null
  private onLimitReached: (() => void) | null = null
  private warned = false

  constructor(
    onWarning: () => void,
    onLimitReached: () => void
  ) {
    this.onWarning = onWarning
    this.onLimitReached = onLimitReached
  }

  start(checkIntervalSeconds: number = 30) {
    this.warned = false
    this.stop()
    
    // 首次检查
    this.check()
    
    this.timer = setInterval(() => {
      this.check()
    }, checkIntervalSeconds * 1000)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private check() {
    if (isTimeLimitExceeded()) {
      this.stop()
      this.onLimitReached?.()
    } else if (isTimeLimitWarning() && !this.warned) {
      this.warned = true
      this.onWarning?.()
    }
  }
}
