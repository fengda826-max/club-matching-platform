# 部署常见错误与解决方案手册

> 本文档记录了 `club-matching-platform` 在 GitHub + Render 部署过程中遇到的所有问题，以及完整的解决方案。
> 供以后部署同类项目时参考，避免重复踩坑。

---

## 目录

- [1. Git 推送 GitHub 失败：Connection was reset](#1-git-推送-github-失败-connection-was-reset)
- [2. 构建失败：cd: can't cd to backend](#2-构建失败-cd-cant-cd-to-backend)
- [3. 构建失败：vite: not found](#3-构建失败-vite-not-found)
- [4. 构建失败：Cannot find native binding for rolldown](#4-构建失败-cannot-find-native-binding-for-rolldown)
- [5. 运行时错误：500 CORS 错误，Not allowed by CORS](#5-运行时错误-500-cors-错误-not-allowed-by-cors)
- [6. 运行时错误：页面显示"后端服务不可用"](#6-运行时错误-页面显示后端服务不可用)
- [7. 经验总结](#7-经验总结)

---

## 1. Git 推送 GitHub 失败：Connection was reset

### 错误现象

```bash
fatal: unable to access 'https://github.com/username/repo.git/':
  Recv failure: Connection was reset
```

### 原因分析

在中国大陆网络环境下，直接访问 GitHub 经常被墙，连接被重置。需要配置 Git 使用代理服务器。

### 解决方案

如果你有本地代理（通常运行在 `127.0.0.1:7890` 或 `127.0.0.1:1080`），配置 Git 使用代理：

```bash
# 使用 HTTP 代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890

# 如果你的代理是 SOCKS5，使用：
# git config --global http.proxy socks5://127.0.0.1:7890
# git config --global https.proxy socks5://127.0.0.1:7890
```

验证配置：

```bash
git config --list | grep proxy
```

然后重新推送：

```bash
git push origin main
```

### 取消代理（不需要时）

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

---

## 2. 构建失败：cd: can't cd to backend

### 错误现象

```
sh: 1: cd: can't cd to backend
==> Build failed 😞
```

### 原因分析

在根目录 `package.json` 的脚本中，工作目录路径错误。例如：

```json
// ❌ 错误写法
"install-all": "npm install && cd frontend && npm install && cd backend && npm install"
```

问题在于：当执行到 `cd backend` 时，当前工作目录已经是 `frontend/`，所以 `frontend/backend` 目录不存在。

### 解决方案

使用正确的相对路径回到上级目录：

```json
// ✅ 正确写法
"install-all": "npm install && cd frontend && npm install && cd ../backend && npm install"
"build": "cd frontend && npm run build && cd ../backend && npm run build"
```

**关键教训**：理解 `cd` 的工作目录 - 脚本执行时，当前目录是相对于脚本启动位置的。

---

## 3. 构建失败：vite: not found

### 错误现象

```
vite: not found
npm error Lifecycle script `build` failed...
```

### 原因分析

- Vite 是开发工具，通常安装在 `devDependencies` 中
- 某些平台（如 Render）默认 `NODE_ENV=production`
- `npm install` 在生产模式下**不安装** `devDependencies`
- 所以构建时找不到 `vite` 命令

### 解决方案

**方案 A（推荐）：本地构建，然后提交编译结果**

在本地开发机器完成构建，把编译好的 `frontend/dist` 和 `backend/dist` 直接提交到 GitHub，让部署平台跳过构建步骤。这样可以避免很多平台相关的构建问题。

**方案 B：修改构建命令强制安装 devDependencies**

在 Render 构建命令前设置 `NODE_ENV=development`：

```bash
# ✅ Render 构建命令
NODE_ENV=development npm run install-all && npm run build && cd backend && npx prisma generate
```

---

## 4. 构建失败：Cannot find native binding for rolldown

### 错误现象

```
file:///opt/render/project/src/node_modules/rolldown/dist/...
Error: Cannot find native binding for your platform
```

这是 Vite 8.x 的新特性，使用 rolldown 作为打包器，但在 Linux/amd64 平台找不到预编译的原生绑定。

### 原因分析

- Vite 8.x  默认启用 rolldown 进行打包
- rolldown 是 Rust 编写，需要原生绑定
- 在某些云环境（Render）的 Linux 架构上，可能缺少预编译版本
- npm/yarn 无法自动下载对应平台的二进制文件

### 解决方案

**最佳方案：本地构建后提交 dist 目录**

```bash
# 在你自己的开发机器（Windows/macOS/Linux）上：
cd club-matching-platform
npm run install-all
npm run build

# 确认构建产物生成：
ls frontend/dist/
ls backend/dist/

# 提交到 Git：
git add frontend/dist/ backend/dist/ --force
git commit -m "chore: build for production (commit dist to avoid Render build issues)"
git push origin main
```

然后在 Render 构建命令中，只需要安装依赖和生成 Prisma 客户端，跳过构建步骤：

```bash
# ✅ 对于这种情况，Render 构建命令改为：
npm run install-all && cd backend && npx prisma generate
```

这样 Render 不需要构建，只需要安装依赖，就可以避免 rolldown 问题。

**替代方案：禁用 rolldown 在 vite.config.ts**

如果你确实需要在云平台构建，禁用 rolldown：

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  build: {
    rolldownOptions: false, // 禁用 rolldown，使用传统 rollup
  },
})
```

---

## 5. 运行时错误：500 CORS 错误，Not allowed by CORS

### 错误现象

- 页面白屏
- 控制台报错：`500 (Internal Server Error)`
- 查看网络请求：静态资源请求返回 500
- Render 日志：`Not allowed by CORS`

### 原因分析

项目采用**单服务器部署**模式：后端在 `NODE_ENV=production` 直接托管前端静态文件。CORS 配置需要正确处理这种情况。

典型错误配置：

```typescript
// ❌ 错误：只允许特定 origin，生产环境同域请求被拒绝
const corsOptions = {
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
}
```

当后端同时托管静态文件时，API 请求和静态文件请求可能来自同一个域，但是 origin 检查逻辑不正确会导致被拒绝。

### 解决方案

正确的 CORS 配置策略：

```typescript
// CORS configuration:
// - Development: allow any localhost port (Vite auto-switches ports)
// - Production: allow any origin (frontend+backend on same domain, safe for demo)
const corsOptions = {
  credentials: true,
  origin: (origin: string | undefined, callback: (err: any, allow: boolean) => void) => {
    // Allow requests with no origin (like curl/postman, or same-domain static files)
    if (!origin) {
      callback(null, true)
      return
    }
    // Allow any localhost origin in development
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      callback(null, true)
      return
    }
    // In production (single-server deployment), allow any origin
    // because frontend and backend are on the same domain
    if (process.env.NODE_ENV === 'production') {
      callback(null, true)
      return
    }
    // Check against configured origin for exact match in development
    if (origin === corsOrigin) {
      callback(null, true)
      return
    }
    // Reject other origins
    callback(new Error('Not allowed by CORS'), false)
  }
}

app.use(cors(corsOptions))
```

**关键点**：

1. 必须允许 `!origin`（没有 origin 的请求）- 同域静态文件请求没有 origin 头
2. 生产环境单服务器部署允许所有 origin - 因为前后端本就在同一个域，这是安全的

---

## 6. 运行时错误：页面显示"后端服务不可用"

### 错误现象

- 页面可以正常加载
- 但显示错误提示："后端服务不可用"
- 控制台看到请求 `http://localhost:3001/api/...` 返回 404

### 原因分析

前端 `.env` 文件中，API 地址硬编码为 `http://localhost:3001/api`：

```env
# ❌ 错误：硬编码 localhost
VITE_BACKEND_URL=http://localhost:3001/api
```

这意味着无论部署在哪里，前端总是尝试访问 `localhost:3001`（即访问访问者自己的电脑，当然找不到后端）。

### 解决方案

对于单服务器部署，使用相对路径：

```env
# ✅ 正确：相对路径，自动使用当前域名
VITE_BACKEND_URL=/api
```

这样，当应用部署在 `https://your-app.onrender.com`，API 请求会自动发到 `https://your-app.onrender.com/api`，正确匹配。

**为什么这可行**：

- 开发环境：Vite 代理会把 `/api` 请求代理到后端 `localhost:3001`
- 生产环境：后端在同一个域，直接 `/api` 就可以访问
- 适配任何部署域名，不需要修改配置

---

## 7. 经验总结

### 单服务器部署模式最佳实践

| 配置项 | 推荐做法 |
|--------|----------|
| 前端 API 地址 | 使用相对路径 `/api` ✅ |
| CORS 配置 | 生产环境允许所有 origin ✅ |
| 构建产物 | 本地构建后提交 `dist` 目录 ✅ |
| 环境变量 | `.env` 和 `.env.*` 添加到 `.gitignore` ✅ |
| 模板文件 | 提供 `.env.example` 作为模板 ✅ |

### Render 一键部署配置（验证可用）

**针对本项目的最终可用配置：**

- **Root directory**: `./`
- **Build command**: `npm run install-all && cd backend && npx prisma generate`
  (因为 `dist` 已经提交，不需要再构建)
- **Start command**: `cd backend && npm start`
- **Environment variables**:

```env
NODE_ENV=production
PORT=10000
AI_PROVIDER=openai-compat
AI_API_KEY=your_actual_api_key_here
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3
AI_MODEL=ark-code-latest
DATABASE_URL=file:./dev.db
```

### 为什么提交 dist 目录是个好方案（对于演示项目）

1. **避免构建环境问题**：不同平台构建工具版本不同，容易出问题
2. **节省构建时间**：Render 免费构建时间有限，跳过编译节省时间
3. **确定性**：你在本地测试过的构建产物直接部署，不会有意外
4. **适合演示/项目展示**：这是最重要的目标 - 项目能跑起来比什么都重要

### 需要记住的陷阱

1. **相对路径 cd 的坑**：脚本中 `cd` 是累积的，不是相对于根目录
2. **NODE_ENV 会影响 install**：生产模式不装 devDependencies
3. **rolldown 的原生绑定问题**：Vite 8.x 在某些平台可能出问题
4. **硬编码 API 地址是万恶之源**：一定要用相对路径适配不同部署环境
5. **CORS 需要理解原理**：同域请求没有 origin 头，必须允许 `!origin`

---

## 最后检查清单（部署前）

- [ ] `.gitignore` 包含 `.env` 和 `.env.*`（保护密钥）
- [ ] 存在 `.env.example` 模板供部署者参考
- [ ] `frontend/.env` 中 `VITE_BACKEND_URL=/api`（相对路径）
- [ ] CORS 配置正确允许生产环境同域请求
- [ ] 根目录 `package.json` 脚本中 `cd ../backend` 路径正确
- [ ] 本地已经运行 `npm run build` 确认构建成功
- [ ] `frontend/dist` 和 `backend/dist` 已经提交到 GitHub
- [ ] Render 构建命令跳过重复构建，只安装依赖和生成 Prisma
- [ ] AI API 密钥已经在 Render 环境变量中正确设置

如果以上都检查完毕，点击 Deploy 应该就能一次成功！

---

*最后更新：2026-04-23*
*记录于：`club-matching-platform` 首次 Render 部署实践*
