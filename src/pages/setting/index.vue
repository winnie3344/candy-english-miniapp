<template>
  <view class="setting-container">
    <!-- 密码验证区域 -->
    <view class="auth-section" v-if="!isUnlocked">
      <text class="auth-icon">🔐</text>
      <text class="auth-title">家长验证</text>
      <text class="auth-desc">请输入家长密码才能管理单词</text>
      <view class="password-input-area">
        <input
          v-model="inputPassword"
          class="password-input"
          type="password"
          placeholder="请输入家长密码"
          :focus="!isUnlocked"
        />
      </view>
      <button class="auth-btn" @tap="verifyPassword">验证</button>
      <view class="set-password-hint" v-if="!hasPassword">
        <text class="hint-text">首次使用请先设置家长密码</text>
        <view class="password-input-area">
          <input
            v-model="newPassword"
            class="password-input"
            type="password"
            placeholder="设置家长密码"
          />
        </view>
        <button class="auth-btn secondary" @tap="setPassword">设置密码</button>
      </view>
    </view>

    <!-- 单词管理区域 -->
    <view class="manage-section" v-if="isUnlocked">
      <!-- 学习时间限制 -->
      <view class="time-limit-card">
        <text class="card-title">⏰ 每日学习时间限制</text>
        <view class="limit-toggle">
          <text class="limit-label">启用时间限制</text>
          <switch :checked="timeLimitConfig.enabled" @change="toggleTimeLimit" color="#667eea" />
        </view>
        <view v-if="timeLimitConfig.enabled" class="limit-settings">
          <view class="limit-option">
            <text class="limit-label">每日学习时长</text>
            <view class="limit-presets">
              <view 
                v-for="m in [15, 20, 30, 45, 60]" 
                :key="m" 
                class="preset-minute" 
                :class="{ active: timeLimitConfig.dailyLimitMinutes === m }"
                @tap="setDailyLimit(m)"
              >
                <text>{{ m }}分钟</text>
              </view>
            </view>
          </view>
          <view class="limit-option">
            <text class="limit-label">提前提醒</text>
            <view class="limit-presets">
              <view 
                v-for="m in [3, 5, 10]" 
                :key="m" 
                class="preset-minute" 
                :class="{ active: timeLimitConfig.warningMinutes === m }"
                @tap="setWarningMinutes(m)"
              >
                <text>{{ m }}分钟</text>
              </view>
            </view>
          </view>
          <view class="limit-usage">
            <text class="limit-usage-text">📊 今日已学习: {{ todayUsageStr }}</text>
            <text class="limit-usage-text">⏱ 今日剩余: {{ remainingTimeStr }}</text>
          </view>
        </view>
      </view>

      <!-- 云资源配置 -->
      <view class="cos-config-card">
        <text class="card-title">☁️ 腾讯云COS配置</text>
        <text class="batch-hint">配置后可在「云资源」中播放音视频文件</text>
        <view class="form-group">
          <text class="form-label">Bucket（存储桶名称）</text>
          <input v-model="cosConfig.bucket" class="form-input" placeholder="如 candy-english-1250000000" />
        </view>
        <view class="form-group">
          <text class="form-label">Region（地域）</text>
          <view class="region-presets">
            <view 
              v-for="r in regionOptions" 
              :key="r.value" 
              class="preset-minute" 
              :class="{ active: cosConfig.region === r.value }"
              @tap="cosConfig.region = r.value"
            >
              <text>{{ r.label }}</text>
            </view>
          </view>
        </view>
        <view class="form-group">
          <text class="form-label">SecretId</text>
          <input v-model="cosConfig.secretId" class="form-input" placeholder="腾讯云API密钥SecretId" />
        </view>
        <view class="form-group">
          <text class="form-label">SecretKey</text>
          <input v-model="cosConfig.secretKey" class="form-input" type="password" placeholder="腾讯云API密钥SecretKey" />
        </view>
        <view class="form-group">
          <text class="form-label">文件路径前缀（选填）</text>
          <input v-model="cosConfig.prefix" class="form-input" placeholder="如 糖果学英语/ 或留空" />
        </view>
        <view class="cos-actions">
          <button class="add-btn" @tap="handleSaveCosConfig">保存配置</button>
          <button class="add-btn secondary" @tap="handleTestCosConfig" v-if="cosConfigured">测试连接</button>
          <button class="add-btn danger" @tap="handleClearCosConfig" v-if="cosConfigured">清除配置</button>
        </view>
        <view class="cos-status" v-if="cosConfigured">
          <text class="cos-status-text">✅ 已配置 - Bucket: {{ savedCosConfig?.bucket }}</text>
        </view>
        <view class="cos-help">
          <text class="cos-help-title">💡 如何获取配置信息？</text>
          <text class="cos-help-step">1. 访问 console.cloud.tencent.com/cos 创建存储桶</text>
          <text class="cos-help-step">2. 存储桶选择「公有读、私有写」</text>
          <text class="cos-help-step">3. 访问 console.cloud.tencent.com/cam/capi 获取密钥</text>
          <text class="cos-help-step">4. 下载COSBrowser客户端上传文件</text>
        </view>
      </view>

      <view class="manage-header">
        <text class="manage-title">📚 单词管理</text>
        <text class="word-count">共 {{ allWords.length }} 个单词</text>
      </view>

      <!-- 添加单词 -->
      <view class="add-word-card">
        <text class="card-title">➕ 添加单词</text>
        <view class="form-group">
          <input v-model="newWord" class="form-input" placeholder="英文单词" />
        </view>
        <view class="form-group">
          <input v-model="newMeaning" class="form-input" placeholder="中文释义" />
        </view>
        <view class="form-group">
          <input v-model="newPhonetic" class="form-input" placeholder="音标（选填，如 /æpl/）" />
        </view>
        <view class="form-group">
          <input v-model="newImageUrl" class="form-input" placeholder="配图URL（选填）" />
        </view>
        <button class="add-btn" @tap="addWord">添加</button>
      </view>

      <!-- 批量导入 -->
      <view class="batch-card">
        <text class="card-title">📦 批量导入</text>
        <text class="batch-hint">每行一个单词，格式：单词|释义|音标(选填)</text>
        <textarea
          v-model="batchText"
          class="batch-textarea"
          placeholder="apple|苹果|/æpl/
