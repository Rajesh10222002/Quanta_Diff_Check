// Show initial loader
const initialLoader = document.querySelector('.initial-loader');
const progressBar = document.getElementById('initialProgressBar');

// Animate progress bar
let progress = 0;
const progressInterval = setInterval(() => {
    progress += 1;
    progressBar.style.width = `${progress}%`;
    
    // Add some randomness to make it feel more natural
    if (Math.random() > 0.7) {
        progress += Math.random() * 3;
    }
    
    if (progress >= 100) {
        clearInterval(progressInterval);
    }
}, 40); // 40ms interval for ~4 second load time

// Hide loader after 4.5 seconds (can adjust this timing)
setTimeout(() => {
    initialLoader.classList.add('hidden');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
        initialLoader.remove();
    }, 800);
}, 4500);

class SchemaComparator {
    constructor() {
        this.files = { schema1: null, schema2: null };
        this.results = null;
        this.currentView = 'differences';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        ['upload1', 'upload2'].forEach((id, index) => {
            const uploadZone = document.getElementById(id);
            const fileInput = document.getElementById(`file${index + 1}`);

            uploadZone.addEventListener('click', () => fileInput.click());
            uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadZone.addEventListener('drop', (e) => this.handleFileDrop(e, index + 1));
            uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));

            fileInput.addEventListener('change', (e) => this.handleFileSelect(e, index + 1));
        });
        document.getElementById('resetBtn').addEventListener('click', this.resetAll.bind(this));


        document.getElementById('compareBtn').addEventListener('click', this.compareSchemas.bind(this));

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab));
        });

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.currentView = view;

                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                const activeTab = document.querySelector('.tab.active');
                if (activeTab) {
                    this.renderTabContent(activeTab.dataset.tab, this.results[activeTab.dataset.tab]);
                }
            });
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleFileDrop(e, fileNumber) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.zip')) {
            this.processFile(files[0], fileNumber);
        }
    }

    handleFileSelect(e, fileNumber) {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.zip')) {
            this.processFile(file, fileNumber);
        }
    }

    processFile(file, fileNumber) {
        this.files[`schema${fileNumber}`] = file;

        const fileInfo = document.getElementById(`fileInfo${fileNumber}`);
        const fileName = document.getElementById(`fileName${fileNumber}`);
        const fileSize = document.getElementById(`fileSize${fileNumber}`);

        document.getElementById(`upload${fileNumber}`).classList.add('uploaded');
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        fileInfo.classList.add('show');

        this.updateCompareButton();
    }

    formatFileSize(bytes) {
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateCompareButton() {
        const compareBtn = document.getElementById('compareBtn');
        compareBtn.disabled = !(this.files.schema1 && this.files.schema2);
    }

    resetAll() {
        // Clear file inputs and UI
        this.files = { schema1: null, schema2: null };
        this.results = null;

        // Remove file info and uploaded styles
        [1, 2].forEach(num => {
            document.getElementById(`upload${num}`).classList.remove('uploaded');
            document.getElementById(`fileInfo${num}`).classList.remove('show');
            document.getElementById(`fileName${num}`).textContent = '';
            document.getElementById(`fileSize${num}`).textContent = '';
            document.getElementById(`file${num}`).value = '';
        });

        // Reset compare button
        this.updateCompareButton();

        // Hide results and loading, clear result HTML
        document.getElementById('results').classList.remove('show');
        document.getElementById('results').querySelectorAll('.tab-content').forEach(tc => tc.innerHTML = '');
        document.getElementById('summary').innerHTML = '';
        document.getElementById('loading').classList.remove('show');
        document.getElementById('loading').innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <div class="loading-text">Analyzing schemas...</div>
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;

        // Reset toggles and tabs to initial state
        document.querySelectorAll('.toggle-btn').forEach((btn, idx) => {
            if (idx === 0) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach((tab, idx) => {
            if (idx === 0) tab.classList.add('active');
            else tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach((tc, idx) => {
            if (idx === 0) tc.classList.add('active');
            else tc.classList.remove('active');
        });

        // Reset tab indicator position
        const activeTab = document.querySelector('.tab.active');
        const tabIndicator = document.querySelector('.tab-indicator');
        if (activeTab && tabIndicator) {
            tabIndicator.style.width = `${activeTab.offsetWidth}px`;
            tabIndicator.style.left = `${activeTab.offsetLeft}px`;
        }

        // Set currentView back to default
        this.currentView = 'differences';
    }


    async compareSchemas() {
        const loading = document.getElementById('loading');
        const results = document.getElementById('results');
        loading.classList.add('show');
        results.classList.remove('show');

        try {
            const schema1Data = await this.parseSchemaZip(this.files.schema1);
            const schema2Data = await this.parseSchemaZip(this.files.schema2);
            this.results = this.generateComparison(schema1Data, schema2Data);
            // Attach loaderTableMaps for use in rendering Changed table
            this.results.tables.loaderTableMap1 = schema1Data.loaderTableMap;
            this.results.tables.loaderTableMap2 = schema2Data.loaderTableMap;
            this.displayResults();


        } catch (error) {
            console.error('Comparison failed:', error);
            this.showError('Error comparing schemas. Please check the file formats.');
        } finally {
            loading.classList.remove('show');
        }
    }

    showError(message) {
        const loading = document.getElementById('loading');
        loading.innerHTML = `
            <div class="loading-content">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="error-text">${message}</div>
            </div>
        `;
    }
    getSchemaName(xmlString) {
        const match = xmlString.match(/<schema[^>]*name="([^"]+)"/);
        return match ? match[1] : '';
    }
    normalizeLoaderTableName(fullName, schemaName) {
        if (!fullName) return '';
        if (fullName.startsWith(schemaName + '.')) {
            return fullName.substring(schemaName.length + 1);
        }
        return fullName;
    }

    getLoaderPropertyChanges(tableName, loaderMap1, loaderMap2) {
        const loader1 = loaderMap1?.[tableName] || {};
        const loader2 = loaderMap2?.[tableName] || {};
        const changes = [];

        // Compare all shallow properties (skip objects/arrays)
        const allKeys = new Set([...Object.keys(loader1), ...Object.keys(loader2)]);
        allKeys.forEach(key => {
            if (typeof loader1[key] === 'object' || typeof loader2[key] === 'object') return;

            // Normalize if it's a SQL/script field
            if (['query', 'script', 'incrementalScript', 'incrementalMethod', 'incrementalCol', 'queryupdate'].includes(key.toLowerCase())) {
                if (this.normalizeSQL(loader1[key] || '') !== this.normalizeSQL(loader2[key] || '')) {
                    changes.push({
                        key: `loader.${key}`,
                        oldValue: loader1[key] || '-',
                        newValue: loader2[key] || '-'
                    });
                }
                return;
            }

            // Normal string comparison
            if ((loader1[key] || '') !== (loader2[key] || '')) {
                changes.push({
                    key: `loader.${key}`,
                    oldValue: loader1[key] || '-',
                    newValue: loader2[key] || '-'
                });
            }
        });

        // --- THIS IS WHERE YOUR NEW CODE GOES ---
        const allPropKeys = new Set([
            ...Object.keys(loader1.properties || {}),
            ...Object.keys(loader2.properties || {})
        ]);
        allPropKeys.forEach(propKey => {
            const val1 = loader1.properties?.[propKey];
            const val2 = loader2.properties?.[propKey];
            if (['query', 'queryupdate', 'script'].includes(propKey.toLowerCase())) {
                if (this.normalizeSQL(val1 || '') !== this.normalizeSQL(val2 || '')) {
                    changes.push({
                        key: `loader.properties.${propKey}`,
                        oldValue: val1 || '-',
                        newValue: val2 || '-'
                    });
                }
            } else {
                if ((val1 || '') !== (val2 || '')) {
                    changes.push({
                        key: `loader.properties.${propKey}`,
                        oldValue: val1 || '-',
                        newValue: val2 || '-'
                    });
                }
            }
        });

        return changes;
    }



    async parseSchemaZip(file) {
        const zip = await JSZip.loadAsync(file);
        let schemaXml = null;
        let loaderXml = null;

        for (const filename in zip.files) {
            if (filename.includes('_schema.xml')) {
                schemaXml = await zip.files[filename].async('text');
            } else if (filename.includes('_loader.xml')) {
                loaderXml = await zip.files[filename].async('text');
            }
        }

        if (!schemaXml) throw new Error('No schema XML file found');
        if (!loaderXml) throw new Error('No loader XML file found');

        const schemaName = this.getSchemaName(schemaXml);
        const schemaData = this.parseXML(schemaXml);
        const loaderData = this.parseLoaderXML(loaderXml);

        // --- NEW: build a map of loader tables by shortName ---
        const loaderTableMap = {};
        loaderData.tables.forEach(t => {
            const shortName = this.normalizeLoaderTableName(t.name, schemaName);
            loaderTableMap[shortName] = t;
        });

        // --- DO NOT MERGE loader tables into schema tables! ---

        return {
            ...schemaData,
            loaderTableMap,   // use this for lookup in display/changed logic
            schemaName
        };
    }



    parseLoaderXML(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        const result = { tables: [] };

        // Parse transformer tables
        const transformers = doc.querySelectorAll('transformer');
        transformers.forEach(t => {
            const tableData = {
                name: t.getAttribute('table'),
                source: 'transformer',
                type: 'transformer',
                properties: {},
                query: t.querySelector('script')?.textContent.trim() || '',
                incrementalScript: t.querySelector('incrementalScript')?.textContent.trim() || '',
                incrementalMethod: t.querySelector('incrementalMethod')?.textContent.trim() || '',
                incrementalCol: t.querySelector('incrementalCol')?.textContent.trim() || ''
            };

            Array.from(t.attributes).forEach(attr => tableData[attr.name] = attr.value);

            t.querySelectorAll('properties > property').forEach(p => {
                const name = p.getAttribute('name');
                const value = p.textContent.trim();
                if (name) tableData.properties[name] = value;
            });

            result.tables.push(tableData);
        });

        // Parse dataset tables
        const datasets = doc.querySelectorAll('dataset');
        datasets.forEach(d => {
            const tableData = {
                name: d.getAttribute('table'),
                source: 'dataset',
                type: 'dataset',
                properties: {},
                query: '',
            };

            Array.from(d.attributes).forEach(attr => tableData[attr.name] = attr.value);

            d.querySelectorAll('property').forEach(p => {
                const name = p.getAttribute('name');
                const value = p.textContent.trim();
                if (name === 'query') {
                    tableData.query = value;
                }
                tableData.properties[name] = value;

            });

            result.tables.push(tableData);
        });

        return result;
    }


    parseXML(xmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');
        const result = { tables: [], columns: [], joins: [] };

        const tables = doc.querySelectorAll('tables table');
        tables.forEach(table => {
            const tableData = { name: table.getAttribute('name') };
            Array.from(table.attributes).forEach(attr => tableData[attr.name] = attr.value);

            // Extract filter information
            const filter = table.querySelector('filter cond');
            if (filter) {
                tableData.filter_formula = filter.getAttribute('formula') || '';
                tableData.filter_op = filter.getAttribute('op') || '';
            }


            result.tables.push(tableData);

            const columns = table.querySelectorAll('column');
            columns.forEach(column => {
                const columnData = {
                    table: table.getAttribute('name'),
                    name: column.getAttribute('name')
                };
                Array.from(column.attributes).forEach(attr => columnData[attr.name] = attr.value);
                if (column.getAttribute('formula')) columnData.type = 'formula';
                result.columns.push(columnData);
            });
        });

        const joins = doc.querySelectorAll('joins join');
        joins.forEach(join => {
            const cond = join.querySelector('cond');
            if (cond) {
                const joinData = {};
                Array.from(join.attributes).forEach(attr => {
                    if (!['join_name', 'name'].includes(attr.name)) {
                        joinData[attr.name] = attr.value;
                    }
                });
                Array.from(cond.attributes).forEach(attr => joinData[attr.name] = attr.value);
                result.joins.push(joinData);
            }
        });

        return result;
    }

    generateComparison(schema1, schema2) {
        const results = {};
        ['tables', 'columns', 'joins'].forEach(type => {
            const isJoin = type === 'joins';
            const keyField = !isJoin ? (type === 'tables' ? 'name' : ['table', 'name']) : null;

            const comparator = isJoin ? (a, b) => (
                this.normalizeValue(a.parent) === this.normalizeValue(b.parent) &&
                this.normalizeValue(a.child) === this.normalizeValue(b.child) &&
                this.normalizeValue(a.op) === this.normalizeValue(b.op)
            ) : null;

            const diffs = this.compareArrays(schema1[type], schema2[type], keyField, comparator);
            diffs.similar = this.findSimilar(schema1[type], schema2[type], keyField, comparator);
            results[type] = diffs;
        });
        return results;
    }

    compareArrays(arr1, arr2, keyField, comparator = null) {
        const matched = new Set();
        const added = [];
        const removed = [...arr1];
        const changed = [];

        for (const item2 of arr2) {
            const matchIndex = arr1.findIndex(item1 =>
                comparator ? comparator(item1, item2) : this.getKey(item1, keyField) === this.getKey(item2, keyField)
            );

            if (matchIndex !== -1) {
                const item1 = arr1[matchIndex];
                matched.add(item1);
                removed.splice(removed.indexOf(item1), 1);

                // ---- CHANGED: Check schema and loader difference ----
                let schemaChanged = !this.deepEqual(item1, item2);
                let loaderChanged = false;
                if (keyField === 'name' && this.results) { // Only for tables
                    const tableName = this.getKey(item1, keyField);
                    // Compare loader properties:
                    const loaderChanges = this.getLoaderPropertyChanges(
                        tableName,
                        this.results.tables.loaderTableMap1,
                        this.results.tables.loaderTableMap2
                    );
                    loaderChanged = loaderChanges.length > 0;
                }

                if (schemaChanged || loaderChanged) {
                    changed.push({ old: item1, new: item2 });
                }
            } else {
                added.push(item2);
            }
        }

        return { added, removed, changed };
    }


    findSimilar(arr1, arr2, keyField, comparator = null) {
        return arr1.filter(item1 =>
            arr2.some(item2 =>
                comparator ? comparator(item1, item2) : this.getKey(item1, keyField) === this.getKey(item2, keyField)
            ) && this.deepEqual(item1, arr2.find(item2 =>
                comparator ? comparator(item1, item2) : this.getKey(item1, keyField) === this.getKey(item2, keyField)
            ))
        );
    }

    getKey(item, keyField) {
        if (!keyField) return null;
        return Array.isArray(keyField) ? keyField.map(k => item[k]).join('.') : item[keyField];
    }

    normalizeValue(value) {
        if (value === undefined || value === null) return '';
        if (typeof value === 'string') {
            return value.trim().toLowerCase()
                .replace(/\s*\.\s*/g, '.')
                .replace(/\s*\(\s*/g, '(')
                .replace(/\s*\)\s*/g, ')')
                .replace(/\s+/g, ' ');
        }
        return typeof value === 'object' ? JSON.stringify(value) : value.toString().toLowerCase();
    }

    normalizeSQL(query) {
        if (!query) return '';
        // Remove single-line comments
        let noComments = query.replace(/--.*$/gm, '');
        // Remove multi-line comments
        noComments = noComments.replace(/\/\*[\s\S]*?\*\//gm, '');
        // Collapse whitespace to a single space, trim, lowercase
        let normalized = noComments.replace(/\s+/g, ' ').trim().toLowerCase();
        // Remove trailing semicolons
        normalized = normalized.replace(/;+$/, '');
        return normalized;
    }


    deepEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) {
            return this.normalizeValue(a) === this.normalizeValue(b);
        }

        // Special handling for filter objects


        const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
        for (const key of allKeys) {
            if ((a?.parent && a?.child && b?.parent && b?.child) && ['join_name', 'name'].includes(key)) continue;
            if (!this.deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
    getPropertyChanges(oldObj, newObj) {
        const changes = [];
        const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

        for (const key of allKeys) {
            const isJoin = oldObj?.parent && oldObj?.child;
            if (isJoin && ['join_name', 'name'].includes(key)) continue;

            // Shallow keys
            if (key !== 'properties' && !this.deepEqual(oldObj[key], newObj[key])) {
                changes.push({
                    key,
                    oldValue: oldObj[key],
                    newValue: newObj[key]
                });
            }
        }

        // Deep compare nested "properties"
        const allPropKeys = new Set([
            ...Object.keys(oldObj.properties || {}),
            ...Object.keys(newObj.properties || {})
        ]);
        for (const pKey of allPropKeys) {
            const oldVal = oldObj.properties?.[pKey];
            const newVal = newObj.properties?.[pKey];
            if (!this.deepEqual(oldVal, newVal)) {
                changes.push({
                    key: `properties.${pKey}`,
                    oldValue: oldVal,
                    newValue: newVal
                });
            }
        }

        return changes;
    }




    displayResults() {
        const results = document.getElementById('results');
        const summary = document.getElementById('summary');

        let totalAdded = 0, totalRemoved = 0, totalChanged = 0, totalSimilar = 0;
        Object.values(this.results).forEach(result => {
            totalAdded += result.added.length;
            totalRemoved += result.removed.length;
            totalChanged += result.changed.length;
            totalSimilar += result.similar.length;
        });

        summary.innerHTML = `
            <div class="summary-item summary-added">
                <i class="fas fa-plus-circle"></i> +${totalAdded} Added
            </div>
            <div class="summary-item summary-removed">
                <i class="fas fa-minus-circle"></i> -${totalRemoved} Removed
            </div>
            <div class="summary-item summary-changed">
                <i class="fas fa-exchange-alt"></i> ~${totalChanged} Changed
            </div>
            <div class="summary-item summary-similar">
                <i class="fas fa-check-circle"></i> =${totalSimilar} Similar
            </div>
        `;

        ['tables', 'columns', 'joins'].forEach(type => {
            this.renderTabContent(type, this.results[type]);
        });

        results.classList.add('show');
    }


    renderDiffSection(title, items, type, icon, color) {
        if (items.length === 0) return '';

        // Each section gets a unique id for search input and table wrapper
        const searchId = `search-${type}-${title.replace(/\s+/g, '').toLowerCase()}`;
        const tableId = `table-${type}-${title.replace(/\s+/g, '').toLowerCase()}`;

        return `
    <div class="diff-section">
      <div class="diff-header">
        <i class="fas fa-chevron-right diff-icon"></i>
        <div class="diff-title"><i class="fas fa-${icon} text-${color}"></i> ${title}</div>
        <div class="diff-count ${type}">${items.length}</div>
      </div>
      <div class="diff-content">
        <div class="search-container" style="margin: 1rem 0;">
          <input type="text" class="diff-search" id="${searchId}" placeholder="Search" data-table="${tableId}">
        </div>
        <div class="table-container" id="${tableId}">
          ${this.renderDiffTable(items, type)}
        </div>
        <div class="diff-scrollbar"></div>
      </div>
    </div>
    `;
    }

    renderTabContent(type, data) {
        const container = document.getElementById(type);
        const view = this.currentView;

        if (view === 'similarities') {
            container.innerHTML = this.renderDiffSection('Similar', data.similar, 'similar', 'check-circle', 'primary');
        } else {
            container.innerHTML = `
                ${this.renderDiffSection('Added', data.added, 'added', 'plus-circle', 'success')}
                ${this.renderDiffSection('Removed', data.removed, 'removed', 'minus-circle', 'danger')}
                ${this.renderDiffSection('Changed', data.changed, 'changed', 'exchange-alt', 'warning')}
            `;
        }

        container.querySelectorAll('.diff-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const diffContent = header.parentElement.querySelector('.diff-content');
                diffContent.classList.toggle('expanded');
            });
        });

        container.querySelectorAll('.diff-section').forEach(section => {
            const scrollbar = section.querySelector('.diff-scrollbar');
            const tableContainer = section.querySelector('.table-container');

            if (scrollbar && tableContainer) {
                const table = tableContainer.querySelector('table');
                if (!table) return;

                // Create a fake scroller that matches the width of the table
                const scroller = document.createElement('div');
                scroller.style.width = `${table.scrollWidth}px`;
                scroller.style.height = '1px';
                scrollbar.innerHTML = '';
                scrollbar.appendChild(scroller);

                // Sync scroll positions
                scrollbar.scrollLeft = tableContainer.scrollLeft;

                scrollbar.addEventListener('scroll', () => {
                    tableContainer.scrollLeft = scrollbar.scrollLeft;
                });

                tableContainer.addEventListener('scroll', () => {
                    scrollbar.scrollLeft = tableContainer.scrollLeft;
                });
            }
        });

        // Add this at the end of renderTabContent:
        container.querySelectorAll('.diff-search').forEach(input => {
            input.addEventListener('input', (e) => {
                const searchVal = e.target.value.toLowerCase();
                const tableContainer = container.querySelector(`#${e.target.dataset.table}`);
                const table = tableContainer.querySelector('table');
                if (!table) return;
                // Hide all rows that don't match
                table.querySelectorAll('tbody tr').forEach(row => {
                    const rowText = row.textContent.toLowerCase();
                    row.style.display = rowText.includes(searchVal) ? '' : 'none';
                });
            });
        });
        container.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', (e) => {
                const key = th.dataset.key;
                const tableContainer = th.closest('.table-container');
                const table = tableContainer.querySelector('table');
                const tbody = table.querySelector('tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));
                // Toggle sort direction (store on th)
                th._asc = !th._asc;
                rows.sort((a, b) => {
                    const aText = a.querySelector(`td:nth-child(${th.cellIndex + 1})`).textContent.trim().toLowerCase();
                    const bText = b.querySelector(`td:nth-child(${th.cellIndex + 1})`).textContent.trim().toLowerCase();
                    if (aText === bText) return 0;
                    if (th._asc) return aText > bText ? 1 : -1;
                    return aText < bText ? 1 : -1;
                });
                rows.forEach(row => tbody.appendChild(row));
            });
        });



    }

    renderDiffTable(items, type) {
        if (type === 'changed') return this.renderChangedTable(items);
        if (!items || items.length === 0) return '<div class="no-items">No items</div>';

        const keys = this.getObjectKeys(items[0]);
        // Table: has "name" but NOT "table". Column: has both.
        const isTable = !!items[0]?.name && !items[0]?.table;

        let allKeys = [...keys];
        if (isTable && !allKeys.includes('query')) {
            allKeys.push('query');
        }


        // For query lookup, pick the loaderTableMap based on context
        // For "added": use schema2 loader map
        // For "removed": use schema1 loader map
        // For "similar": use schema2 loader map
        let loaderMap = null;
        if (type === 'added' || type === 'similar') {
            loaderMap = this.results.tables.loaderTableMap2;
        } else if (type === 'removed') {
            loaderMap = this.results.tables.loaderTableMap1;
        }

        return `
    <table class="diff-table">
        <thead>
<tr>
${allKeys.map(k =>
            `<th class="sortable" data-key="${k}">
        ${this.formatHeader(k)} 
        <span class="sort-icon" style="font-size:0.9em; margin-left:3px; cursor:pointer;">⇅</span>
    </th>`
        ).join('')}
</tr>
</thead>

        <tbody>
            ${items.map(item => {
            return `<tr class="diff-item ${type}">
                    ${allKeys.map(k => {
                // Custom render for the query column
                if (k === 'query' && isTable) {
                    // Try to find the query from loaderTableMap
                    const tableName = item.name;
                    let loaderTable = loaderMap?.[tableName];
                    let query = loaderTable?.query || loaderTable?.script || '';
                    if (!query && loaderTable?.type === 'transformer') query = loaderTable?.script || '';
                    if (!query && loaderTable?.type === 'dataset') query = loaderTable?.query || '';
                    return `<td>${this.formatValue(query)}</td>`;
                }
                if (k === 'filter' && item[k]) {
                    return `<td>
                                <strong>Formula:</strong> ${this.formatValue(item[k].formula)}<br>
                                <strong>Operation:</strong> ${this.formatValue(item[k].op)}
                            </td>`;
                }
                return `<td>${this.formatValue(item[k])}</td>`;
            }).join('')}
                </tr>`;
        }).join('')}
        </tbody>
    </table>
    `;
    }
    renderColumnFilters(items, allKeys, tableId) {
        // Only show filters if items exist
        if (!items || !items.length) return '';
        // For each key, determine unique values
        let filterRow = `<div class="filter-row" data-table="${tableId}" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">`;
        allKeys.forEach((key, idx) => {
            // Collect unique values
            const values = [...new Set(items.map(item => (item[key] != null ? item[key].toString() : '-')))];
            if (values.length <= 10) {
                // Use dropdown
                filterRow += `
                <select class="col-filter" data-key="${key}" style="padding:0.3rem 0.9rem; border-radius:1.2rem; border:1.5px solid var(--primary-light); background:#fff;">
                    <option value="">All ${this.formatHeader(key)}</option>
                    ${values.map(val => `<option value="${val}">${val}</option>`).join('')}
                </select>
            `;
            } else {
                // Use text search
                filterRow += `
                <input class="col-filter" type="text" data-key="${key}" placeholder="Filter ${this.formatHeader(key)}" style="padding:0.3rem 0.9rem; border-radius:1.2rem; border:1.5px solid var(--primary-light); background:#fff; min-width:120px;" />
            `;
            }
        });
        filterRow += `</div>`;
        return filterRow;
    }



    renderChangedTable(items) {
        if (!items || items.length === 0) return '<div class="no-changes">No changes found</div>';

        const isColumnChange = items[0]?.old?.table && items[0]?.old?.name;
        const isTableChange = items[0]?.old?.name && !isColumnChange;

        if (isTableChange) {
            return `
            <table class="diff-table">
                <thead>
                    <tr>
                        <th class="sortable" data-key="table">Table <span class="sort-icon" style="font-size:0.9em; margin-left:3px; cursor:pointer;">⇅</span></th>
                        <th class="sortable" data-key="property">Property <span class="sort-icon" style="font-size:0.9em; margin-left:3px; cursor:pointer;">⇅</span></th>
                        <th class="sortable" data-key="oldValue">Old Value <span class="sort-icon" style="font-size:0.9em; margin-left:3px; cursor:pointer;">⇅</span></th>
                        <th class="sortable" data-key="newValue">New Value <span class="sort-icon" style="font-size:0.9em; margin-left:3px; cursor:pointer;">⇅</span></th>
                    </tr>
                </thead>
                <tbody>
                ${items.map(item => {
                const tableName = item.old?.name || item.new?.name || '-';
                const changes = this.getPropertyChanges(item.old, item.new);

                // Handle filter changes specially
                const filterChanges = [];

                if (!this.deepEqual(item.old?.filter, item.new?.filter)) {
                    if (item.old?.filter?.formula !== item.new?.filter?.formula) {
                        filterChanges.push({
                            key: 'filter.formula',
                            oldValue: item.old?.filter?.formula,
                            newValue: item.new?.filter?.formula
                        });
                    }
                    if (item.old?.filter?.op !== item.new?.filter?.op) {
                        filterChanges.push({
                            key: 'filter.op',
                            oldValue: item.old?.filter?.op,
                            newValue: item.new?.filter?.op
                        });
                    }
                }

                const loaderChanges = this.getLoaderPropertyChanges(
                    tableName,
                    this.results.tables.loaderTableMap1,
                    this.results.tables.loaderTableMap2
                );
                return [...changes, ...filterChanges, ...loaderChanges].map(change => `
                        <tr class="diff-item changed">
                            <td>${tableName}</td>
                            <td>${this.formatHeader(change.key)}</td>
                            <td>${['query', 'script', 'queryupdate'].some(f => change.key.toLowerCase().includes(f))
                        ? `<code>${this.highlightRemoved(change.oldValue, change.newValue)}</code>`
                        : this.formatValue(change.oldValue)}</td>
                            <td>${['query', 'script', 'queryupdate'].some(f => change.key.toLowerCase().includes(f))
                        ? `<code>${this.highlightAdded(change.oldValue, change.newValue)}</code>`
                        : this.formatValue(change.newValue)}</td>
                        </tr>
                    `).join('');
            }).join('')}
                </tbody>
            </table>
        `;
        }

        // Render for tables: table + property + old + new
        return `
        <table class="diff-table">
            <thead>
                <tr>
                    <th>Table</th>
                    <th>Property</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => {
            const tableName = item.old?.name || item.new?.name || '-';
            return this.getPropertyChanges(item.old, item.new).map(change => `
                        <tr class="diff-item changed">
                            <td>${tableName}</td>
                            <td>${this.formatHeader(change.key)}</td>
                            <td>${this.formatValue(change.oldValue)}</td>
                            <td>${this.formatValue(change.newValue)}</td>
                        </tr>
                    `).join('');
        }).join('')}
            </tbody>
        </table>
    `;
    }

    highlightRemoved(oldStr, newStr) {
        if (!oldStr && !newStr) return '';
        if (!oldStr) return '';
        if (!newStr) return `<span class="change-old">${oldStr}</span>`;

        // Basic word diff: highlight words from old that are not in new
        const oldWords = oldStr.split(/\s+/);
        const newWords = newStr.split(/\s+/);
        return oldWords.map(word =>
            newWords.includes(word)
                ? word
                : `<span class="change-old">${word}</span>`
        ).join(' ');
    }

    highlightAdded(oldStr, newStr) {
        if (!oldStr && !newStr) return '';
        if (!newStr) return '';
        if (!oldStr) return `<span class="change-new">${newStr}</span>`;

        // Basic word diff: highlight words from new that are not in old
        const oldWords = oldStr.split(/\s+/);
        const newWords = newStr.split(/\s+/);
        return newWords.map(word =>
            oldWords.includes(word)
                ? word
                : `<span class="change-new">${word}</span>`
        ).join(' ');
    }



    getObjectKeys(obj) {
        return Object.keys(obj).filter(k => k !== 'type' && typeof obj[k] !== 'object');
    }

    formatHeader(key) {
        if (!key) return '';

        // Loader fields: "loader.query" => "Query"
        if (key.startsWith('loader.')) {
            const parts = key.split('.');
            if (parts[1] === 'properties' && parts.length > 2) {
                // loader.properties.abc => Abc
                return this.capitalize(parts.slice(2).join('.'));
            } else if (parts.length > 1) {
                // loader.query => Query, loader.type => Type, etc.
                return this.capitalize(parts.slice(1).join('.'));
            }
            // fallback
            return this.capitalize(parts.join(' '));
        }

        // Normal schema properties: "filter_op" => "Filter Op"
        return key.split('_').map(this.capitalize).join(' ');
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }


    formatValue(value) {
        if (value === undefined || value === null) return '-';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return value.toString();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Move tab indicator
        const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        const tabIndicator = document.querySelector('.tab-indicator');
        if (activeTab && tabIndicator) {
            tabIndicator.style.width = `${activeTab.offsetWidth}px`;
            tabIndicator.style.left = `${activeTab.offsetLeft}px`;
        }

        // Show correct tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        // Rerender current tab view
        if (this.results && this.results[tabName]) {
            this.renderTabContent(tabName, this.results[tabName]);
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    new SchemaComparator();
    const activeTab = document.querySelector('.tab.active');
    const tabIndicator = document.querySelector('.tab-indicator');
    if (activeTab && tabIndicator) {
        tabIndicator.style.width = `${activeTab.offsetWidth}px`;
        tabIndicator.style.left = `${activeTab.offsetLeft}px`;
    }
});
