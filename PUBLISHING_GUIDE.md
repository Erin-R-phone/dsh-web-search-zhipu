# dsh-web-search-zhipu 插件发布指南

## 前置准备

### 1. 注册GitHub账号

1. 访问 https://github.com
2. 点击右上角 "Sign up" 按钮
3. 填写注册信息：
   - 邮箱地址
   - 密码（至少8位，建议包含大小写字母、数字和符号）
   - 用户名（英文、数字和短横线，不能以下划线开头）
4. 完成人机验证
5. 验证邮箱

### 2. 安装Git

1. 下载Git安装程序：https://git-scm.com/download/win
2. 运行安装程序，按照默认设置完成安装
3. 确保选择 "Use Git from Git Bash only" 选项

### 3. 配置Git环境

打开Git Bash，执行以下命令：

```bash
# 设置用户名
git config --global user.name "您的GitHub用户名"

# 设置邮箱（使用注册GitHub时使用的邮箱）
git config --global user.email "您的邮箱地址"

# 生成SSH密钥
ssh-keygen -t rsa -C "您的邮箱地址"

# 查看SSH公钥
cat ~/.ssh/id_rsa.pub
```

### 4. 添加SSH密钥到GitHub

1. 复制上面命令输出的SSH公钥内容
2. 登录GitHub账号
3. 点击右上角头像 → Settings → SSH and GPG keys
4. 点击 "New SSH key"
5. 粘贴公钥内容，添加标题
6. 点击 "Add SSH key"

## 发布步骤

### 1. 准备项目

```bash
# 进入项目目录
cd E:\deepssekharnessworkplace\dsh-web-search-zhipu-pub

# 初始化git仓库
git init

# 添加远程仓库（替换为您的GitHub用户名）
git remote add origin https://github.com/您的用户名/dsh-web-search-zhipu.git

# 添加所有文件到暂存区
git add .

# 提交到本地仓库
git commit -m "Initial commit: dsh-web-search-zhipu plugin"

# 创建GitHub仓库（在GitHub网页上操作）
# 1. 访问 https://github.com
# 2. 点击右上角 "+" → "New repository"
# 3. 填写仓库名称：dsh-web-search-zhipu
# 4. 选择Public（公开仓库）
# 5. 点击 "Create repository"

# 推送到GitHub
git push -u origin main
```

### 2. 创建Pull Request

1. 访问您的GitHub仓库页面：https://github.com/您的用户名/dsh-web-search-zhipu
2. 点击 "New pull request"
3. 选择base分支：`main`
4. 点击 "Create pull request"

### 3. 填写PR信息

**标题**：Add dsh-web-search-zhipu plugin

**描述**：
```markdown
## 功能描述

这是一个为DeepSeek Harness提供智谱AI Web搜索功能的插件。

### 主要特性

- 集成智谱AI Web Search API
- 支持多种搜索引擎（标准搜索、新闻搜索、学术搜索等）
- 可配置的搜索参数（结果数量、时间过滤等）
- 安全的API密钥管理

### 配置方法

```javascript
import { apply } from '@deepseek-ai/dsh-web-search-zhipu';

apply(ctx, {
  apiKey: 'your-zhipu-api-key',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  searchEngine: 'search_std',
  count: 10,
  recency: 'noLimit'
});
```

### 依赖项

- @deepseek-ai/dsh-credentials: 0.1.2-rc.1
- @deepseek-ai/dsh-launch-environment: 0.1.2-rc.1
- @deepseek-ai/dsh-web: 0.1.2-rc.1
- @deepseek-ai/schemastery: ^3.18.2

### 许可证

MIT License
```

### 4. 提交PR

点击 "Create pull request" 按钮

## 注意事项

1. **API密钥安全**：不要将API密钥直接提交到代码库中
2. **代码质量**：确保代码符合DeepSeek Harness的编码规范
3. **文档完整**：提供清晰的使用说明和配置示例
4. **测试覆盖**：如果有条件，添加相应的测试用例

## 常见问题

### SSH连接失败

```bash
# 测试SSH连接
ssh -T git@github.com
```

### 提交失败

检查git配置是否正确，确保用户名和邮箱设置正确。

### 权限问题

确保您的GitHub账号有权限创建仓库和提交PR。

## 后续维护

### 更新版本

1. 修改package.json中的version字段
2. 更新CHANGELOG.md
3. 提交新的更改
4. 创建新的tag

### 响应反馈

定期查看GitHub Issues，及时响应用户反馈和问题。

## 联系方式

如有问题，可以通过以下方式联系：
- GitHub Issues: https://github.com/您的用户名/dsh-web-search-zhipu/issues
- Email: 您的邮箱地址