banana|香蕉|/bəˈnænə/
cat|猫"
          :maxlength="-1"
        />
        <button class="add-btn" @tap="batchImport">导入</button>
      </view>

      <!-- 预设词库 -->
      <view class="preset-card">
        <text class="card-title">🎯 预设词库</text>
        <view class="preset-list">
          <view class="preset-item" @tap="importPreset('basic')">
            <text class="preset-name">基础词汇100</text>
            <text class="preset-count">100词</text>
          </view>
          <view class="preset-item" @tap="importPreset('animal')">
            <text class="preset-name">动物词汇</text>
            <text class="preset-count">30词</text>
          </view>
          <view class="preset-item" @tap="importPreset('food')">
            <text class="preset-name">食物词汇</text>
            <text class="preset-count">40词</text>
          </view>
        </view>
      </view>

      <!-- 深圳小学英语词汇 -->
      <view class="preset-card">
        <text class="card-title">📖 深圳小学英语词汇</text>
        <text class="batch-hint">按年级分册，同步课本词汇</text>
        <view class="grade-section">
          <view class="grade-row" v-for="grade in 6" :key="grade">
            <view class="grade-label">一年级起·{{ grade }}年级</view>
            <view class="grade-books">
              <view class="book-item" @tap="importShenzhenVocab(grade, 1)">
                <text class="book-name">小{{ gradeLabels[grade-1] }}上</text>
                <text class="book-count">{{ shenzhenCounts[grade + '-1'] }}词</text>
              </view>
              <view class="book-item" @tap="importShenzhenVocab(grade, 2)">
                <text class="book-name">小{{ gradeLabels[grade-1] }}下</text>
                <text class="book-count">{{ shenzhenCounts[grade + '-2'] }}词</text>
              </view>
            </view>
          </view>
        </view>
        <view class="import-all-section">
          <button class="add-btn" @tap="importAllShenzhen">一键导入全部词汇</button>
        </view>
      </view>

      <!-- 单词列表 -->
      <view class="word-list">
        <text class="card-title">📋 单词列表</text>
        <view class="word-item" v-for="word in allWords" :key="word.id">
          <view class="word-info">
            <text class="word-en">{{ word.word }}</text>
            <text class="word-cn">{{ word.meaning }}</text>
          </view>
          <view class="word-level">
            <text class="level-tag" :class="'level-' + word.level">
              Lv.{{ word.level }}
            </text>
          </view>
          <view class="word-action" @tap="deleteWord(word.id)">
            <text class="delete-btn">🗑️</text>
          </view>
        </view>
        <view class="empty-list" v-if="allWords.length === 0">
          <text>暂无单词，请添加或导入</text>
        </view>
      </view>

      <!-- 修改密码 -->
      <view class="change-pwd-card">
        <text class="card-title">🔑 修改家长密码</text>
        <view class="form-group">
          <input v-model="oldPassword" class="form-input" type="password" placeholder="旧密码" />
        </view>
        <view class="form-group">
          <input v-model="changeNewPwd" class="form-input" type="password" placeholder="新密码" />
        </view>
        <button class="add-btn secondary" @tap="changePassword">修改密码</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWordStore } from '../../store/word'
