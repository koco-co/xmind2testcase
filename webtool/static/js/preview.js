/**
 * 预览页面列自定义交互脚本
 * 提供列拖拽排序、新增/编辑/删除列、单元格编辑、偏好管理、导出等功能
 */

const ColumnManager = {
  // 当前状态
  currentPreference: null,
  preferences: [],
  testcases: [],
  filename: '',
  _saveTimer: null,

  // 拖拽状态
  _draggedColumn: null,

  /**
   * 转义 HTML 特殊字符，防止 XSS
   */
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * 初始化模块
   */
  async init() {
    try {
      // 从页面获取数据
      this.testcases = window.TESTCASES || [];
      this.filename = document.body.dataset.filename || '';

      if (!this.filename) {
        console.error('未找到文件名');
        return;
      }

      // 加载偏好列表
      await this.loadPreferences();

      // 渲染界面
      this.renderPreferenceSelector();
      this.renderTable();

      // 绑定事件
      this.bindEvents();

      console.log('ColumnManager 初始化完成');
    } catch (error) {
      console.error('ColumnManager 初始化失败:', error);
    }
  },

  /**
   * 加载偏好列表
   */
  async loadPreferences() {
    try {
      const response = await fetch('/api/preferences');
      const result = await response.json();

      if (result.success) {
        this.preferences = result.data || [];

        // 找到默认偏好或使用第一个
        const defaultPref = this.preferences.find(p => p.is_default);
        this.currentPreference = defaultPref || this.preferences[0] || null;
      } else {
        console.error('加载偏好失败:', result.message);
      }
    } catch (error) {
      console.error('加载偏好失败:', error);
    }
  },

  /**
   * 防抖保存
   */
  debounceSave() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }

    this._saveTimer = setTimeout(() => {
      this.saveCurrentPreference();
    }, 1000);
  },

  /**
   * 保存当前偏好
   */
  async saveCurrentPreference() {
    if (!this.currentPreference || !this.currentPreference.id) {
      return;
    }

    try {
      const response = await fetch(`/api/preferences/${this.currentPreference.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columns: this.currentPreference.columns,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('偏好已保存');
      } else {
        console.error('保存偏好失败:', result.message);
      }
    } catch (error) {
      console.error('保存偏好失败:', error);
    }
  },

  /**
   * 渲染偏好选择器
   */
  renderPreferenceSelector() {
    const container = document.getElementById('preference-selector');
    if (!container) return;

    container.innerHTML = this.preferences.map(pref => `
      <button class="preference-option ${pref.id === this.currentPreference?.id ? 'selected' : ''}"
              data-pref-id="${pref.id}">
        ${this.escapeHtml(pref.name)}
      </button>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.preference-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prefId = parseInt(e.target.dataset.prefId);
        this.switchPreference(prefId);
      });
    });
  },

  /**
   * 渲染表格
   */
  renderTable() {
    const table = document.querySelector('table');
    if (!table) return;

    // 渲染表头
    this.renderHeader(table);

    // 渲染表体
    this.renderBody(table);
  },

  /**
   * 渲染表头
   */
  renderHeader(table) {
    const thead = table.querySelector('thead');
    if (!thead) return;

    const columns = this.currentPreference?.columns || [];
    const visibleColumns = columns.filter(c => c.visible !== false).sort((a, b) => a.order - b.order);

    const headerRow = thead.querySelector('tr');
    if (!headerRow) return;

    headerRow.innerHTML = `
      <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20 whitespace-nowrap">
        序号
      </th>
      ${visibleColumns.map(col => `
        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap column-header"
            data-col-id="${col.id}"
            draggable="true">
          <div class="flex items-center">
            <span class="drag-handle">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
              </svg>
            </span>
            <span>${this.escapeHtml(col.name)}</span>
            ${col.is_custom ? '<span class="ml-2 text-xs text-indigo-600">(自定义)</span>' : ''}
            <div class="column-actions">
              <button class="edit-btn" title="编辑列">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              ${col.is_custom ? `
                <button class="delete-btn" title="删除列">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              ` : ''}
            </div>
          </div>
        </th>
      `).join('')}
      <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
        <button class="add-column-btn" id="add-column-btn">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          添加列
        </button>
      </th>
    `;
  },

  /**
   * 渲染表格内容
   */
  renderBody(table) {
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const columns = this.currentPreference?.columns || [];
    const visibleColumns = columns.filter(c => c.visible !== false).sort((a, b) => a.order - b.order);

    tbody.innerHTML = this.testcases.map((testcase, rowIndex) => `
      <tr class="hover:bg-slate-50">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
          ${rowIndex + 1}
        </td>
        ${visibleColumns.map(col => `
          <td class="px-6 py-4 text-sm text-slate-700 ${col.is_custom ? 'custom-cell' : ''}"
              data-col-id="${col.id}"
              data-row="${rowIndex}">
            ${this.getColumnValue(testcase, col, rowIndex)}
          </td>
        `).join('')}
        <td class="px-6 py-4"></td>
      </tr>
    `).join('');
  },

  /**
   * 获取列值
   */
  getColumnValue(testcase, column, rowIndex) {
    const colId = column.id;
    const isCustom = column.is_custom || false;
    const defaultValue = column.default_value || '';

    if (isCustom) {
      // 自定义列：从 values 中获取，或使用默认值
      const values = column.values || {};
      return this.escapeHtml(values[rowIndex] || defaultValue);
    }

    // 原始列：从 testcase 获取
    switch (colId) {
      case 'suite':
        return this.escapeHtml(testcase.suite || '');
      case 'name':
        const name = testcase.name || '';
        const isTooLong = name.length > 100;
        return `
          <span class="${isTooLong ? 'text-red-600' : ''}">${this.escapeHtml(name)}</span>
          ${isTooLong ? `<span class="block mt-1 text-xs text-red-500">⚠️ 标题过长 (${name.length} 字符)</span>` : ''}
        `;
      case 'preconditions':
        return this.escapeHtml(testcase.preconditions || '');
      case 'steps':
        const steps = testcase.steps || [];
        return `
          <ol class="space-y-2">
            ${steps.map((step, i) => `
              <li>
                <div class="text-slate-700">${this.escapeHtml(step.actions)}</div>
                ${step.expectedresults ? `
                  <ul class="ml-4 mt-1 text-slate-500 text-xs">
                    <li>→ ${this.escapeHtml(step.expectedresults)}</li>
                  </ul>
                ` : ''}
              </li>
            `).join('')}
          </ol>
        `;
      case 'expectedresults':
        const stepsForExpected = testcase.steps || [];
        return stepsForExpected.map((step, i) => `${i + 1}. ${this.escapeHtml(step.expectedresults || '')}`).join('\n');
      case 'importance':
        const importance = testcase.importance || 3;
        const colors = {
          1: 'bg-red-100 text-red-800',
          2: 'bg-orange-100 text-orange-800',
          3: 'bg-yellow-100 text-yellow-800',
          4: 'bg-slate-100 text-slate-800'
        };
        return `
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[importance] || colors[4]}">
            P${importance}
          </span>
        `;
      case 'execution_type':
        return this.escapeHtml(defaultValue || testcase.execution_type || '');
      case 'stage':
        return this.escapeHtml(defaultValue);
      default:
        return this.escapeHtml(defaultValue);
    }
  },

  /**
   * 绑定事件
   */
  bindEvents() {
    const table = document.querySelector('table');
    if (!table) return;

    // 添加列按钮
    const addBtn = document.getElementById('add-column-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openAddModal());
    }

    // 表头事件委托
    const thead = table.querySelector('thead');
    if (thead) {
      // 拖拽事件
      thead.addEventListener('dragstart', (e) => this.handleDragStart(e));
      thead.addEventListener('dragover', (e) => this.handleDragOver(e));
      thead.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      thead.addEventListener('drop', (e) => this.handleDrop(e));
      thead.addEventListener('dragend', (e) => this.handleDragEnd(e));

      // 编辑/删除按钮
      thead.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');

        if (editBtn) {
          const th = editBtn.closest('th');
          const colId = th?.dataset.colId;
          if (colId) {
            this.openEditModal(colId);
          }
        }

        if (deleteBtn) {
          const th = deleteBtn.closest('th');
          const colId = th?.dataset.colId;
          if (colId) {
            this.deleteColumn(colId);
          }
        }
      });
    }

    // 单元格双击编辑（自定义列）
    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.addEventListener('dblclick', (e) => {
        const cell = e.target.closest('.custom-cell');
        if (cell) {
          const colId = cell.dataset.colId;
          const row = parseInt(cell.dataset.row);
          this.editCell(colId, row, cell);
        }
      });
    }
  },

  /**
   * 拖拽开始
   */
  handleDragStart(e) {
    const th = e.target.closest('.column-header');
    if (!th) return;

    this._draggedColumn = th.dataset.colId;
    th.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  },

  /**
   * 拖拽经过
   */
  handleDragOver(e) {
    e.preventDefault();
    const th = e.target.closest('.column-header');
    if (!th || th.dataset.colId === this._draggedColumn) return;

    th.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  },

  /**
   * 拖拽离开
   */
  handleDragLeave(e) {
    const th = e.target.closest('.column-header');
    if (th) {
      th.classList.remove('drag-over');
    }
  },

  /**
   * 拖拽放下
   */
  handleDrop(e) {
    e.preventDefault();
    const th = e.target.closest('.column-header');
    if (!th || !this._draggedColumn) return;

    const targetColId = th.dataset.colId;
    if (targetColId !== this._draggedColumn) {
      this.swapColumnOrder(this._draggedColumn, targetColId);
    }

    th.classList.remove('drag-over');
  },

  /**
   * 拖拽结束
   */
  handleDragEnd(e) {
    const th = e.target.closest('.column-header');
    if (th) {
      th.classList.remove('dragging');
    }
    this._draggedColumn = null;

    // 清除所有 drag-over 状态
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  },

  /**
   * 交换列顺序
   */
  swapColumnOrder(colId1, colId2) {
    if (!this.currentPreference) return;

    const columns = this.currentPreference.columns;
    const col1 = columns.find(c => c.id === colId1);
    const col2 = columns.find(c => c.id === colId2);

    if (!col1 || !col2) return;

    // 交换 order
    const tempOrder = col1.order;
    col1.order = col2.order;
    col2.order = tempOrder;

    // 重新渲染表格
    this.renderTable();

    // 保存
    this.debounceSave();
  },

  /**
   * 打开新增列弹窗
   */
  openAddModal() {
    this.showModal('添加列', {
      name: '',
      default_value: '',
    }, async (data) => {
      await this.addColumn(data.name, data.default_value);
    });
  },

  /**
   * 打开编辑列弹窗
   */
  openEditModal(colId) {
    if (!this.currentPreference) return;

    const column = this.currentPreference.columns.find(c => c.id === colId);
    if (!column) return;

    this.showModal('编辑列', {
      name: column.name,
      default_value: column.default_value || '',
      is_custom: column.is_custom,
    }, async (data) => {
      await this.updateColumn(colId, data.name, data.default_value);
    });
  },

  /**
   * 显示弹窗
   */
  showModal(title, data, onConfirm) {
    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">${this.escapeHtml(title)}</div>
        <div class="modal-field">
          <label>列名称</label>
          <input type="text" id="modal-name" value="${this.escapeHtml(data.name || '')}" placeholder="请输入列名称">
        </div>
        <div class="modal-field">
          <label>默认值</label>
          <input type="text" id="modal-default" value="${this.escapeHtml(data.default_value || '')}" placeholder="请输入默认值（可选）">
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="modal-cancel">取消</button>
          <button class="btn-confirm" id="modal-confirm">确定</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 绑定事件
    const cancelBtn = overlay.querySelector('#modal-cancel');
    const confirmBtn = overlay.querySelector('#modal-confirm');
    const nameInput = overlay.querySelector('#modal-name');
    const defaultInput = overlay.querySelector('#modal-default');

    const closeModal = () => {
      document.body.removeChild(overlay);
    };

    cancelBtn.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert('请输入列名称');
        return;
      }

      closeModal();
      await onConfirm({
        name,
        default_value: defaultInput.value.trim(),
      });
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // 自动聚焦
    nameInput.focus();
  },

  /**
   * 添加列
   */
  async addColumn(name, defaultValue) {
    if (!this.currentPreference) return;

    // 生成唯一 ID
    const customColumns = this.currentPreference.columns.filter(c => c.is_custom);
    const maxId = customColumns.reduce((max, c) => {
      const num = parseInt(c.id.replace('custom_', '')) || 0;
      return Math.max(max, num);
    }, 0);

    const newColumn = {
      id: `custom_${maxId + 1}`,
      name,
      visible: true,
      order: this.currentPreference.columns.length + 1,
      is_custom: true,
      default_value: defaultValue,
      values: {},
    };

    this.currentPreference.columns.push(newColumn);

    // 重新渲染
    this.renderTable();

    // 保存
    this.debounceSave();
  },

  /**
   * 更新列
   */
  async updateColumn(colId, name, defaultValue) {
    if (!this.currentPreference) return;

    const column = this.currentPreference.columns.find(c => c.id === colId);
    if (!column) return;

    column.name = name;
    if (column.is_custom) {
      column.default_value = defaultValue;
    }

    // 重新渲染
    this.renderTable();

    // 保存
    this.debounceSave();
  },

  /**
   * 删除列
   */
  async deleteColumn(colId) {
    if (!this.currentPreference) return;

    const column = this.currentPreference.columns.find(c => c.id === colId);
    if (!column) return;

    if (!column.is_custom) {
      alert('不能删除原始列');
      return;
    }

    if (!confirm(`确定删除列"${this.escapeHtml(column.name)}"吗？`)) {
      return;
    }

    this.currentPreference.columns = this.currentPreference.columns.filter(c => c.id !== colId);

    // 重新渲染
    this.renderTable();

    // 保存
    this.debounceSave();
  },

  /**
   * 编辑单元格（自定义列）
   */
  editCell(colId, row, cellElement) {
    if (!this.currentPreference) return;

    const column = this.currentPreference.columns.find(c => c.id === colId);
    if (!column || !column.is_custom) return;

    // 获取当前值
    const currentValue = column.values?.[row] || column.default_value || '';

    // 创建输入框
    cellElement.classList.add('editing');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'w-full';

    cellElement.innerHTML = '';
    cellElement.appendChild(input);
    input.focus();
    input.select();

    // 保存函数
    const saveValue = () => {
      const newValue = input.value.trim();

      if (!column.values) {
        column.values = {};
      }
      column.values[row] = newValue;

      cellElement.classList.remove('editing');
      cellElement.textContent = newValue || column.default_value || '';

      // 保存
      this.debounceSave();
    };

    // 失去焦点保存
    input.addEventListener('blur', saveValue);

    // 回车保存
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveValue();
      } else if (e.key === 'Escape') {
        cellElement.classList.remove('editing');
        cellElement.textContent = currentValue;
      }
    });
  },

  /**
   * 切换偏好
   */
  async switchPreference(prefId) {
    const pref = this.preferences.find(p => p.id === prefId);
    if (!pref) return;

    this.currentPreference = pref;

    // 重新渲染
    this.renderPreferenceSelector();
    this.renderTable();
  },

  /**
   * 打开导出弹窗
   */
  openExportModal(type) {
    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay export-modal';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">选择导出偏好</div>
        <div class="modal-field">
          <label>选择偏好配置</label>
          <div class="preference-list">
            ${this.preferences.map(pref => `
              <label class="preference-item ${pref.id === this.currentPreference?.id ? 'selected' : ''}">
                <input type="radio" name="export-pref" value="${pref.id}"
                       ${pref.id === this.currentPreference?.id ? 'checked' : ''}>
                <div class="preference-info">
                  <div class="preference-name">${this.escapeHtml(pref.name)}</div>
                  <div class="preference-description">
                    ${pref.columns.filter(c => c.visible !== false).length} 列
                    ${pref.is_default ? ' · 默认' : ''}
                  </div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="export-cancel">取消</button>
          <button class="btn-confirm" id="export-confirm">导出 ${this.escapeHtml(type.toUpperCase())}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 绑定事件
    const cancelBtn = overlay.querySelector('#export-cancel');
    const confirmBtn = overlay.querySelector('#export-confirm');
    const preferenceList = overlay.querySelector('.preference-list');

    const closeModal = () => {
      document.body.removeChild(overlay);
    };

    cancelBtn.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', async () => {
      const selected = overlay.querySelector('input[name="export-pref"]:checked');
      const prefId = selected ? parseInt(selected.value) : null;

      closeModal();
      await this.doExport(type, prefId);
    });

    // 偏好选择
    preferenceList.addEventListener('change', (e) => {
      if (e.target.type === 'radio') {
        preferenceList.querySelectorAll('.preference-item').forEach(item => {
          item.classList.remove('selected');
        });
        e.target.closest('.preference-item').classList.add('selected');
      }
    });

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  },

  /**
   * 执行导出
   */
  async doExport(type, preferenceId) {
    try {
      const url = `/api/export/${encodeURIComponent(this.filename)}/${type}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preference_id: preferenceId,
        }),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      // 获取文件内容
      const blob = await response.blob();

      // 触发下载
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${this.filename.replace('.xmind', '')}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      console.log('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  },
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  ColumnManager.init();
});
