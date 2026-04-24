/**
 * 百度网盘API封装
 */
import { request } from './request'

const BAIDU_PAN_BASE = 'https://pan.baidu.com/rest/2.0/xpan'

// 百度网盘OAuth配置（需要替换为实际的）
const BAIDU_APP_KEY = 'your_app_key'
const BAIDU_SECRET_KEY = 'your_secret_key'
const REDIRECT_URI = 'https://your-server.com/baidu/callback'

export interface BaiduFileInfo {
  fs_id: number
  path: string
  server_filename: string
  size: number
  isdir: number // 0=文件, 1=目录
  md5: string
  category: number
  server_ctime: number
  server_mtime: number
}

export interface BaiduFileList {
  list: BaiduFileInfo[]
  has_more: number
}

/**
 * 获取百度网盘授权URL
 */
export function getBaiduAuthUrl(): string {
  return `https://openapi.baidu.com/oauth/2.0/authorize?response_type=code&client_id=${BAIDU_APP_KEY}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=basic,netdisk&display=mobile`
}

/**
 * 获取文件列表
 * @param accessToken 百度网盘access_token
 * @param dirPath 目录路径
 */
export async function getFileList(accessToken: string, dirPath: string = '/糖果学英语'): Promise<BaiduFileList> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BAIDU_PAN_BASE}/file?method=list&access_token=${accessToken}&dir=${encodeURIComponent(dirPath)}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data as BaiduFileList)
        } else {
          reject(new Error(`获取文件列表失败: ${res.statusCode}`))
        }
      },
      fail: reject,
    })
  })
}

/**
 * 获取文件下载链接
 */
export async function getFileDownloadUrl(accessToken: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BAIDU_PAN_BASE}/file?method=filemetas&access_token=${accessToken}&path=${encodeURIComponent(filePath)}&dlink=1`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data?.dlink) {
          resolve(res.data.dlink)
        } else {
          reject(new Error('获取下载链接失败'))
        }
      },
      fail: reject,
    })
  })
}

/**
 * 获取文件流式播放链接（用于音视频播放）
 */
export async function getStreamingUrl(accessToken: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BAIDU_PAN_BASE}/file?method=streaming&access_token=${accessToken}&path=${encodeURIComponent(filePath)}&type=M3U8_AUTO`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data as string)
        } else {
          reject(new Error('获取播放链接失败'))
        }
      },
      fail: reject,
    })
  })
}

export { BAIDU_APP_KEY, BAIDU_SECRET_KEY, REDIRECT_URI }
