# 界面优化设计文档

**日期**: 2026-03-04
**项目**: xmind2cases
**设计师**: Claude Code

---

## 1. 概述

### 1.1 优化目标

修复历史记录表格的布局问题,提升用户体验:
1. **文件名列优化** - 长文件名省略显示,鼠标悬浮显示完整名称
2. **操作列优化** - 使用图标+文字,避免按钮换行
3. **项目名称修正** - 统一为 `XMind2Cases`
4. **仓库链接更新** - 更新为用户自己的仓库

### 1.2 当前问题

- ❌ 文件名列使用 `whitespace-nowrap`,长文件名会撑开整个列
- ❌ 操作列有 5 个链接 + 4 个分隔符 = 9 个元素,在小屏幕会换行
- ❌ 项目名称不一致 (XMind2TestCase vs XMind2Cases)
- ❌ 仓库链接指向原项目而非用户仓库

---

## 2. 技术方案

### 2.1 方案选择: **方案 A - 最小改动,快速修复**

**原则:**
- 保持现有布局结构
- 使用 Tailwind CSS 内置类
- 最小化代码变更
- 快速实施,立即可用

---

## 3. 详细设计

### 3.1 文件名列优化

**位置:**
- `webtool/templates/index.html` - 历史记录表格
- `webtool/templates/preview.html` - 测试用例表格

**当前代码:**
```html
<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700" title="{{ record[1] }}">
    {{ record[0] }}
</td>
```

**新代码:**
```html
<td class="px-6 py-4 text-sm text-slate-700" title="{{ record[1] }}">
    <span class="block max-w-[300px] truncate">{{ record[0] }}</span>
</td>
```

**样式说明:**
- 移除 `whitespace-nowrap` (允许内容自适应)
- 添加 `<span>` 包裹,使用 Tailwind 的 `truncate` 类
- 添加 `max-w-[300px]` 限制最大宽度
- 保留 `title` 属性用于鼠标悬浮提示
- `truncate` 类会在 40-50 字符处自动截断并添加 `...`

**预览页测试用例标题列 (参考):**
```html
<!-- 已有类似实现,保持一致 -->
<td class="px-6 py-4 text-sm text-slate-700">
    <span class="{% if test.name|length>100 %}text-red-600{% endif %}">
        {{ test.name }}
    </span>
    {% if test.name|length>100 %}
    <span class="block mt-1 text-xs text-red-500">⚠️ 标题过长 ({{ test.name|length }} 字符)</span>
    {% endif %}
</td>
```

---

### 3.2 操作列优化

**位置:**
- `webtool/templates/index.html` - 历史记录表格操作列

**当前代码:**
```html
<div class="flex flex-wrap gap-2">
    <a href="...">XMind</a>
    <span>|</span>
    <a href="...">CSV</a>
    <span>|</span>
    <a href="...">XML</a>
    <span>|</span>
    <a href="...">预览</a>
    <span>|</span>
    <a href="..." class="text-red-600">删除</a>
</div>
```

**问题分析:**
- `flex-wrap` 允许换行,导致操作按钮分散
- 9 个元素 (5 文字 + 4 分隔符) 在小屏幕会溢出
- 分隔符 `|` 视觉杂乱

**新代码:**
```html
<div class="flex items-center gap-3">
    <!-- 下载 XMind -->
    <a href="{{ url_for('uploaded_file',filename=record[1]) }}"
       class="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
       title="下载 XMind 文件">
        XMind
    </a>

    <!-- 导出 CSV (使用图标) -->
    <a href="{{ url_for('download_zentao_file',filename=record[1]) }}"
       class="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
       title="导出 CSV 格式">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    </a>

    <!-- 导出 XML (使用图标) -->
    <a href="{{ url_for('download_testlink_file',filename=record[1]) }}"
       class="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
       title="导出 XML 格式">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
    </a>

    <!-- 预览 -->
    <a href="{{ url_for('preview_file',filename=record[1]) }}"
       class="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
       title="预览测试用例">
        预览
    </a>

    <!-- 删除 -->
    <a href="{{ url_for('delete_file',filename=record[1], record_id=record[4]) }}"
       class="text-red-600 hover:text-red-700 text-sm font-medium"
       onclick="return confirm('确定要删除这个文件吗?')"
       title="删除文件">
        删除
    </a>
</div>
```