import { shenzhenPrimaryVocab, getPresetNames, getPresetCount } from '../../utils/shenzhen-vocab'
import { 
  getTimeLimitConfig, 
  saveTimeLimitConfig, 
  getTodayUsage, 
  getRemainingTime,
  formatSeconds,
  getTodayUsageFormatted,
  type TimeLimitConfig
} from '../../utils/time-limit'
import {
  getCosConfig as loadCosConfig,
  saveCosConfig as saveCosConfigToStorage,
  isCosConfigured as checkCosConfigured,
  listCosFiles,
  type CosConfig,
} from '../../utils/cos-client'

const wordStore = useWordStore()

const isUnlocked = ref(false)
const hasPassword = computed(() => !!uni.getStorageSync('parentPassword'))
const inputPassword = ref('')
const newPassword = ref('')

// 时间限制配置
const timeLimitConfig = ref<TimeLimitConfig>(getTimeLimitConfig())
const todayUsageStr = computed(() => getTodayUsageFormatted())
const remainingTimeStr = computed(() => {
  const remaining = getRemainingTime()
  if (remaining === Infinity) return '无限制'
  return formatSeconds(remaining)
})

// COS云资源配置
const cosConfig = ref<CosConfig>({
  bucket: '',
  region: 'ap-guangzhou',
  secretId: '',
  secretKey: '',
  prefix: '',
})
const savedCosConfig = ref<CosConfig | null>(null)
const cosConfigured = ref(false)

const regionOptions = [
  { label: '广州', value: 'ap-guangzhou' },
  { label: '上海', value: 'ap-shanghai' },
  { label: '北京', value: 'ap-beijing' },
  { label: '成都', value: 'ap-chengdu' },
  { label: '重庆', value: 'ap-chongqing' },
  { label: '南京', value: 'ap-nanjing' },
]

const initCosConfig = () => {
  const config = loadCosConfig()
  if (config) {
    cosConfig.value = { ...config }
    savedCosConfig.value = config
    cosConfigured.value = true
  }
}

