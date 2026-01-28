document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const transactionForm = document.getElementById('transaction-form');
    const transactionIdInput = document.getElementById('transaction-id');
    const dateInput = document.getElementById('date');
    const titleInput = document.getElementById('title');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const typeIncome = document.getElementById('income');
    const transactionList = document.getElementById('transaction-list');
    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpensesEl = document.getElementById('total-expenses');
    const searchInput = document.getElementById('search');
    const filterCategory = document.getElementById('filter-category');
    const filterType = document.getElementById('filter-type');
    const filterDateRange = document.getElementById('filter-date-range');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const expenseChartEl = document.getElementById('expense-chart');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const clearDataBtn = document.getElementById('clear-data');
    const exportCsvBtn = document.getElementById('export-csv');
    const importCsvInput = document.getElementById('import-csv');

    // State
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    const transactionsKey = `transactions_${loggedInUser}`;
    let transactions = JSON.parse(localStorage.getItem(transactionsKey)) || [];
    let isEditing = false;

    // --- INITIALIZATION ---
    init();

    function init() {
        // Set default date to today
        dateInput.valueAsDate = new Date();

        // Load theme preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }

        // Add event listeners
        transactionForm.addEventListener('submit', handleFormSubmit);
        searchInput.addEventListener('input', updateUI);
        filterCategory.addEventListener('change', updateUI);
        filterType.addEventListener('change', updateUI);
        filterDateRange.addEventListener('click', showDateRangePicker);
        clearFiltersBtn.addEventListener('click', clearFilters);
        themeToggleBtn.addEventListener('click', toggleTheme);
        clearDataBtn.addEventListener('click', clearAllData);
        transactionList.addEventListener('click', handleListClick);
        exportCsvBtn.addEventListener('click', exportToCSV);
        importCsvInput.addEventListener('change', importFromCSV);

        updateUI();
    }

    // --- EVENT HANDLERS ---
    function handleFormSubmit(e) {
        console.log('handleFormSubmit called');
        e.preventDefault();

        const date = dateInput.value;
        const title = titleInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;
        const type = typeIncome.checked ? 'income' : 'expense';
        const id = transactionIdInput.value;

        if (!date || !title || isNaN(amount) || amount <= 0) {
            alert('Please fill in all fields with valid data.');
            return;
        }

        if (isEditing) {
            // Update existing transaction
            const transactionIndex = transactions.findIndex(t => t.id === id);
            if (transactionIndex > -1) {
                transactions[transactionIndex] = { date, title, amount, category, type, id };
            }
            isEditing = false;
            transactionForm.querySelector('button').textContent = 'Add Transaction';
        } else {
            // Add new transaction
            const newTransaction = {
                id: generateId(),
                date,
                title,
                amount,
                category,
                type,
            };
            transactions.push(newTransaction);
        }

        saveToLocalStorage();
        updateUI();
        transactionForm.reset();
        dateInput.valueAsDate = new Date(); // Reset date to today
    }

    function handleListClick(e) {
        console.log('handleListClick called');
        if (e.target.closest('.edit-btn')) {
            const id = e.target.closest('li').dataset.id;
            editTransaction(id);
        }
        if (e.target.closest('.delete-btn')) {
            const id = e.target.closest('li').dataset.id;
            deleteTransaction(id);
        }
    }

    // --- CORE LOGIC ---
    function updateUI() {
        const filteredTransactions = getFilteredTransactions();
        renderTransactionList(filteredTransactions);
        updateBalance(transactions); // Balance is based on all transactions
        renderExpenseChart(transactions); // Chart is based on all transactions
    }

    function getFilteredTransactions() {
        let filtered = [...transactions];

        // Filter by search term
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(t => t.title.toLowerCase().includes(searchTerm));
        }

        // Filter by category
        const category = filterCategory.value;
        if (category !== 'all') {
            filtered = filtered.filter(t => t.category === category);
        }

        // Filter by type
        const type = filterType.value;
        if (type !== 'all') {
            filtered = filtered.filter(t => t.type === type);
        }

        // Filter by date range
        const dateRangeValue = filterDateRange.value;
        if (dateRangeValue && dateRangeValue.includes(' - ')) {
            const [startDate, endDate] = dateRangeValue.split(' - ');
            filtered = filtered.filter(t => {
                const transactionDate = t.date;
                return transactionDate >= startDate && transactionDate <= endDate;
            });
        }

        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function renderTransactionList(transactionsToRender) {
        transactionList.innerHTML = '';
        if (transactionsToRender.length === 0) {
            transactionList.innerHTML = '<li>No transactions found.</li>';
            return;
        }

        transactionsToRender.forEach(transaction => {
            const item = document.createElement('li');
            item.classList.add('transaction-item', transaction.type);
            item.dataset.id = transaction.id;

            const sign = transaction.type === 'income' ? '+' : '-';
            
            item.innerHTML = `
                <div>
                    <div class="title">${transaction.title}</div>
                    <div class="details">${new Date(transaction.date).toLocaleDateString()} | ${transaction.category}</div>
                </div>
                <div class="amount">${sign} ${formatCurrency(transaction.amount)}</div>
                <div class="actions">
                    <button class="edit-btn" title="Edit">✏️</button>
                    <button class="delete-btn" title="Delete">🗑️</button>
                </div>
            `;
            transactionList.appendChild(item);
        });
    }

    function updateBalance(transactionsToCalculate) {
        if (transactionsToCalculate.length === 0) {
            totalBalanceEl.textContent = formatCurrency(0);
            totalIncomeEl.textContent = formatCurrency(0);
            totalExpensesEl.textContent = formatCurrency(0);
            totalBalanceEl.classList.remove('negative');
            return;
        }

        const amounts = transactionsToCalculate.map(t => t.type === 'income' ? t.amount : -t.amount);
        
        const total = amounts.reduce((acc, item) => (acc += item), 0);
        const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
        const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

        totalBalanceEl.textContent = formatCurrency(Math.abs(total));
        totalIncomeEl.textContent = formatCurrency(income);
        totalExpensesEl.textContent = formatCurrency(expense);
        
        // Add/remove negative class based on balance
        if (total < 0) {
            totalBalanceEl.classList.add('negative');
        } else {
            totalBalanceEl.classList.remove('negative');
        }
    }
    
    function editTransaction(id) {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return;

        isEditing = true;
        transactionIdInput.value = transaction.id;
        dateInput.value = transaction.date;
        titleInput.value = transaction.title;
        amountInput.value = transaction.amount;
        categoryInput.value = transaction.category;
        if (transaction.type === 'income') {
            typeIncome.checked = true;
        } else {
            document.getElementById('expense').checked = true;
        }

        transactionForm.querySelector('button').textContent = 'Update Transaction';
        titleInput.focus();
    }

    function deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            transactions = transactions.filter(t => t.id !== id);
            saveToLocalStorage();
            updateUI();
        }
    }

    // --- CHART ---
    function renderExpenseChart(transactionsToChart) {
        expenseChartEl.innerHTML = '';
        
        // Group by category for both income and expense
        const dataByCategory = transactionsToChart.reduce((acc, t) => {
            if (!acc[t.category]) {
                acc[t.category] = { income: 0, expense: 0 };
            }
            acc[t.category][t.type] += t.amount;
            return acc;
        }, {});

        const categories = Object.keys(dataByCategory);
        if (categories.length === 0) {
            expenseChartEl.innerHTML = '<p>No data to display.</p>';
            return;
        }

        // Find max value for scaling
        const maxAmount = Math.max(
            ...categories.map(cat => Math.max(dataByCategory[cat].income, dataByCategory[cat].expense)),
            1
        );

        categories.forEach(category => {
            const categoryData = dataByCategory[category];
            const categoryContainer = document.createElement('div');
            categoryContainer.classList.add('category-container');

            // Bars group container
            const barsGroup = document.createElement('div');
            barsGroup.classList.add('bars-group');

            // Income bar
            const incomeBar = document.createElement('div');
            incomeBar.classList.add('chart-bar', 'income');
            const incomeHeight = (categoryData.income / maxAmount) * 150;
            incomeBar.style.height = `${incomeHeight}px`;
            incomeBar.title = `${category} Income: ${formatCurrency(categoryData.income)}`;
            if (categoryData.income > 0) {
                incomeBar.innerHTML = `<div class="bar-value">${formatCurrency(categoryData.income)}</div>`;
            }
            barsGroup.appendChild(incomeBar);

            // Expense bar
            const expenseBar = document.createElement('div');
            expenseBar.classList.add('chart-bar', 'expense');
            const expenseHeight = (categoryData.expense / maxAmount) * 150;
            expenseBar.style.height = `${expenseHeight}px`;
            expenseBar.title = `${category} Expense: ${formatCurrency(categoryData.expense)}`;
            if (categoryData.expense > 0) {
                expenseBar.innerHTML = `<div class="bar-value">${formatCurrency(categoryData.expense)}</div>`;
            }
            barsGroup.appendChild(expenseBar);

            categoryContainer.appendChild(barsGroup);

            // Category label
            const label = document.createElement('div');
            label.classList.add('bar-label');
            label.textContent = category;
            categoryContainer.appendChild(label);

            expenseChartEl.appendChild(categoryContainer);
        });
    }

    // --- CSV EXPORT/IMPORT ---
    function exportToCSV() {
        console.log('exportToCSV called');
        const headers = 'ID,Date,Title,Amount,Category,Type';
        const csvContent = [
            headers,
            ...transactions.map(t => `${t.id},${t.date},"${t.title.replace(/"/g, '""')}",${t.amount},${t.category},${t.type}`)
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'transactions.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function importFromCSV(event) {
        console.log('importFromCSV called');
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const rows = text.split('\n').slice(1); // Skip header row
            
            try {
                const importedTransactions = rows.map(row => {
                    if (row.trim() === '') return null;
                    const columns = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                    if(!columns || columns.length < 6) return null;
                    
                    return {
                        id: columns[0] || generateId(),
                        date: columns[1],
                        title: columns[2].replace(/"/g, '"'),
                        amount: parseFloat(columns[3]),
                        category: columns[4],
                        type: columns[5]
                    };
                }).filter(Boolean); // remove nulls

                if (importedTransactions.length > 0) {
                     if (confirm('Add ' + importedTransactions.length + ' transactions? Duplicates will be skipped.')) {
                        const existingIds = new Set(transactions.map(t => t.id));
                        const uniqueNewTransactions = importedTransactions.filter(t => !existingIds.has(t.id));
                        
                        transactions.push(...uniqueNewTransactions);
                        saveToLocalStorage();
                        updateUI();
                        alert(`${uniqueNewTransactions.length} new transactions imported successfully!`);
                    }
                } else {
                    alert('No valid transactions found in the file.');
                }
            } catch (error) {
                alert('Error parsing CSV file. Please ensure it is correctly formatted.');
                console.error(error);
            } finally {
                // Reset file input to allow re-uploading the same file
                importCsvInput.value = '';
            }
        };
        reader.readAsText(file);
    }

    // --- UTILITY & OTHER ---
    function clearFilters() {
        console.log('clearFilters called');
        searchInput.value = '';
        filterCategory.value = 'all';
        filterType.value = 'all';
        filterDateRange.value = '';
        updateUI();
    }
    
    function toggleTheme() {
        console.log('toggleTheme called');
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    }

    function clearAllData() {
        console.log('clearAllData called');
        if (confirm('Are you sure you want to delete ALL data for this user? This action cannot be undone.')) {
            transactions = [];
            localStorage.removeItem(transactionsKey);
            updateUI();
        }
    }

    function showDateRangePicker() {
        console.log('showDateRangePicker called');
        const startDate = prompt('Enter start date (YYYY-MM-DD):');
        if (!startDate) return;
        
        const endDate = prompt('Enter end date (YYYY-MM-DD):');
        if (!endDate) return;
        
        if (startDate && endDate) {
            filterDateRange.value = `${startDate} - ${endDate}`;
            updateUI();
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem(transactionsKey, JSON.stringify(transactions));
    }

    function generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    }
});