**改进点:**
1. ✅ 移除所有 `|` 分隔符 (节省 4 个元素空间)
2. ✅ 移除 `flex-wrap` (不允许换行)
3. ✅ CSV/XML 使用 16x16 图标 (紧凑)
4. ✅ 保留 XMind、预览、删除为文字 (主要操作)
5. ✅ 所有操作添加 `title` 属性 (tooltip)
6. ✅ 添加删除确认对话框 (防止误删)
7. ✅ 间距从 `gap-2` 改为 `gap-3` (更宽松)

**图标来源:** Heroicons (与现有图标一致)

---

### 3.3 项目名称修正

**修改位置:**

#### index.html
1. **Title 标签** (第 6 行):
```html
<title>XMind2Cases</title>
```

2. **导航栏品牌** (第 47 行):
```html
<span class="ml-2 text-xl font-semibold text-slate-900">XMind2Cases</span>
```

3. **空状态消息** (第 137 行):
```html
<p class="text-slate-500 mb-2">欢迎使用 XMind2Cases!</p>
```

4. **页脚 Powered by** (第 149 行):
```html
Powered by <a href="https://github.com/koco-co/xmind2cases" target="_blank" class="hover:text-slate-600">XMind2Cases</a>
```

#### preview.html
1. **Title 标签** (第 6 行):
```html
<title>{{ name }} | XMind2Cases Preview</title>
```

---

### 3.4 仓库链接更新

**修改位置:**

#### index.html 页脚 (第 147 行)
```html
<!-- 当前 -->
<a href="https://github.com/zhuifengshen/xmind2testcase/issues/new" target="_blank" class="hover:text-slate-600">反馈问题</a>

<!-- 新 -->
<a href="https://github.com/koco-co/xmind2cases/issues/new" target="_blank" class="hover:text-slate-600">反馈问题</a>
```

#### preview.html 页脚
同样更新仓库链接

---

### 3.5 启动脚本检查

**需要检查的文件:**
1. `init.sh` - 初始化脚本
2. `webtool/deploy.sh` - 部署脚本
3. `README.md` - 文档中的项目名称

**检查内容:**
- 项目名称描述
- 仓库 URL 引用
- Web 工具启动说明

**预判:**
- ✅ CLI 模块名 `xmind2testcase` 保持不变(这是 Python 包名)
- ✅ 只修改显示名称和仓库链接
- ✅ 启动命令保持不变

---

## 4. 实施步骤

### Phase 1: 首页优化
1. 修改项目名称 (4 处)
2. 更新仓库链接 (2 处)
3. 优化文件名列 (添加 truncate)
4. 优化操作列 (移除分隔符,添加图标,添加删除确认)

### Phase 2: 预览页优化
1. 修改项目名称 (1 处)
2. 更新仓库链接 (1 处)
3. 优化测试用例标题列 (如果需要)

### Phase 3: 启动脚本检查
1. 检查 `init.sh` 中的项目名称
2. 检查 `webtool/deploy.sh` 中的仓库链接
3. 检查 `README.md` 中的项目描述

### Phase 4: 测试验证
1. 启动 webtool
2. 上传测试文件
3. 验证文件名截断和 tooltip
4. 验证操作列不换行
5. 验证所有链接正确

---

## 5. 预期效果

### 5.1 视觉改进
- ✅ 文件名列最大宽度限制在 300px,约 40 字符
- ✅ 长文件名显示 `...` 省略号
- ✅ 鼠标悬浮显示完整文件名
- ✅ 操作列紧凑,不会换行

### 5.2 用户体验
- ✅ 表格列宽合理分配
- ✅ 操作按钮一目了然
- ✅ 删除操作有确认提示
- ✅ 项目名称统一专业
- ✅ 反馈直达用户仓库

### 5.3 响应式
- ✅ 在桌面 (1024px+) 正常显示
- ✅ 在平板 (768px-1024px) 操作列紧凑但不换行
- ✅ 在移动端 (< 768px) 表格可横向滚动

---

## 6. 风险评估

### 6.1 低风险
- ✅ 纯 CSS 类修改,不涉及逻辑
- ✅ 不改变数据库结构
- ✅ 不影响后端 API
- ✅ 向后兼容(所有功能保留)

### 6.2 注意事项
- ⚠️ 确保图标路径正确
- ⚠️ 测试各种文件名长度
- ⚠️ 验证删除确认对话框在所有浏览器正常工作

---

## 7. 文件变更清单

**修改文件:**
- `webtool/templates/index.html`
- `webtool/templates/preview.html`
- `init.sh` (如果需要)
- `README.md` (如果需要)

**预计变更:**
- 2 个 HTML 文件
- 约 50 行代码修改
- 新增 2 个 SVG 图标

---

**设计版本**: 1.0
**创建日期**: 2026-03-04
**预计时间**: 30-45 分钟