const handleSaveCosConfig = () => {
  if (!cosConfig.value.bucket || !cosConfig.value.secretId || !cosConfig.value.secretKey) {
    uni.showToast({ title: '请填写Bucket、SecretId和SecretKey', icon: 'none' })
    return
  }
  // 确保 prefix 以 / 结尾（如果有值的话）
  if (cosConfig.value.prefix && !cosConfig.value.prefix.endsWith('/')) {
    cosConfig.value.prefix += '/'
  }
  saveCosConfigToStorage(cosConfig.value)
  savedCosConfig.value = { ...cosConfig.value }
  cosConfigured.value = true
  uni.showToast({ title: 'COS配置已保存', icon: 'success' })
}

const handleTestCosConfig = async () => {
  uni.showLoading({ title: '测试连接...' })
  try {
    const result = await listCosFiles('')
    uni.hideLoading()
    uni.showModal({
      title: '连接成功',
      content: `找到 ${result.files.length} 个文件/文件夹`,
      showCancel: false,
    })
  } catch (e: any) {
    uni.hideLoading()
    uni.showModal({
      title: '连接失败',
      content: e.message || '请检查配置是否正确',
      showCancel: false,
    })
  }
}

const handleClearCosConfig = () => {
  uni.showModal({
    title: '确认清除',
    content: '确定要清除COS配置吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('cosConfig')
        cosConfig.value = { bucket: '', region: 'ap-guangzhou', secretId: '', secretKey: '', prefix: '' }
        savedCosConfig.value = null
        cosConfigured.value = false
        uni.showToast({ title: '已清除', icon: 'success' })
      }
    },
  })
}

const toggleTimeLimit = (e: any) => {
  timeLimitConfig.value.enabled = e.detail.value
  saveTimeLimitConfig({ enabled: e.detail.value })
}

const setDailyLimit = (minutes: number) => {
  timeLimitConfig.value.dailyLimitMinutes = minutes
  saveTimeLimitConfig({ dailyLimitMinutes: minutes })
}

const setWarningMinutes = (minutes: number) => {
  timeLimitConfig.value.warningMinutes = minutes
  saveTimeLimitConfig({ warningMinutes: minutes })
}

// 添加单词
const newWord = ref('')
const newMeaning = ref('')
const newPhonetic = ref('')
const newImageUrl = ref('')

// 批量导入
const batchText = ref('')

// 修改密码
const oldPassword = ref('')
const changeNewPwd = ref('')

const allWords = computed(() => wordStore.state.allWords)

// 深圳小学词库数据
const gradeLabels = ['一', '二', '三', '四', '五', '六']
const shenzhenCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (let g = 1; g <= 6; g++) {
    const name1 = `小${gradeLabels[g-1]}上`
    const name2 = `小${gradeLabels[g-1]}下`
    counts[`${g}-1`] = getPresetCount(name1)
    counts[`${g}-2`] = getPresetCount(name2)
  }
  return counts
})

const importShenzhenVocab = (grade: number, semester: number) => {
  const name = `小${gradeLabels[grade-1]}${semester === 1 ? '上' : '下'}`
  const vocab = shenzhenPrimaryVocab[name]
  if (!vocab) {
    uni.showToast({ title: '词库不存在', icon: 'none' })
    return
  }
  wordStore.addWords(vocab.words)
  uni.showToast({ title: `已导入「${name}」${vocab.words.length}个单词`, icon: 'success' })
}

const importAllShenzhen = () => {
  let totalCount = 0
  for (const name of getPresetNames()) {
    const vocab = shenzhenPrimaryVocab[name]
    if (vocab) {
      wordStore.addWords(vocab.words)
      totalCount += vocab.words.length
    }
  }
  uni.showToast({ title: `已导入全部${totalCount}个单词`, icon: 'success' })
}

