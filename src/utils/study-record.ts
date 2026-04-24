/**
 * 学习记录统计工具
 */

export interface FlashcardRecord {
  id: string
  date: string // YYYY-MM-DD
  duration: number // 学习时长(秒)
  wordCount: number // 学习单词数
  correctCount: number // 认识的单词数
  timestamp: number
}

export interface FilePlayRecord {
  id: string
  fileName: string
  filePath: string
  fileType: 'mp3' | 'mp4' | 'pdf'
  playDuration: number // 播放时长(秒)
  totalDuration: number // 文件总时长(秒)
  date: string // YYYY-MM-DD
  timestamp: number
}

export interface StudyStats {
  totalDays: number
  totalFlashcardTime: number
  totalWords: number
  totalPlayTime: number
  streak: number // 连续学习天数
}

// ========== 闪卡记录 ==========

export function saveFlashcardRecord(record: Omit<FlashcardRecord, 'id' | 'timestamp'>): void {
  const records = getFlashcardRecords()
  const newRecord: FlashcardRecord = {
    ...record,
    id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  }
  records.push(newRecord)
  uni.setStorageSync('flashcardRecords', records)
}

export function getFlashcardRecords(): FlashcardRecord[] {
  return uni.getStorageSync('flashcardRecords') || []
}

// ========== 文件播放记录 ==========

export function saveFilePlayRecord(record: Omit<FilePlayRecord, 'id' | 'timestamp'>): void {
  const records = getFilePlayRecords()
  const newRecord: FilePlayRecord = {
    ...record,
    id: `fp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  }
  records.push(newRecord)
  uni.setStorageSync('filePlayRecords', records)
}

export function getFilePlayRecords(): FilePlayRecord[] {
  return uni.getStorageSync('filePlayRecords') || []
}

// ========== 统计数据 ==========

export function getStudyStats(): StudyStats {
  const flashcardRecords = getFlashcardRecords()
  const playRecords = getFilePlayRecords()

  // 总学习天数
  const daysSet = new Set<string>()
  flashcardRecords.forEach(r => daysSet.add(r.date))
  playRecords.forEach(r => daysSet.add(r.date))

  // 连续学习天数
  const today = new Date().toISOString().split('T')[0]
  const sortedDays = Array.from(daysSet).sort().reverse()
  let streak = 0
  let checkDate = new Date(today)
  
  for (const day of sortedDays) {
    const checkStr = checkDate.toISOString().split('T')[0]
    if (day === checkStr) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    totalDays: daysSet.size,
    totalFlashcardTime: flashcardRecords.reduce((sum, r) => sum + r.duration, 0),
    totalWords: flashcardRecords.reduce((sum, r) => sum + r.wordCount, 0),
    totalPlayTime: playRecords.reduce((sum, r) => sum + r.playDuration, 0),
    streak,
  }
}

/**
 * 获取最近N天的闪卡记录
 */
export function getRecentFlashcardRecords(days: number = 7): FlashcardRecord[] {
  const records = getFlashcardRecords()
  const now = Date.now()
  const threshold = now - days * 24 * 60 * 60 * 1000
  return records.filter(r => r.timestamp >= threshold)
}

/**
 * 获取最近N天的播放记录
 */
export function getRecentPlayRecords(days: number = 7): FilePlayRecord[] {
  const records = getFilePlayRecords()
  const now = Date.now()
  const threshold = now - days * 24 * 60 * 60 * 1000
  return records.filter(r => r.timestamp >= threshold)
}
