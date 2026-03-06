/**
 * 预览页面列自定义交互脚本
 * 支持：列拖拽排序、标题编辑、新增/编辑列、模版管理、分页、导出
 */

const DEFAULT_COLUMNS = [
  { id: 'suite', name: '所属模块', order: 1, is_custom: false, rich_text_break: false, empty_check: false },
  { id: 'name', name: '用例标题', order: 2, is_custom: false, rich_text_break: false, empty_check: false },
  { id: 'preconditions', name: '前置条件', order: 3, is_custom: false, rich_text_break: false, empty_check: false },
  { id: 'steps', name: '步骤', order: 4, is_custom: false, rich_text_break: false, empty_check: false },
  { id: 'expectedresults', name: '预期', order: 5, is_custom: false, rich_text_break: false, empty_check: false },
  { id: 'importance', name: '优先级', order: 6, is_custom: false, rich_text_break: false, empty_check: false },
];

const HEADER_COLOR_PRESETS = ['#fef2f2', '#f8fafc', '#e0f2fe', '#f0fdf4', '#fefce8', '#fef3c7', '#fce7f3', '#ede9fe', '#f3e8ff', '#fae8ff'];

const ColumnManager = {
  currentTemplate: null,
  templates: [],
  lastTemplateId: null,
  testcases: [],
  total: 0,
  page: 1,
  pageSize: 10,
  filename: '',
  _saveTimer: null,
  _draggedColumn: null,
  emptyCells: [],

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  async init() {
    try {
      this.filename = document.body.dataset.filename || '';
      this.total = parseInt(document.body.dataset.total || '0', 10);
      if (!this.filename) {
        console.error('未找到文件名');
        return;
      }

      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) {
        this.templates = result.data.templates || [];
        this.lastTemplateId = result.data.last_template_id;

        const tpl = this.templates.find(t => t.id === this.lastTemplateId)
          || this.templates[0]
          || null;
        this.currentTemplate = tpl;
      }

      this.renderPreferenceSelector();
      await this.fetchPage();
      this.bindEvents();
    } catch (error) {
      console.error('ColumnManager 初始化失败:', error);
    }
  },

  async fetchPage() {
    try {
      const url = `/api/preview/${encodeURIComponent(this.filename)}/cases?page=${this.page}&page_size=${this.pageSize}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        this.testcases = result.data.testcases || [];
        this.total = result.data.total || 0;
        this.page = result.data.page || 1;
        this.pageSize = result.data.page_size || 10;
        document.getElementById('total-count').textContent = this.total;
        await this.fetchEmptyCells();
        this.renderTable();
        this.renderPagination();
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  },

  async fetchEmptyCells() {
    const cols = this.currentTemplate?.columns || [];
    const hasEmptyCheck = cols.some(c => c.empty_check === true);
    if (!hasEmptyCheck || !this.currentTemplate?.id) {
      this.emptyCells = [];
      return;
    }
    try {
      const url = `/api/preview/${encodeURIComponent(this.filename)}/empty-cells?template_id=${this.currentTemplate.id}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        this.emptyCells = result.data.empty_cells || [];
      } else {
        this.emptyCells = [];
      }
    } catch (error) {
      console.error('获取空值列表失败:', error);
      this.emptyCells = [];
    }
  },

  renderPreferenceSelector() {
    const columns = this.currentTemplate?.columns || [];
    const suiteCol = columns.find(c => c.id === 'suite');
    const nameCol = columns.find(c => c.id === 'name');
    const suiteLabel = document.getElementById('suite-count-label');
    const totalLabel = document.getElementById('total-count-label');
    if (suiteLabel) suiteLabel.textContent = suiteCol?.name || 'TestSuites';
    if (totalLabel) totalLabel.textContent = nameCol?.name || 'TestCases';
  },

  isValueEmpty(val) {
    if (val === undefined || val === null) return true;
    if (typeof val !== 'string') return false;
    return (val || '').trim() === '';
  },

  renderTable() {
    const table = document.querySelector('table');
    if (!table) return;

    const columns = this.currentTemplate?.columns || [];
    const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    const headerColor = this.currentTemplate?.header_color || '#fef2f2';
    const startIndex = (this.page - 1) * this.pageSize;

    const emptyCells = this.emptyCells || [];
    const emptyCellSet = new Set(emptyCells.map(c => `${c.colId}:${c.rowIndex}`));

    const theadEl = table.querySelector('thead');
    const theadTr = table.querySelector('thead tr');
    if (theadEl) {
      theadEl.style.setProperty('--header-bg', headerColor);
      theadEl.dataset.headerColor = headerColor;
    }
    if (theadTr) {
      const bgStyle = `background-color: ${headerColor} !important`;
      theadTr.innerHTML = `
        <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider w-20 whitespace-nowrap" style="${bgStyle}">序号</th>
        ${sortedColumns.map(col => `
          <th class="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider whitespace-nowrap column-header"
              data-col-id="${this.escapeHtml(col.id)}"
              draggable="true"
              style="${bgStyle}">
            <div class="flex items-center">
              <span class="drag-handle">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                </svg>
              </span>
              <span class="column-title">${this.escapeHtml(col.name)}</span>
              ${col.is_custom ? '<span class="ml-2 text-xs text-indigo-600">(自定义)</span>' : ''}
              <div class="column-actions">
                <button class="edit-btn" title="编辑列">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button class="add-btn" title="新增列">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
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
      `;
    }

    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = this.testcases.map((testcase, rowIndex) => {
        const globalRowIndex = startIndex + rowIndex;
        return `
        <tr class="hover:bg-slate-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${globalRowIndex + 1}</td>
          ${sortedColumns.map(col => {
            const isEmpty = emptyCellSet.has(`${col.id}:${globalRowIndex}`);
            return `
            <td class="px-6 py-4 text-sm text-slate-700 table-cell-truncate ${col.is_custom ? 'custom-cell' : ''} ${isEmpty ? 'empty-cell-warning' : ''}"
                data-col-id="${this.escapeHtml(col.id)}"
                data-row="${globalRowIndex}"
                title="${this.escapeHtml(this.getCellTitle(testcase, col, globalRowIndex)).replace(/"/g, '&quot;')}">
              ${this.getColumnValue(testcase, col, globalRowIndex)}
            </td>
          `;
          }).join('')}
        </tr>
      `}).join('');
    }

    this.renderEmptyCheckBanner(emptyCells);
  },

  renderEmptyCheckBanner(emptyCells) {
    const container = document.querySelector('.preview-table-container');
    const existing = document.getElementById('empty-check-banner');
    if (existing) existing.remove();

    if (emptyCells.length === 0) return;

    const banner = document.createElement('div');
    banner.id = 'empty-check-banner';
    banner.className = 'empty-check-banner';
    banner.innerHTML = `
      <div class="empty-check-banner-inner">
        <div class="empty-check-banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div class="empty-check-banner-content">
          <div class="empty-check-banner-title">发现 <strong>${emptyCells.length}</strong> 处空值</div>
          <div class="empty-check-banner-hint">点击下方标签可快速定位到对应单元格</div>
          <div class="empty-check-banner-tags">
            ${emptyCells.slice(0, 20).map((c) => `
              <button type="button" class="empty-check-jump" data-col-id="${this.escapeHtml(c.colId)}" data-row="${c.rowIndex}">
                <span class="empty-check-jump-col">${this.escapeHtml(c.colName)}</span>
                <span class="empty-check-jump-row">第 ${c.rowIndex + 1} 行</span>
              </button>
            `).join('')}
            ${emptyCells.length > 20 ? `<span class="empty-check-more">共 ${emptyCells.length} 处</span>` : ''}
          </div>
        </div>
      </div>
    `;
    banner.addEventListener('click', async (e) => {
      const btn = e.target.closest('.empty-check-jump');
      if (!btn) return;
      const colId = btn.dataset.colId;
      const row = parseInt(btn.dataset.row, 10);
      const targetPage = Math.floor(row / this.pageSize) + 1;
      if (targetPage !== this.page) {
        this.page = targetPage;
        await this.fetchPage();
      }
      requestAnimationFrame(() => {
        const cell = document.querySelector(`td[data-col-id="${colId}"][data-row="${String(row)}"]`);
        if (cell) {
          cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cell.classList.add('empty-cell-highlight');
          setTimeout(() => cell.classList.remove('empty-cell-highlight'), 1500);
        }
      });
    });
    if (container) {
      container.insertBefore(banner, container.firstChild);
      requestAnimationFrame(() => {
        const table = container.querySelector('table');
        if (table) {
          banner.style.minWidth = table.offsetWidth + 'px';
        }
      });
    }
  },

  getCellTitle(testcase, column, rowIndex) {
    const val = this.getColumnValueRaw(testcase, column, rowIndex);
    return typeof val === 'string' ? val : '';
  },

  getColumnValueRaw(testcase, column, rowIndex) {
    const colId = column.id;
    const isCustom = column.is_custom || false;
    const defaultValue = column.default_value || '';

    if (isCustom) {
      const values = column.values || {};
      return values[rowIndex] !== undefined ? values[rowIndex] : defaultValue;
    }

    switch (colId) {
      case 'suite': return testcase.suite || '';
      case 'name': return testcase.name || '';
      case 'preconditions': return testcase.preconditions || '';
      case 'steps':
        return (testcase.steps || []).map(s => s.actions || '').join('\n');
      case 'expectedresults':
        return (testcase.steps || []).map(s => s.expectedresults || '').join('\n');
      case 'importance': return String(testcase.importance || '');
      default: return defaultValue;
    }
  },

  getColumnValue(testcase, column, rowIndex) {
    const colId = column.id;
    const isCustom = column.is_custom || false;
    const raw = this.getColumnValueRaw(testcase, column, rowIndex);
    const escaped = this.escapeHtml(raw);

    if (colId === 'name') {
      const isTooLong = (testcase.name || '').length > 100;
      return `
        <span class="${isTooLong ? 'text-red-600' : ''} table-cell-content">${escaped}</span>
        ${isTooLong ? `<span class="block mt-1 text-xs text-red-500">标题过长</span>` : ''}
      `;
    }
    if (colId === 'steps') {
      const steps = testcase.steps || [];
      return `
        <div class="table-cell-content">
          <ol class="space-y-2 list-decimal list-inside">
            ${steps.map(s => `<li class="text-slate-700">${this.escapeHtml(s.actions || '')}</li>`).join('')}
          </ol>
        </div>
      `;
    }
    if (colId === 'expectedresults') {
      const steps = testcase.steps || [];
      return `
        <div class="table-cell-content">
          <ol class="space-y-2 list-decimal list-inside">
            ${steps.map(s => `<li class="text-slate-500">${this.escapeHtml(s.expectedresults || '')}</li>`).join('')}
          </ol>
        </div>
      `;
    }
    if (colId === 'importance') {
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
    }

    return `<span class="table-cell-content">${escaped}</span>`;
  },

  renderPagination() {
    const bar = document.getElementById('pagination-bar');
    if (!bar) return;

    const totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.total);

    bar.innerHTML = `
      <div class="flex items-center gap-4">
        <span class="text-sm text-slate-600">
          每页
          <select class="border border-slate-300 rounded px-2 py-1 text-sm" id="page-size-select">
            <option value="10" ${this.pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="20" ${this.pageSize === 20 ? 'selected' : ''}>20</option>
            <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50</option>
            <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100</option>
          </select>
          条
        </span>
        <span class="text-sm text-slate-600">
          第 ${start}-${end} 条，共 ${this.total} 条
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button class="pagination-btn inline-flex items-center justify-center w-9 h-9 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" data-page="1" title="首页" ${this.page <= 1 ? 'disabled' : ''}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
        <button class="pagination-btn inline-flex items-center justify-center w-9 h-9 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" data-page="${this.page - 1}" title="上一页" ${this.page <= 1 ? 'disabled' : ''}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span class="text-sm text-slate-600">第 ${this.page} / ${totalPages} 页</span>
        <button class="pagination-btn inline-flex items-center justify-center w-9 h-9 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" data-page="${this.page + 1}" title="下一页" ${this.page >= totalPages ? 'disabled' : ''}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button class="pagination-btn inline-flex items-center justify-center w-9 h-9 border border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed" data-page="${totalPages}" title="末页" ${this.page >= totalPages ? 'disabled' : ''}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </button>
      </div>
    `;

    bar.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page, 10);
        if (page >= 1 && page <= totalPages) {
          this.page = page;
          this.fetchPage();
        }
      });
    });

    bar.querySelector('#page-size-select')?.addEventListener('change', (e) => {
      this.pageSize = parseInt(e.target.value, 10);
      this.page = 1;
      this.fetchPage();
    });
  },

  bindEvents() {
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        this.openExportModal(type);
      });
    });

    const tplSettingsBtn = document.getElementById('template-settings-btn');
    if (tplSettingsBtn) {
      tplSettingsBtn.addEventListener('click', () => this.openTemplateSettingsModal());
    }

    const table = document.querySelector('table');
    if (!table) return;

    const thead = table.querySelector('thead');
    if (thead) {
      thead.addEventListener('dragstart', (e) => this.handleDragStart(e));
      thead.addEventListener('dragover', (e) => this.handleDragOver(e));
      thead.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      thead.addEventListener('drop', (e) => this.handleDrop(e));
      thead.addEventListener('dragend', (e) => this.handleDragEnd(e));

      thead.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const addBtn = e.target.closest('.add-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const titleSpan = e.target.closest('.column-title');

        if (editBtn) {
          const th = editBtn.closest('th');
          const colId = th?.dataset?.colId;
          if (colId) this.openEditColumnModal(colId);
        }
        if (addBtn) {
          const th = addBtn.closest('th');
          const colId = th?.dataset?.colId;
          if (colId) this.openAddColumnModal(colId);
        }
        if (deleteBtn) {
          const th = deleteBtn.closest('th');
          const colId = th?.dataset?.colId;
          if (colId) this.deleteColumn(colId);
        }
        if (titleSpan && !editBtn && !addBtn && !deleteBtn) {
          const th = titleSpan.closest('th');
          const colId = th?.dataset?.colId;
          if (colId) this.editColumnTitleInline(colId, titleSpan);
        }
      });
    }

    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.addEventListener('dblclick', (e) => {
        const cell = e.target.closest('.custom-cell');
        if (cell) {
          const colId = cell.dataset.colId;
          const row = parseInt(cell.dataset.row, 10);
          this.editCell(colId, row, cell);
        }
      });
    }
  },

  handleDragStart(e) {
    const th = e.target.closest('.column-header');
    if (!th) return;
    this._draggedColumn = th.dataset.colId;
    th.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  },

  handleDragOver(e) {
    e.preventDefault();
    const th = e.target.closest('.column-header');
    if (!th || th.dataset.colId === this._draggedColumn) return;
    th.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
  },

  handleDragLeave(e) {
    const th = e.target.closest('.column-header');
    if (th) th.classList.remove('drag-over');
  },

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

  handleDragEnd(e) {
    const th = e.target.closest('.column-header');
    if (th) th.classList.remove('dragging');
    this._draggedColumn = null;
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  },

  swapColumnOrder(colId1, colId2) {
    if (!this.currentTemplate) return;
    const columns = this.currentTemplate.columns;
    const col1 = columns.find(c => c.id === colId1);
    const col2 = columns.find(c => c.id === colId2);
    if (!col1 || !col2) return;
    const tempOrder = col1.order;
    col1.order = col2.order;
    col2.order = tempOrder;
    this.renderTable();
    this.debounceSave();
  },

  debounceSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveCurrentTemplate(), 1000);
  },

  async saveCurrentTemplate() {
    if (!this.currentTemplate?.id) return;
    try {
      const response = await fetch(`/api/templates/${this.currentTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: this.currentTemplate.columns,
          header_color: this.currentTemplate.header_color || '#fef2f2',
        }),
      });
      const result = await response.json();
      if (result.success) {
        await this.fetchEmptyCells();
        this.renderTable();
      } else {
        console.error('保存模版失败:', result.message);
      }
    } catch (error) {
      console.error('保存模版失败:', error);
    }
  },

  showModal(title, fields, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">${this.escapeHtml(title)}</div>
        <div class="modal-body"></div>
        <div class="modal-actions">
          <button class="btn-cancel" id="modal-cancel">取消</button>
          <button class="btn-confirm" id="modal-confirm">确定</button>
        </div>
      </div>
    `;

    const body = overlay.querySelector('.modal-body');
    fields.forEach(f => {
      const div = document.createElement('div');
      div.className = 'modal-field';
      if (f.type === 'color') {
        div.innerHTML = `
          <label>${this.escapeHtml(f.label)}</label>
          <input type="color" id="modal-${f.id}" value="${this.escapeHtml(f.value || '#fef2f2')}">
          <input type="text" id="modal-${f.id}-text" value="${this.escapeHtml(f.value || '#fef2f2')}" class="mt-1">
        `;
      } else if (f.type === 'checkbox') {
        div.innerHTML = `
          <label class="modal-checkbox-opt cursor-pointer">
            <input type="checkbox" id="modal-${f.id}" ${f.value ? 'checked' : ''}>
            <span class="modal-checkbox-text">
              <span class="modal-checkbox-title">${this.escapeHtml(f.label)}</span>
              ${f.desc ? `<span class="modal-checkbox-desc">${this.escapeHtml(f.desc)}</span>` : ''}
            </span>
          </label>
        `;
      } else {
        div.innerHTML = `
          <label>${this.escapeHtml(f.label)}</label>
          <input type="text" id="modal-${f.id}" value="${this.escapeHtml(f.value || '')}" placeholder="${this.escapeHtml(f.placeholder || '')}">
        `;
      }
      body.appendChild(div);
    });

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('#modal-cancel');
    const confirmBtn = overlay.querySelector('#modal-confirm');

    const closeModal = () => document.body.removeChild(overlay);

    cancelBtn.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', () => {
      const data = {};
      fields.forEach(f => {
        const input = overlay.querySelector(`#modal-${f.id}`);
        if (f.type === 'color') {
          data[f.id] = input ? input.value : (f.value || '#fef2f2');
        } else if (f.type === 'checkbox') {
          data[f.id] = input ? input.checked : false;
        } else {
          data[f.id] = input ? input.value.trim() : '';
        }
      });
      closeModal();
      onConfirm(data);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const firstInput = overlay.querySelector('input[type="text"]');
    if (firstInput) firstInput.focus();
  },

  openTemplateSettingsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay template-settings-modal';
    overlay.innerHTML = `
      <div class="modal-content" style="min-width: 520px;">
        <div class="modal-header-row flex items-center justify-between mb-4">
          <div class="modal-title mb-0">模版设置</div>
          <button type="button" class="template-settings-btn tpl-add-btn inline-flex items-center px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-sm sm:text-base" id="tpl-add-btn">+ 新建模版</button>
        </div>
        <div class="modal-body">
          <div id="tpl-settings-message" class="hidden text-sm text-red-600 mb-2"></div>
          <div class="template-settings-list flex flex-wrap gap-2 mb-4"></div>
        </div>
        <div class="modal-actions modal-actions-reverse">
          <button class="btn-cancel" id="tpl-settings-close">关闭</button>
          <button class="btn-confirm" id="tpl-settings-apply">应用</button>
        </div>
      </div>
    `;

    const listEl = overlay.querySelector('.template-settings-list');
    const renderList = () => {
      listEl.innerHTML = this.templates.map(tpl => {
        const bg = tpl.header_color || '#fef2f2';
        return `
        <label class="template-settings-btn template-settings-item inline-flex items-center gap-2 cursor-pointer" style="background-color:${bg}">
          <input type="radio" name="tpl-apply" value="${tpl.id}" ${tpl.id === this.currentTemplate?.id ? 'checked' : ''} class="sr-only">
          <span class="tpl-name font-medium text-slate-800">${this.escapeHtml(tpl.name)}</span>
          <button type="button" class="edit-tpl-btn p-1 rounded hover:bg-slate-300" data-id="${tpl.id}" title="编辑">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button type="button" class="delete-tpl-btn p-1 rounded hover:bg-red-100 text-red-600" data-id="${tpl.id}" title="删除" ${this.templates.length <= 1 ? 'disabled' : ''}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </label>
      `;
      }).join('');
    };
    renderList();

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    overlay.querySelector('#tpl-add-btn').addEventListener('click', async (e) => {
      e.preventDefault();
      const msgEl = overlay.querySelector('#tpl-settings-message');
      msgEl.classList.add('hidden');
      try {
        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '未命名模版',
            columns: this.currentTemplate ? JSON.parse(JSON.stringify(this.currentTemplate.columns)) : JSON.parse(JSON.stringify(DEFAULT_COLUMNS)),
            header_color: this.currentTemplate?.header_color || '#fef2f2',
          }),
        });
        const result = await response.json();
        if (result.success) {
          const listRes = await fetch('/api/templates');
          const listResult = await listRes.json();
          if (listResult.success) {
            this.templates = listResult.data.templates || [];
            renderList();
          }
        } else {
          msgEl.textContent = result.message || '模版名称已存在';
          msgEl.classList.remove('hidden');
        }
      } catch (error) {
        console.error('创建模版失败:', error);
        msgEl.textContent = '创建失败，请重试';
        msgEl.classList.remove('hidden');
      }
    });

    listEl.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-tpl-btn');
      const deleteBtn = e.target.closest('.delete-tpl-btn');
      if (editBtn) {
        e.preventDefault();
        const id = parseInt(editBtn.dataset.id, 10);
        document.body.removeChild(overlay);
        this.openTemplateEditModal(id, () => this.openTemplateSettingsModal());
      }
      if (deleteBtn && !deleteBtn.disabled) {
        e.preventDefault();
        const id = parseInt(deleteBtn.dataset.id, 10);
        if (this.templates.length <= 1) return;
        if (!confirm('确定删除该模版？')) return;
        fetch(`/api/templates/${id}`, { method: 'DELETE' })
          .then(() => {
            this.templates = this.templates.filter(p => p.id !== id);
            if (this.currentTemplate?.id === id) {
              this.currentTemplate = this.templates[0];
            }
            renderList();
            this.renderPreferenceSelector();
            this.renderTable();
          });
      }
    });

    overlay.querySelector('#tpl-settings-close').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.querySelector('#tpl-settings-apply').addEventListener('click', () => {
      const radio = overlay.querySelector('input[name="tpl-apply"]:checked');
      if (radio) {
        const templateId = parseInt(radio.value, 10);
        const tpl = this.templates.find(t => t.id === templateId);
        if (tpl) {
          this.currentTemplate = tpl;
          this.renderPreferenceSelector();
          this.renderTable();
        }
      }
      document.body.removeChild(overlay);
    });
  },

  openTemplateEditModal(templateId, onClose) {
    const tpl = this.templates.find(t => t.id === templateId);
    if (!tpl) return;

    const columns = JSON.parse(JSON.stringify(tpl.columns || []));
    const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    const defaultColIds = ['suite', 'name', 'preconditions', 'steps', 'expectedresults', 'importance'];
    let headerColor = tpl.header_color || '#fef2f2';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay template-edit-modal';
    overlay.innerHTML = `
      <div class="modal-content" style="min-width: 560px;">
        <div class="modal-title">编辑模版</div>
        <div class="modal-body">
          <div id="tpl-edit-message" class="hidden text-sm text-red-600 mb-2"></div>
          <div class="modal-field">
            <label>模版名称</label>
            <input type="text" id="tpl-edit-name" value="${this.escapeHtml(tpl.name)}" placeholder="模版名称" maxlength="20">
          </div>
          <div class="modal-field">
            <label>标题行字段</label>
            <div class="tpl-edit-columns-list border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto"></div>
            <div class="tpl-edit-columns-actions mt-3 flex items-center gap-2">
              <button type="button" class="tpl-add-column-btn">+ 新增字段</button>
              <button type="button" class="tpl-restore-default-btn">恢复默认</button>
            </div>
          </div>
          <div class="modal-field">
            <label>标题行颜色</label>
            <div class="color-swatch-grid mb-2"></div>
            <input type="text" id="tpl-edit-header-color-text" value="${headerColor}" placeholder="#fef2f2" class="w-full border border-slate-200 rounded px-2 py-1 text-sm">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="tpl-edit-cancel">取消</button>
          <button class="btn-confirm" id="tpl-edit-save">保存</button>
        </div>
      </div>
    `;

    const listEl = overlay.querySelector('.tpl-edit-columns-list');
    const swatchGrid = overlay.querySelector('.color-swatch-grid');
    const colorText = overlay.querySelector('#tpl-edit-header-color-text');

    const renderColorSwatches = () => {
      swatchGrid.innerHTML = HEADER_COLOR_PRESETS.map(c => `
        <button type="button" class="color-swatch ${c === headerColor ? 'color-swatch-selected' : ''}" data-color="${c}" style="background-color:${c}" title="${c}"></button>
      `).join('');
    };
    renderColorSwatches();

    swatchGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.color-swatch');
      if (btn) {
        headerColor = btn.dataset.color;
        colorText.value = headerColor;
        renderColorSwatches();
      }
    });

    colorText.addEventListener('input', () => {
      const v = (colorText.value || '').trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        headerColor = v;
        renderColorSwatches();
      }
    });

    const renderColumnRow = (col, index) => {
      const isDefault = defaultColIds.includes(col.id);
      const row = document.createElement('div');
      row.className = 'tpl-edit-column-row tpl-col-collapsed';
      row.dataset.colId = col.id;
      row.dataset.index = String(index);

      const header = document.createElement('div');
      header.className = 'tpl-col-header flex items-center gap-2 cursor-pointer';
      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'tpl-col-toggle text-slate-500';
      toggleIcon.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'tpl-col-name-preview font-medium text-slate-800';
      nameSpan.textContent = col.name || '未命名';
      header.appendChild(toggleIcon);
      header.appendChild(nameSpan);
      if (!isDefault) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'tpl-col-delete ml-auto p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600';
        delBtn.title = '删除';
        delBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>';
        delBtn.addEventListener('click', (e) => { e.stopPropagation(); });
        header.appendChild(delBtn);
      }
      row.appendChild(header);

      const body = document.createElement('div');
      body.className = 'tpl-col-body';
      const nameField = document.createElement('div');
      nameField.className = 'tpl-col-field';
      nameField.innerHTML = '<label class="tpl-col-field-label">字段名</label>';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'tpl-col-name';
      nameInput.placeholder = '字段名';
      nameInput.value = col.name || '';
      nameField.appendChild(nameInput);
      body.appendChild(nameField);

      if (col.is_custom) {
        const defaultField = document.createElement('div');
        defaultField.className = 'tpl-col-field';
        defaultField.innerHTML = '<label class="tpl-col-field-label">默认值</label>';
        const defaultValInput = document.createElement('input');
        defaultValInput.type = 'text';
        defaultValInput.className = 'tpl-col-default';
        defaultValInput.placeholder = '可选';
        defaultValInput.value = col.default_value || '';
        defaultField.appendChild(defaultValInput);
        body.appendChild(defaultField);
      }

      const optsField = document.createElement('div');
      optsField.className = 'tpl-col-opts space-y-3';
      optsField.innerHTML = '<label class="tpl-col-field-label">选项</label>';
      const richTextLabel = document.createElement('label');
      richTextLabel.className = 'tpl-col-opt cursor-pointer';
      richTextLabel.innerHTML = `
        <input type="checkbox" class="tpl-col-rich-text-break-input" ${col.rich_text_break ? 'checked' : ''}>
        <span class="tpl-col-opt-text">
          <span class="tpl-col-opt-title">富文本换行处理</span>
          <span class="tpl-col-opt-desc">导出时将换行符转为 HTML 换行标签，便于在富文本编辑器中正确显示多行内容</span>
        </span>
      `;
      const emptyCheckLabel = document.createElement('label');
      emptyCheckLabel.className = 'tpl-col-opt cursor-pointer';
      emptyCheckLabel.innerHTML = `
        <input type="checkbox" class="tpl-col-empty-check-input" ${col.empty_check ? 'checked' : ''}>
        <span class="tpl-col-opt-text">
          <span class="tpl-col-opt-title">空值校验处理</span>
          <span class="tpl-col-opt-desc">当该列存在空值时显示提醒，点击可快速定位到对应单元格并高亮显示</span>
        </span>
      `;
      optsField.appendChild(richTextLabel);
      optsField.appendChild(emptyCheckLabel);
      body.appendChild(optsField);

      row.appendChild(body);

      header.addEventListener('click', (e) => {
        if (e.target.closest('.tpl-col-delete')) return;
        row.classList.toggle('tpl-col-collapsed');
        toggleIcon.innerHTML = row.classList.contains('tpl-col-collapsed')
          ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>'
          : '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
      });

      return row;
    };

    const syncColumnsFromDOM = () => {
      listEl.querySelectorAll('.tpl-edit-column-row').forEach((row) => {
        const colId = row.dataset?.colId;
        const col = sortedColumns.find(c => c.id === colId);
        if (col) {
          const nameInput = row.querySelector('.tpl-col-name');
          const defaultInput = row.querySelector('.tpl-col-default');
          const richTextInput = row.querySelector('.tpl-col-rich-text-break-input');
          const emptyCheckInput = row.querySelector('.tpl-col-empty-check-input');
          if (nameInput) col.name = (nameInput.value || '').trim() || col.name;
          if (col.is_custom && defaultInput) col.default_value = (defaultInput.value || '').trim();
          if (richTextInput) col.rich_text_break = richTextInput.checked;
          if (emptyCheckInput) col.empty_check = emptyCheckInput.checked;
        }
      });
    };

    const refreshColumnList = (opts = {}) => {
      if (opts.skipSync !== true) syncColumnsFromDOM();
      listEl.innerHTML = '';
      sortedColumns.forEach((col, i) => {
        listEl.appendChild(renderColumnRow(col, i));
      });
    };

    refreshColumnList();

    listEl.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.tpl-col-delete');
      if (!delBtn) return;
      e.stopPropagation();
      const row = delBtn.closest('.tpl-edit-column-row');
      const colId = row?.dataset?.colId;
      if (!colId || defaultColIds.includes(colId)) return;
      const idx = sortedColumns.findIndex(c => c.id === colId);
      if (idx >= 0) {
        sortedColumns.splice(idx, 1);
        refreshColumnList();
      }
    });

    overlay.querySelector('.tpl-add-column-btn').addEventListener('click', () => {
      const customColumns = sortedColumns.filter(c => c.is_custom);
      const maxNum = customColumns.reduce((max, c) => {
        const m = (c.id || '').match(/^custom_(\d+)$/);
        return Math.max(max, m ? parseInt(m[1]) : 0);
      }, 0);
      const newCol = {
        id: `custom_${maxNum + 1}`,
        name: '未命名字段',
        order: sortedColumns.length + 1,
        is_custom: true,
        default_value: '',
        rich_text_break: false,
        empty_check: false,
        values: {},
      };
      sortedColumns.push(newCol);
      refreshColumnList();
    });

    overlay.querySelector('.tpl-restore-default-btn').addEventListener('click', () => {
      sortedColumns.length = 0;
      DEFAULT_COLUMNS.forEach((c, i) => {
        sortedColumns.push({
          ...c,
          order: i + 1,
          rich_text_break: false,
          empty_check: false,
        });
      });
      headerColor = '#fef2f2';
      colorText.value = headerColor;
      renderColorSwatches();
      refreshColumnList({ skipSync: true });
    });

    const closeAndReturn = () => {
      document.body.removeChild(overlay);
      if (typeof onClose === 'function') onClose();
    };

    overlay.querySelector('#tpl-edit-cancel').addEventListener('click', closeAndReturn);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAndReturn(); });

    overlay.querySelector('#tpl-edit-save').addEventListener('click', async () => {
      const msgEl = overlay.querySelector('#tpl-edit-message');
      msgEl.classList.add('hidden');

      const nameInput = overlay.querySelector('#tpl-edit-name');
      const name = (nameInput?.value || '').trim() || tpl.name;

      syncColumnsFromDOM();
      overlay.querySelectorAll('.tpl-edit-column-row').forEach((row, i) => {
        const colId = row.dataset?.colId;
        const col = sortedColumns.find(c => c.id === colId);
        if (col) col.order = i + 1;
      });

      const finalHeaderColor = (colorText.value || '').trim() || headerColor;
      if (!/^#[0-9a-fA-F]{6}$/.test(finalHeaderColor)) {
        msgEl.textContent = '请输入有效的十六进制颜色（如 #fef2f2）';
        msgEl.classList.remove('hidden');
        return;
      }

      try {
        const response = await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            columns: sortedColumns,
            header_color: finalHeaderColor,
          }),
        });
        const result = await response.json();
        if (result.success) {
          tpl.name = name;
          tpl.columns = sortedColumns;
          tpl.header_color = finalHeaderColor;
          this.currentTemplate = tpl;
          this.renderPreferenceSelector();
          this.renderTable();
          closeAndReturn();
        } else {
          msgEl.textContent = result.message || '保存失败';
          msgEl.classList.remove('hidden');
        }
      } catch (error) {
        console.error('保存模版失败:', error);
        msgEl.textContent = '保存失败，请重试';
        msgEl.classList.remove('hidden');
      }
    });

    document.body.appendChild(overlay);
    overlay.querySelector('#tpl-edit-name')?.focus();
  },

  openAddColumnModal(afterColId) {
    this.showModal('新增列', [
      { id: 'name', label: '列名称', value: '未命名字段', placeholder: '未命名字段' },
      { id: 'default_value', label: '默认值', value: '', placeholder: '可选，为空则留空' },
      { id: 'rich_text_break', type: 'checkbox', label: '富文本换行处理', value: false, desc: '导出时将换行符转为 HTML 换行标签，便于在富文本编辑器中正确显示多行内容' },
      { id: 'empty_check', type: 'checkbox', label: '空值校验处理', value: false, desc: '当该列存在空值时显示提醒，点击可快速定位到对应单元格并高亮显示' },
    ], async (data) => {
      await this.addColumn(data.name || '未命名字段', data.default_value || '', data.rich_text_break || false, data.empty_check || false, afterColId);
    });
  },

  openEditColumnModal(colId) {
    if (!this.currentTemplate) return;
    const column = this.currentTemplate.columns.find(c => c.id === colId);
    if (!column) return;

    this.showModal('编辑列', [
      { id: 'name', label: '列名称', value: column.name },
      { id: 'default_value', label: '默认值', value: column.default_value || '', placeholder: '自定义列可设置' },
      { id: 'rich_text_break', type: 'checkbox', label: '富文本换行处理', value: !!column.rich_text_break, desc: '导出时将换行符转为 HTML 换行标签，便于在富文本编辑器中正确显示多行内容' },
      { id: 'empty_check', type: 'checkbox', label: '空值校验处理', value: !!column.empty_check, desc: '当该列存在空值时显示提醒，点击可快速定位到对应单元格并高亮显示' },
    ], async (data) => {
      await this.updateColumn(colId, data.name, data.default_value, data.rich_text_break, data.empty_check);
    });
  },

  async addColumn(name, defaultValue, richTextBreak, emptyCheck, afterColId) {
    if (!this.currentTemplate) return;

    const columns = this.currentTemplate.columns;
    const customColumns = columns.filter(c => c.is_custom);
    const maxNum = customColumns.reduce((max, c) => {
      const m = c.id.match(/^custom_(\d+)$/);
      return Math.max(max, m ? parseInt(m[1]) : 0);
    }, 0);

    const newColumn = {
      id: `custom_${maxNum + 1}`,
      name: name || '未命名字段',
      order: columns.length + 1,
      is_custom: true,
      default_value: defaultValue || '',
      rich_text_break: !!richTextBreak,
      empty_check: !!emptyCheck,
      values: {},
    };

    if (afterColId) {
      const afterCol = columns.find(c => c.id === afterColId);
      const afterOrder = afterCol ? afterCol.order : columns.length;
      newColumn.order = afterOrder + 1;
      columns.forEach(c => {
        if (c.order > afterOrder) c.order += 1;
      });
      const insertIndex = columns.findIndex(c => c.id === afterColId) + 1;
      columns.splice(insertIndex, 0, newColumn);
    } else {
      columns.push(newColumn);
    }

    if (defaultValue) {
      for (let i = 0; i < this.total; i++) {
        newColumn.values[i] = defaultValue;
      }
    }

    this.renderTable();
    this.debounceSave();
  },

  editColumnTitleInline(colId, spanElement) {
    if (!this.currentTemplate) return;
    const column = this.currentTemplate.columns.find(c => c.id === colId);
    if (!column) return;

    const currentName = column.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'column-title-input border border-indigo-300 rounded px-1 py-0 text-sm w-24';
    input.style.minWidth = '80px';

    spanElement.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newName = input.value.trim() || currentName;
      column.name = newName;
      const span = document.createElement('span');
      span.className = 'column-title';
      span.textContent = newName;
      input.replaceWith(span);
      this.debounceSave();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      else if (e.key === 'Escape') {
        const span = document.createElement('span');
        span.className = 'column-title';
        span.textContent = currentName;
        input.replaceWith(span);
      }
    });
  },

  async updateColumn(colId, name, defaultValue, richTextBreak, emptyCheck) {
    if (!this.currentTemplate) return;
    const column = this.currentTemplate.columns.find(c => c.id === colId);
    if (!column) return;

    column.name = name;
    column.rich_text_break = !!richTextBreak;
    column.empty_check = !!emptyCheck;
    if (column.is_custom) {
      column.default_value = defaultValue || '';
    }

    this.renderTable();
    this.debounceSave();
  },

  async deleteColumn(colId) {
    if (!this.currentTemplate) return;
    const column = this.currentTemplate.columns.find(c => c.id === colId);
    if (!column || !column.is_custom) return;

    if (!confirm(`确定删除列"${this.escapeHtml(column.name)}"吗？`)) return;

    this.currentTemplate.columns = this.currentTemplate.columns.filter(c => c.id !== colId);
    this.renderTable();
    this.debounceSave();
  },

  editCell(colId, row, cellElement) {
    if (!this.currentTemplate) return;
    const column = this.currentTemplate.columns.find(c => c.id === colId);
    if (!column || !column.is_custom) return;

    const currentValue = column.values?.[row] !== undefined ? column.values[row] : (column.default_value || '');

    cellElement.classList.add('editing');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.className = 'w-full px-2 py-1 border border-indigo-300 rounded';

    cellElement.innerHTML = '';
    cellElement.appendChild(input);
    input.focus();
    input.select();

    let saved = false;
    const saveValue = () => {
      if (saved) return;
      saved = true;
      input.removeEventListener('blur', saveValue);
      const newValue = input.value;
      if (!column.values) column.values = {};
      column.values[row] = newValue;
      cellElement.classList.remove('editing');
      cellElement.innerHTML = '';
      const span = document.createElement('span');
      span.className = 'table-cell-content';
      span.textContent = newValue || column.default_value || '';
      span.title = newValue || column.default_value || '';
      cellElement.appendChild(span);
      this.debounceSave();
    };

    const cancelEdit = () => {
      if (saved) return;
      saved = true;
      input.removeEventListener('blur', saveValue);
      cellElement.classList.remove('editing');
      cellElement.innerHTML = '';
      const span = document.createElement('span');
      span.className = 'table-cell-content';
      span.textContent = currentValue;
      span.title = currentValue;
      cellElement.appendChild(span);
    };

    input.addEventListener('blur', saveValue);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        saveValue();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEdit();
      }
    });
  },

  async switchTemplate(templateId) {
    const tpl = this.templates.find(t => t.id === templateId);
    if (!tpl) return;
    this.currentTemplate = tpl;
    this.renderPreferenceSelector();
    await this.fetchEmptyCells();
    this.renderTable();
  },

  openExportModal(type) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay export-modal';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-title">选择导出模版</div>
        <div class="modal-field">
          <label>选择模版配置</label>
          <div class="template-list">
            ${this.templates.map(tpl => `
              <label class="template-item ${tpl.id === this.currentTemplate?.id ? 'selected' : ''}">
                <input type="radio" name="export-tpl" value="${tpl.id}"
                       ${tpl.id === this.currentTemplate?.id ? 'checked' : ''}>
                <div class="template-info">
                  <div class="template-name">${this.escapeHtml(tpl.name)}</div>
                  <div class="template-description">${tpl.columns.length} 列</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" id="export-cancel">取消</button>
          <button class="btn-confirm" id="export-confirm">导出 ${type.toUpperCase()}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cancelBtn = overlay.querySelector('#export-cancel');
    const confirmBtn = overlay.querySelector('#export-confirm');
    const templateList = overlay.querySelector('.template-list');

    const closeModal = () => document.body.removeChild(overlay);

    cancelBtn.addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', async () => {
      const selected = overlay.querySelector('input[name="export-tpl"]:checked');
      const templateId = selected ? parseInt(selected.value) : null;
      closeModal();
      await this.doExport(type, templateId);
    });

    templateList?.addEventListener('change', (e) => {
      if (e.target.type === 'radio') {
        templateList.querySelectorAll('.template-item').forEach(item => item.classList.remove('selected'));
        e.target.closest('.template-item')?.classList.add('selected');
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  },

  async doExport(type, templateId) {
    try {
      const url = `/api/export/${encodeURIComponent(this.filename)}/${type}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
      });

      if (!response.ok) throw new Error('导出失败');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${this.filename.replace('.xmind', '')}.${type}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  ColumnManager.init();
});