const verifyPassword = () => {
  const saved = uni.getStorageSync('parentPassword')
  if (!saved) {
    uni.showToast({ title: '请先设置家长密码', icon: 'none' })
    return
  }
  if (inputPassword.value === saved) {
    isUnlocked.value = true
    initCosConfig()
  } else {
    uni.showToast({ title: '密码错误', icon: 'none' })
  }
}

const setPassword = () => {
  if (!newPassword.value || newPassword.value.length < 4) {
    uni.showToast({ title: '密码至少4位', icon: 'none' })
    return
  }
  uni.setStorageSync('parentPassword', newPassword.value)
  uni.showToast({ title: '密码设置成功', icon: 'success' })
  isUnlocked.value = true
  initCosConfig()
}

const addWord = () => {
  if (!newWord.value.trim() || !newMeaning.value.trim()) {
    uni.showToast({ title: '请输入单词和释义', icon: 'none' })
    return
  }
  wordStore.addWord({
    word: newWord.value.trim(),
    meaning: newMeaning.value.trim(),
    phonetic: newPhonetic.value.trim(),
    imageUrl: newImageUrl.value.trim(),
  })
  newWord.value = ''
  newMeaning.value = ''
  newPhonetic.value = ''
  newImageUrl.value = ''
  uni.showToast({ title: '添加成功', icon: 'success' })
}

const batchImport = () => {
  if (!batchText.value.trim()) {
    uni.showToast({ title: '请输入要导入的单词', icon: 'none' })
    return
  }
  const lines = batchText.value.trim().split('\n')
  const words: Array<{ word: string; meaning: string; phonetic?: string }> = []
  
  for (const line of lines) {
    const parts = line.split('|').map(s => s.trim())
    if (parts.length >= 2) {
      words.push({
        word: parts[0],
        meaning: parts[1],
        phonetic: parts[2] || undefined,
      })
    }
  }
  
  if (words.length === 0) {
    uni.showToast({ title: '格式不正确', icon: 'none' })
    return
  }
  
  wordStore.addWords(words)
  batchText.value = ''
  uni.showToast({ title: `成功导入${words.length}个单词`, icon: 'success' })
}

