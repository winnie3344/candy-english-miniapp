/**
 * 单词状态管理
 */
import { reactive } from 'vue'
import { type ReviewWord, createNewWord, getTodayReviewWords, markReviewResult } from '../utils/ebbinghaus'

interface WordState {
  allWords: ReviewWord[]
  todayWords: ReviewWord[]
  currentIndex: number
  // 闪卡会话统计
  sessionStartTime: number
  sessionWordCount: number
  sessionCorrectCount: number
}

const state = reactive<WordState>({
  allWords: uni.getStorageSync('allWords') || [],
  todayWords: [],
  currentIndex: 0,
  sessionStartTime: 0,
  sessionWordCount: 0,
  sessionCorrectCount: 0,
})

export function useWordStore() {
  const loadTodayWords = (newWordCount: number = 5) => {
    state.allWords = uni.getStorageSync('allWords') || []
    state.todayWords = getTodayReviewWords(state.allWords, newWordCount)
    state.currentIndex = 0
    state.sessionStartTime = Date.now()
    state.sessionWordCount = 0
    state.sessionCorrectCount = 0
  }

  const addWord = (params: { word: string; meaning: string; phonetic?: string; imageUrl?: string; audioUrl?: string }) => {
    const newWord = createNewWord(params)
    state.allWords.push(newWord)
    saveWords()
    return newWord
  }

  const addWords = (words: Array<{ word: string; meaning: string; phonetic?: string; imageUrl?: string; audioUrl?: string }>) => {
    for (const w of words) {
      const newWord = createNewWord(w)
      state.allWords.push(newWord)
    }
    saveWords()
  }

  const removeWord = (id: string) => {
    state.allWords = state.allWords.filter(w => w.id !== id)
    saveWords()
  }

  const markResult = (remembered: boolean) => {
    if (state.currentIndex < state.todayWords.length) {
      const word = state.todayWords[state.currentIndex]
      const updated = markReviewResult(word, remembered)
      
      // 更新allWords中对应的单词
      const idx = state.allWords.findIndex(w => w.id === word.id)
      if (idx >= 0) {
        state.allWords[idx] = updated
      }
      
      state.todayWords[state.currentIndex] = updated
      state.sessionWordCount++
      if (remembered) state.sessionCorrectCount++
      
      saveWords()
    }
  }

  const nextWord = (): ReviewWord | null => {
    state.currentIndex++
    if (state.currentIndex < state.todayWords.length) {
      return state.todayWords[state.currentIndex]
    }
    return null
  }

  const getCurrentWord = (): ReviewWord | null => {
    if (state.currentIndex < state.todayWords.length) {
      return state.todayWords[state.currentIndex]
    }
    return null
  }

  const saveWords = () => {
    uni.setStorageSync('allWords', state.allWords)
  }

  const getSessionDuration = (): number => {
    return Math.floor((Date.now() - state.sessionStartTime) / 1000)
  }

  const getTotalWordCount = (): number => state.allWords.length
  const getMasteredCount = (): number => state.allWords.filter(w => w.level >= 5).length
  const getLearningCount = (): number => state.allWords.filter(w => w.level > 0 && w.level < 5).length
  const getNewCount = (): number => state.allWords.filter(w => w.level === 0).length

  return {
    state,
    loadTodayWords,
    addWord,
    addWords,
    removeWord,
    markResult,
    nextWord,
    getCurrentWord,
    saveWords,
    getSessionDuration,
    getTotalWordCount,
    getMasteredCount,
    getLearningCount,
    getNewCount,
  }
}
