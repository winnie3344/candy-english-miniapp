# 🍬 糖果学英语 - uni-app 微信小程序

趣味英语学习小程序，基于 uni-app (Vue 3 + TypeScript) 开发。

## 📱 功能概览

### 1. 注册/登录
- 用户注册、登录
- Token 持久化存储

### 2. 闪卡学习 📇
- **艾宾浩斯遗忘曲线**：科学安排复习间隔（1天→2天→4天→7天→15天→30天）
- **美式英语发音**：点击声音按钮播放标准发音
- **录音评分**：录音后系统给出发音评分，支持回放
- **学习统计**：记录每次闪卡时长和单词数

### 3. 家长设置 ⚙️
- **密码保护**：必须输入家长密码才能管理单词
- **添加单词**：手动添加单个单词
- **批量导入**：支持"单词|释义|音标"格式批量导入
- **预设词库**：内置基础词汇、动物词汇、食物词汇
- **修改密码**：可修改家长密码

### 4. 百度网盘学习 ☁️
- **OAuth 授权**：登录百度网盘
- **文件夹浏览**：默认加载"糖果学英语"文件夹
- **音视频播放**：支持 MP3/MP4 播放
- **PDF 预览**：支持 PDF 文件查看
- **后台播放**：音频支持后台播放，锁屏也能听
- **倍速调节**：0.5x - 2.0x 播放速度调节
- **学习轨迹**：记录每个文件的播放时长

## 📂 项目结构

```
src/
├── pages/
│   ├── login/index.vue        # 登录页
│   ├── register/index.vue     # 注册页
│   ├── home/index.vue         # 首页（TabBar）
│   ├── flashcard/index.vue    # 闪卡学习页
│   ├── setting/index.vue      # 家长设置页（TabBar）
│   ├── baidu-cloud/index.vue  # 百度网盘文件浏览页
│   └── cloud-player/index.vue # 音视频/PDF播放页
├── store/
│   ├── user.ts                # 用户状态管理
│   ├── word.ts                # 单词状态管理
│   └── baidu-cloud.ts         # 百度网盘状态管理
├── utils/
│   ├── request.ts             # 网络请求封装
│   ├── ebbinghaus.ts          # 艾宾浩斯遗忘曲线算法
│   ├── baidu-pan.ts           # 百度网盘API封装
│   └── study-record.ts        # 学习记录统计
├── App.vue                    # 应用入口
├── main.ts                    # 主入口
├── pages.json                 # 路由配置
└── manifest.json              # 应用配置
```

## 🚀 运行项目

### H5 预览（开发调试）
```bash
npm run dev:h5
```
访问 http://localhost:5173

### 编译为微信小程序
```bash
npm run dev:mp-weixin
```
生成的文件在 `dist/dev/mp-weixin`，用微信开发者工具打开即可。

## ⚡ 待接入服务

| 服务 | 说明 | 当前状态 |
|------|------|---------|
| 用户后端 API | 注册/登录/Token验证 | 模拟数据 |
| 百度网盘 OAuth | 网盘授权登录 | 模拟数据 |
| 语音评测 API | 科大讯飞/腾讯云语音评分 | 模拟评分 |
| TTS 发音服务 | 有道词典API/系统TTS | 部分实现 |

## 🔧 配置说明

1. **百度网盘**：在 `utils/baidu-pan.ts` 中替换 `BAIDU_APP_KEY` 和 `BAIDU_SECRET_KEY`
2. **后端 API**：在 `utils/request.ts` 中替换 `BASE_URL`
3. **微信小程序 AppID**：在 `manifest.json` 的 `mp-weixin.appid` 中配置