const importPreset = (type: string) => {
  let words: Array<{ word: string; meaning: string; phonetic?: string }> = []
  
  if (type === 'basic') {
    words = [
      { word: 'apple', meaning: '苹果', phonetic: '/æpl/' },
      { word: 'book', meaning: '书', phonetic: '/bʊk/' },
      { word: 'cat', meaning: '猫', phonetic: '/kæt/' },
      { word: 'dog', meaning: '狗', phonetic: '/dɒɡ/' },
      { word: 'egg', meaning: '鸡蛋', phonetic: '/eɡ/' },
      { word: 'fish', meaning: '鱼', phonetic: '/fɪʃ/' },
      { word: 'girl', meaning: '女孩', phonetic: '/ɡɜːrl/' },
      { word: 'hand', meaning: '手', phonetic: '/hænd/' },
      { word: 'ice', meaning: '冰', phonetic: '/aɪs/' },
      { word: 'jump', meaning: '跳', phonetic: '/dʒʌmp/' },
      { word: 'king', meaning: '国王', phonetic: '/kɪŋ/' },
      { word: 'lion', meaning: '狮子', phonetic: '/laɪən/' },
      { word: 'moon', meaning: '月亮', phonetic: '/muːn/' },
      { word: 'nose', meaning: '鼻子', phonetic: '/noʊz/' },
      { word: 'orange', meaning: '橙子', phonetic: '/ˈɒrɪndʒ/' },
      { word: 'pen', meaning: '钢笔', phonetic: '/pen/' },
      { word: 'queen', meaning: '女王', phonetic: '/kwiːn/' },
      { word: 'rain', meaning: '雨', phonetic: '/reɪn/' },
      { word: 'sun', meaning: '太阳', phonetic: '/sʌn/' },
      { word: 'tree', meaning: '树', phonetic: '/triː/' },
    ]
  } else if (type === 'animal') {
    words = [
      { word: 'elephant', meaning: '大象', phonetic: '/ˈelɪfənt/' },
      { word: 'giraffe', meaning: '长颈鹿', phonetic: '/dʒɪˈræf/' },
      { word: 'penguin', meaning: '企鹅', phonetic: '/ˈpeŋɡwɪn/' },
      { word: 'dolphin', meaning: '海豚', phonetic: '/ˈdɒlfɪn/' },
      { word: 'butterfly', meaning: '蝴蝶', phonetic: '/ˈbʌtərflaɪ/' },
      { word: 'rabbit', meaning: '兔子', phonetic: '/ˈræbɪt/' },
      { word: 'monkey', meaning: '猴子', phonetic: '/ˈmʌŋki/' },
      { word: 'tiger', meaning: '老虎', phonetic: '/ˈtaɪɡər/' },
      { word: 'panda', meaning: '熊猫', phonetic: '/ˈpændə/' },
      { word: 'whale', meaning: '鲸鱼', phonetic: '/weɪl/' },
    ]
  } else if (type === 'food') {
    words = [
      { word: 'bread', meaning: '面包', phonetic: '/bred/' },
      { word: 'milk', meaning: '牛奶', phonetic: '/mɪlk/' },
      { word: 'cheese', meaning: '奶酪', phonetic: '/tʃiːz/' },
      { word: 'chicken', meaning: '鸡肉', phonetic: '/ˈtʃɪkɪn/' },
      { word: 'rice', meaning: '米饭', phonetic: '/raɪs/' },
      { word: 'pizza', meaning: '披萨', phonetic: '/ˈpiːtsə/' },
      { word: 'cake', meaning: '蛋糕', phonetic: '/keɪk/' },
      { word: 'juice', meaning: '果汁', phonetic: '/dʒuːs/' },
      { word: 'cookie', meaning: '饼干', phonetic: '/ˈkʊki/' },
      { word: 'candy', meaning: '糖果', phonetic: '/ˈkændi/' },
    ]
  }
  
  wordStore.addWords(words)
  uni.showToast({ title: `已导入${words.length}个单词`, icon: 'success' })
}

const deleteWord = (id: string) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个单词吗？',
    success: (res) => {
      if (res.confirm) {
        wordStore.removeWord(id)
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    },
  })
}

const changePassword = () => {
  const saved = uni.getStorageSync('parentPassword')
  if (oldPassword.value !== saved) {
    uni.showToast({ title: '旧密码错误', icon: 'none' })
    return
  }
  if (changeNewPwd.value.length < 4) {
    uni.showToast({ title: '新密码至少4位', icon: 'none' })
    return
  }
  uni.setStorageSync('parentPassword', changeNewPwd.value)
  oldPassword.value = ''
  changeNewPwd.value = ''
  uni.showToast({ title: '密码修改成功', icon: 'success' })
}
</script>

<style scoped>
.setting-container {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 30rpx;
}

.auth-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}

.auth-icon {
  font-size: 100rpx;
  margin-bottom: 30rpx;
}

.auth-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.auth-desc {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 60rpx;
}

.password-input-area {
  width: 100%;
  margin-bottom: 30rpx;
}

.password-input {
  width: 100%;
  height: 88rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
  border: 2rpx solid #e8e8e8;
  box-sizing: border-box;
}

.auth-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 44rpx;
  border: none;
}

.auth-btn::after {
  border: none;
}

.auth-btn.secondary {
  background: #f0f0ff;
  color: #667eea;
  margin-top: 20rpx;
}

.set-password-hint {
  width: 100%;
  margin-top: 40rpx;
}

.hint-text {
  font-size: 26rpx;
  color: #999;
  text-align: center;
  display: block;
  margin-bottom: 20rpx;
}

.manage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.manage-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.word-count {
  font-size: 26rpx;
  color: #999;
}

