/**
 * 艾宾浩斯遗忘曲线复习算法
 * 复习间隔：1天、2天、4天、7天、15天、30天
 */

export interface ReviewWord {
  id: string
  word: string
  phonetic?: string
  meaning: string
  imageUrl?: string
  audioUrl?: string
  // 复习相关字段
  level: number // 当前复习等级 0-6
  nextReviewTime: number // 下次复习时间戳
  lastReviewTime: number // 上次复习时间
  reviewCount: number // 已复习次数
  correctCount: number // 正确次数
}

// 艾宾浩斯复习间隔（毫秒）
const REVIEW_INTERVALS = [
  0,               // 立即（新词）
  1 * 24 * 60 * 60 * 1000,   // 1天
  2 * 24 * 60 * 60 * 1000,   // 2天
  4 * 24 * 60 * 60 * 1000,   // 4天
  7 * 24 * 60 * 60 * 1000,   // 7天
  15 * 24 * 60 * 60 * 1000,  // 15天
  30 * 24 * 60 * 60 * 1000,  // 30天
]

/**
 * 获取今日需要复习的单词
 */
export function getTodayReviewWords(allWords: ReviewWord[], newWordCount: number = 5): ReviewWord[] {
  const now = Date.now()
  const reviewWords: ReviewWord[] = []
  const newWords: ReviewWord[] = []

  for (const word of allWords) {
    if (word.level === 0) {
      newWords.push(word)
    } else if (word.nextReviewTime <= now) {
      reviewWords.push(word)
    }
  }

  reviewWords.sort((a, b) => a.nextReviewTime - b.nextReviewTime)
  newWords.sort((a, b) => a.lastReviewTime - b.lastReviewTime)
  const todayNewWords = newWords.slice(0, newWordCount)

  return [...reviewWords, ...todayNewWords]
}

/**
 * 标记单词复习结果
 */
export function markReviewResult(word: ReviewWord, remembered: boolean): ReviewWord {
  const updated = { ...word }
  updated.reviewCount++
  updated.lastReviewTime = Date.now()

  if (remembered) {
    updated.correctCount++
    updated.level = Math.min(updated.level + 1, 6)
  } else {
    updated.level = Math.max(updated.level - 1, 1)
  }

  if (updated.level < REVIEW_INTERVALS.length) {
    updated.nextReviewTime = Date.now() + REVIEW_INTERVALS[updated.level]
  }

  return updated
}

/**
 * 创建新单词
 */
export function createNewWord(params: {
  word: string
  meaning: string
  phonetic?: string
  imageUrl?: string
  audioUrl?: string
}): ReviewWord {
  return {
    id: `word_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    word: params.word,
    phonetic: params.phonetic || '',
    meaning: params.meaning,
    imageUrl: params.imageUrl || '',
    audioUrl: params.audioUrl || '',
    level: 0,
    nextReviewTime: 0,
    lastReviewTime: Date.now(),
    reviewCount: 0,
    correctCount: 0,
  }
}

/**
 * 获取单词的复习进度信息
 */
export function getWordProgress(word: ReviewWord) {
  const totalLevels = 6
  const progress = Math.round((word.level / totalLevels) * 100)
  const nextReviewDate = word.level === 0
    ? '待学习'
    : new Date(word.nextReviewTime).toLocaleDateString('zh-CN')

  return { totalLevels, currentLevel: word.level, progress, nextReviewDate }
}
