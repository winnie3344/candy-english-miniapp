/**
 * 腾讯云COS客户端封装
 * 
 * 使用前需要在「家长设置」中配置以下信息：
 * - Bucket: 存储桶名称，如 candy-english-1250000000
 * - Region: 地域，如 ap-guangzhou
 * - SecretId: 腾讯云 API SecretId
 * - SecretKey: 腾讯云 API SecretKey
 * 
 * 获取方式：
 * 1. 注册腾讯云账号 https://cloud.tencent.com
 * 2. 开通对象存储COS https://console.cloud.tencent.com/cos
 * 3. 创建存储桶（选择：标准存储、公有读私有写、广州/上海地域）
 * 4. 在访问管理 → API密钥中获取 SecretId 和 SecretKey
 * 5. 安装 COSBrowser 客户端上传文件：https://cosbrowser.cloud.tencent.com/
 */

import CryptoJS from 'crypto-js'

// ============ COS配置 ============

export interface CosConfig {
  bucket: string      // 存储桶名称，如 candy-english-1250000000
  region: string      // 地域，如 ap-guangzhou
  secretId: string    // 腾讯云 SecretId
  secretKey: string   // 腾讯云 SecretKey
  prefix: string      // 文件前缀（文件夹路径），如 糖果学英语/
}

const COS_CONFIG_KEY = 'cosConfig'

/** 获取COS配置 */
export function getCosConfig(): CosConfig | null {
  const config = uni.getStorageSync(COS_CONFIG_KEY)
  if (!config || !config.bucket || !config.secretId) return null
  return config as CosConfig
}

/** 保存COS配置 */
export function saveCosConfig(config: CosConfig) {
  uni.setStorageSync(COS_CONFIG_KEY, config)
}

/** 检查COS是否已配置 */
export function isCosConfigured(): boolean {
  return !!getCosConfig()
}

// ============ 签名工具 ============

/**
 * 生成COS请求签名（临时方案，签名在客户端生成）
 * 注意：SecretKey会暴露在前端，仅适用于家庭个人使用场景
 * 生产环境应使用临时密钥（STS），通过后端代理获取
 */
function hmacSha1Hex(key: string, message: string): string {
  return CryptoJS.HmacSHA1(message, key).toString(CryptoJS.enc.Hex)
}

/**
 * COS安全的URI编码（与官方cos-js-sdk-v5一致）
 * encodeURIComponent基础上替换!、'、(、)、*
 */
function camSafeUrlEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

/**
 * 生成COS请求签名
 * 查询参数不参与签名（q-url-param-list为空），只签名host头
 * 这样可以避免URL编码/解码导致的签名不匹配问题
 * 查询参数在URL中正常传递即可
 */
function getAuthorization(config: CosConfig, method: string, path: string): string {
  const now = Math.floor(Date.now() / 1000)
  const keyTime = `${now};${now + 3600}`

  // 1. SignKey = HMAC-SHA1(SecretKey, KeyTime)
  const signKey = hmacSha1Hex(config.secretKey, keyTime)

  // 2. HttpParameters 为空（查询参数不参与签名）
  const formatParameters = ''

  // 3. HttpHeaders: 仅签host（key小写，value URI编码）
  const hostStr = `${config.bucket}.cos.${config.region}.myqcloud.com`
  const formatHeaders = `host=${camSafeUrlEncode(hostStr.toLowerCase())}`

  // 4. HttpString = HttpMethod\nUriPath\nFormatParameters\nFormatHeaders\n
  const httpString = `${method.toLowerCase()}\n${path}\n${formatParameters}\n${formatHeaders}\n`

  // 5. StringToSign
  const stringToSign = `sha1\n${keyTime}\n${CryptoJS.SHA1(httpString).toString()}\n`

  // 6. Signature
  const signature = hmacSha1Hex(signKey, stringToSign)

  // 7. Authorization（q-url-param-list为空）
  return `q-sign-algorithm=sha1&q-ak=${config.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`
}

// ============ COS API ============

export interface CosFileInfo {
  key: string           // 文件完整路径
  name: string          // 文件名
  size: number          // 文件大小（字节）
  lastModified: string  // 最后修改时间
  isDir: boolean        // 是否为目录
}

export interface CosFileListResult {
  files: CosFileInfo[]
  prefixes: string[]    // 子目录路径
  isTruncated: boolean  // 是否还有更多
}

/**
 * 获取文件列表
 * @param prefix 目录前缀，如 '糖果学英语/'
 * @param delimiter 分隔符，默认 '/'
 */
export async function listCosFiles(prefix: string = '', delimiter: string = '/'): Promise<CosFileListResult> {
  const config = getCosConfig()
  if (!config) throw new Error('COS未配置')

  const fullPrefix = (config.prefix || '') + prefix
  const host = `${config.bucket}.cos.${config.region}.myqcloud.com`
  const path = '/'

  // 查询参数不参与签名，直接用原始参数构建URL
  const queryString = `prefix=${encodeURIComponent(fullPrefix)}&delimiter=${encodeURIComponent(delimiter)}&max-keys=200`
  const url = `https://${host}${path}?${queryString}`

  const authorization = getAuthorization(config, 'GET', path)

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'GET',
      header: {
        'Authorization': authorization,
        'Host': host,
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const result = parseListResult(res.data as string, config.prefix || '')
          resolve(result)
        } else {
          reject(new Error(`COS请求失败: ${res.statusCode} ${JSON.stringify(res.data)}`))
        }
      },
      fail: (err) => {
        reject(new Error(`COS网络错误: ${err.errMsg}`))
      },
    })
  })
}