.add-word-card,
.batch-card,
.preset-card,
.word-list,
.change-pwd-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.time-limit-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.limit-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
}

.limit-label {
  font-size: 28rpx;
  color: #333;
}

.limit-settings {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 2rpx solid #f0f0f0;
}

.limit-option {
  margin-bottom: 24rpx;
}

.limit-option .limit-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 16rpx;
  display: block;
}

.limit-presets {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.preset-minute {
  padding: 14rpx 28rpx;
  background: #f5f6fa;
  border-radius: 30rpx;
  font-size: 26rpx;
  color: #666;
  border: 2rpx solid transparent;
  transition: all 0.2s;
}

.preset-minute.active {
  background: #f0f0ff;
  color: #667eea;
  border-color: #667eea;
  font-weight: bold;
}

.limit-usage {
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  margin-top: 10rpx;
}

.limit-usage-text {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.limit-usage-text:last-child {
  margin-bottom: 0;
}

.card-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.form-group {
  margin-bottom: 20rpx;
}

.form-input {
  width: 100%;
  height: 76rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #333;
  border: 2rpx solid transparent;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #667eea;
}

.add-btn {
  width: 100%;
  height: 76rpx;
  line-height: 76rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: bold;
  border-radius: 38rpx;
  border: none;
  margin-top: 10rpx;
}

.add-btn::after {
  border: none;
}

.add-btn.secondary {
  background: #f0f0ff;
  color: #667eea;
}

.add-btn.danger {
  background: #fff0f0;
  color: #ff4d4f;
}

/* COS配置卡片 */
.cos-config-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.form-label {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.region-presets {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  margin-top: 8rpx;
}

.cos-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.cos-actions .add-btn {
  flex: 1;
  font-size: 26rpx;
  height: 68rpx;
  line-height: 68rpx;
}

.cos-status {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: #f0fff0;
  border-radius: 12rpx;
}

.cos-status-text {
  font-size: 24rpx;
  color: #52c41a;
}

.cos-help {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
}

.cos-help-title {
  font-size: 26rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 12rpx;
  display: block;
}

.cos-help-step {
  font-size: 22rpx;
  color: #999;
  line-height: 1.8;
  display: block;
  word-break: break-all;
}

.batch-hint {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 16rpx;
  display: block;
}

.batch-textarea {
  width: 100%;
  height: 240rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
  margin-bottom: 16rpx;
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
}

.preset-name {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.preset-count {
  font-size: 24rpx;
  color: #667eea;
}

.word-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f6fa;
}

.word-item:last-child {
  border-bottom: none;
}

.word-info {
  flex: 1;
}

.word-en {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.word-cn {
  font-size: 24rpx;
  color: #999;
}

.word-level {
  margin-right: 20rpx;
}

.level-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.level-0 { background: #f0f0f0; color: #999; }
.level-1 { background: #fff0e0; color: #fa8c16; }
.level-2 { background: #e6f7ff; color: #1890ff; }
.level-3 { background: #f0f5ff; color: #2f54eb; }
.level-4 { background: #f9f0ff; color: #722ed1; }
.level-5 { background: #e6fffb; color: #13c2c2; }
.level-6 { background: #f6ffed; color: #52c41a; }

.delete-btn {
  font-size: 32rpx;
  padding: 10rpx;
}

.empty-list {
  text-align: center;
  padding: 40rpx;
  color: #ccc;
  font-size: 26rpx;
}

.grade-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.grade-row {
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
}

.grade-label {
  font-size: 26rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.grade-books {
  display: flex;
  gap: 16rpx;
}

.book-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 16rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 2rpx solid #e8e8e8;
  transition: all 0.2s;
}

.book-item:active {
  border-color: #667eea;
  background: #f0f0ff;
}

.book-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 6rpx;
}

.book-count {
  font-size: 22rpx;
  color: #667eea;
}

.import-all-section {
  margin-top: 24rpx;
}
</style>