/**
 * 解析COS List Bucket返回的XML
 */
function parseListResult(xml: string, basePrefix: string): CosFileListResult {
  const files: CosFileInfo[] = []
  const prefixes: string[] = []

  // 解析Contents（文件）
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g
  let match
  while ((match = contentRegex.exec(xml)) !== null) {
    const content = match[1]
    const key = extractXmlValue(content, 'Key') || ''
    const size = parseInt(extractXmlValue(content, 'Size') || '0', 10)
    const lastModified = extractXmlValue(content, 'LastModified') || ''

    // 去掉基础前缀，只保留相对路径
    const relativeKey = key.startsWith(basePrefix) ? key.slice(basePrefix.length) : key

    // 跳过目录标记文件（以/结尾的0字节文件）
    if (relativeKey && !relativeKey.endsWith('/')) {
      const name = relativeKey.split('/').pop() || relativeKey
      files.push({
        key: relativeKey,
        name,
        size,
        lastModified,
        isDir: false,
      })
    }
  }

  // 解析CommonPrefixes（子目录）
  const prefixRegex = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g
  while ((match = prefixRegex.exec(xml)) !== null) {
    const content = match[1]
    const prefix = extractXmlValue(content, 'Prefix') || ''
    const relativePrefix = prefix.startsWith(basePrefix) ? prefix.slice(basePrefix.length) : prefix
    if (relativePrefix) {
      prefixes.push(relativePrefix)
      // 添加目录项
      const dirName = relativePrefix.replace(/\/$/, '').split('/').pop() || relativePrefix
      files.push({
        key: relativePrefix,
        name: dirName,
        size: 0,
        lastModified: '',
        isDir: true,
      })
    }
  }

  const isTruncated = extractXmlValue(xml, 'IsTruncated') === 'true'

  // 排序：目录在前，文件在后；同类按名称排序
  files.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name, 'zh')
  })

  return { files, prefixes, isTruncated }
}

function extractXmlValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`)
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

/**
 * 获取文件的公开访问URL
 * 如果存储桶是公有读，直接拼接URL即可
 * 如果是私有读，需要生成签名URL
 */
export function getFileUrl(fileKey: string): string {
  const config = getCosConfig()
  if (!config) throw new Error('COS未配置')

  const fullKey = (config.prefix || '') + fileKey
  return `https://${config.bucket}.cos.${config.region}.myqcloud.com/${encodeURIComponent(fullKey).replace(/%2F/g, '/')}`
}

/**
 * 获取带签名的私有访问URL（有效期1小时）
 * 查询参数不参与签名，只签名host头
 */
export function getSignedUrl(fileKey: string, expireSeconds: number = 3600): string {
  const config = getCosConfig()
  if (!config) throw new Error('COS未配置')

  const fullKey = (config.prefix || '') + fileKey
  const host = `${config.bucket}.cos.${config.region}.myqcloud.com`
  const path = `/${fullKey}`
  const now = Math.floor(Date.now() / 1000)
  const expireTime = now + expireSeconds
  const keyTime = `${now};${expireTime}`

  const signKey = hmacSha1Hex(config.secretKey, keyTime)
  // 查询参数不参与签名
  const formatHeaders = `host=${camSafeUrlEncode(host.toLowerCase())}`
  const httpString = `get\n${path}\n\n${formatHeaders}\n`
  const stringToSign = `sha1\n${keyTime}\n${CryptoJS.SHA1(httpString).toString()}\n`
  const signature = hmacSha1Hex(signKey, stringToSign)

  const auth = `q-sign-algorithm=sha1&q-ak=${config.secretId}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`

  return `https://${host}${path}?${auth}`
}

/**
 * 获取文件扩展名
 */
export function getFileExt(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * 根据扩展名判断文件类型图标
 */
export function getFileIcon(filename: string): string {
  const ext = getFileExt(filename)
  const iconMap: Record<string, string> = {
    mp3: '🎵', wav: '🎵', m4a: '🎵', aac: '🎵', flac: '🎵', ogg: '🎵',
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
    pdf: '📄',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
    txt: '📝', doc: '📝', docx: '📝',
  }
  return iconMap[ext] || '📎'
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  if (bytes < 1024) return bytes + 'B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + 'MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + 'GB'
}

/**
 * 判断文件是否可在线播放/预览
 */
export function isPlayableFile(filename: string): boolean {
  const ext = getFileExt(filename)
  return ['mp3', 'wav', 'm4a', 'aac', 'mp4', 'mov', 'webm', 'pdf'].includes(ext)
}

/**
 * 获取文件类型（用于播放器选择）
 */
export function getFileMediaType(filename: string): 'audio' | 'video' | 'pdf' | 'other' {
  const ext = getFileExt(filename)
  if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(ext)) return 'audio'
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video'
  if (ext === 'pdf') return 'pdf'
  return 'other'
}
