const STORAGE_KEY = 'perfilFinanciero';
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function getData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch (error) { return null; }
}

function money(value) { return currency.format(value); }
function valueOf(id) { return Number(document.getElementById(id).value) || 0; }

function updateSharedOptions() {
    const shared = document.getElementById('gasto-compartido').checked;
    const options = document.getElementById('opciones-compartido');
    const splitValue = document.getElementById('valor-dividir');
    const mode = document.getElementById('modo-dividir').value;
    options.classList.toggle('d-none', !shared);
    splitValue.required = shared;
    splitValue.max = mode === 'percentage' ? '100' : '';
    splitValue.placeholder = mode === 'percentage' ? 'Ej. 50' : 'Ej. 3';
    updateContributionPreview();
}

function updateContributionPreview() {
    const shared = document.getElementById('gasto-compartido').checked;
    const amount = valueOf('monto-gasto');
    const splitValue = valueOf('valor-dividir');
    const mode = document.getElementById('modo-dividir').value;
    const personalAmount = !shared ? amount : mode === 'percentage' ? amount * splitValue / 100 : amount / splitValue;
    document.getElementById('aporte-preview').textContent = money(personalAmount || 0);
    document.getElementById('ayuda-dividir').textContent = mode === 'percentage' ? 'Indica qué porcentaje del total pagas tú.' : 'Indica entre cuántas personas se divide el total.';
}

function updateFixedExpensePreview() {
    const amount = valueOf('monto-gasto-fijo');
    const shared = document.getElementById('gasto-fijo-compartido').checked;
    const percentage = valueOf('porcentaje-gasto-fijo');
    const realAmount = shared ? amount * percentage / 100 : amount;
    document.getElementById('preview-fijo-real').textContent = realAmount ? `Valor real: ${money(realAmount)}` : '';
}

function personalAmount(expense) { return expense.personalAmount ?? expense.amount; }

function filterExpenses(expenses) {
    const mode = document.getElementById('filtro-fechas').value;
    const specificDate = document.getElementById('fecha-especifica').value;
    const fromDate = document.getElementById('fecha-desde').value;
    const toDate = document.getElementById('fecha-hasta').value;
    if (mode === 'specific' && specificDate) return expenses.filter((expense) => expense.date === specificDate);
    if (mode === 'range' && (fromDate || toDate)) return expenses.filter((expense) => (!fromDate || expense.date >= fromDate) && (!toDate || expense.date <= toDate));
    return expenses;
}

function updateDateControls() {
    const mode = document.getElementById('filtro-fechas').value;
    document.getElementById('controles-fecha').classList.toggle('d-none', mode === 'all');
    document.getElementById('control-fecha-especifica').classList.toggle('d-none', mode !== 'specific');
    document.getElementById('control-fecha-rango').classList.toggle('d-none', mode !== 'range');
    render();
}

function renderExpenseList(data) {
    const list = document.getElementById('gastos-lista');
    const view = document.getElementById('filtro-gastos').value;
    const filteredExpenses = filterExpenses(data.dailyExpenses);
    const fixedDetail = data.fixedExpenseDetail;
    list.innerHTML = '';

    if (view === 'monthly') {
        const monthKey = new Date().toISOString().slice(0, 7);
        const monthExpenses = filteredExpenses.filter((expense) => document.getElementById('filtro-fechas').value !== 'all' || expense.date.startsWith(monthKey));
        const dailyTotal = monthExpenses.reduce((total, expense) => total + personalAmount(expense), 0);
        const rows = [
            ['Gasto fijo mensual', 'Compromisos configurados', data.fixedExpenses, 'fas fa-home text-warning'],
            ['Gastos diarios del mes', `${monthExpenses.length} movimiento${monthExpenses.length === 1 ? '' : 's'}`, dailyTotal, 'fas fa-receipt text-primary'],
            ['Total mensual', 'Fijos + gastos diarios', data.fixedExpenses + dailyTotal, 'fas fa-wallet text-success']
        ];
        rows.forEach(([title, detail, amount, icon]) => {
            list.innerHTML += `<tr><td><i class="${icon} mr-2"></i>${title}</td><td><small class="text-muted">${detail}</small></td><td class="text-right font-weight-bold">${money(amount)}</td><td></td></tr>`;
        });
        document.getElementById('gastos-count').textContent = `${monthExpenses.length} diario${monthExpenses.length === 1 ? '' : 's'} este mes`;
        return;
    }

    const visibleExpenses = fixedDetail ? [{ ...fixedDetail, isFixed: true }, ...filteredExpenses] : filteredExpenses;
    document.getElementById('gastos-count').textContent = `${visibleExpenses.length} registro${visibleExpenses.length === 1 ? '' : 's'}`;
    if (!visibleExpenses.length) {
        list.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Aun no tienes gastos diarios registrados.</td></tr>';
        return;
    }
    visibleExpenses.slice().reverse().forEach((expense) => {
        const index = data.dailyExpenses.indexOf(expense);
        const row = document.createElement('tr');
        const sharedLabel = expense.shared ? ` · Compartido (${expense.splitMode === 'percentage' ? `${expense.splitValue}%` : `${expense.splitValue} personas`})` : '';
        const fixedLabel = expense.isFixed ? ' · Gasto fijo mensual' : '';
        const deleteButton = expense.isFixed ? '' : `<button class="btn btn-sm btn-light text-danger remove-expense" data-index="${index}" title="Eliminar gasto"><i class="fas fa-trash"></i></button>`;
        row.innerHTML = `<td>${expense.date || 'Mensual'}</td><td><strong>${expense.description}</strong><br><small class="text-muted">${expense.category}${fixedLabel}${sharedLabel}</small></td><td class="text-right font-weight-bold">${money(personalAmount(expense))}</td><td class="text-right">${deleteButton}</td>`;
        list.appendChild(row);
    });
    document.querySelectorAll('.remove-expense').forEach((button) => button.addEventListener('click', () => {
        const current = getData();
        current.dailyExpenses.splice(Number(button.dataset.index), 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        render();
    }));
}

function render() {
    const data = getData();
    const configured = Boolean(data);
    document.getElementById('vista-caracterizacion').classList.toggle('d-none', configured);
    document.getElementById('vista-dashboard').classList.toggle('d-none', !configured);
    if (!configured) return;

    const fixed = data.fixedExpenses;
    const spent = data.dailyExpenses.reduce((total, expense) => total + personalAmount(expense), 0);
    const balance = data.income - fixed - spent;
    document.getElementById('resumen-ingresos').textContent = money(data.income);
    document.getElementById('resumen-fijos').textContent = money(fixed);
    document.getElementById('resumen-gastos').textContent = money(spent);
    document.getElementById('resumen-saldo').textContent = money(balance);
    document.getElementById('saldo-disponible').textContent = money(balance);
    renderExpenseList(data);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('gasto-fijo-compartido').addEventListener('change', (event) => {
        const aporte = document.getElementById('aporte-gasto-fijo');
        const porcentaje = document.getElementById('porcentaje-gasto-fijo');
        aporte.classList.toggle('d-none', !event.target.checked);
        porcentaje.required = event.target.checked;
        updateFixedExpensePreview();
    });
    document.getElementById('monto-gasto-fijo').addEventListener('input', updateFixedExpensePreview);
    document.getElementById('porcentaje-gasto-fijo').addEventListener('input', updateFixedExpensePreview);
    document.getElementById('form-caracterizacion').addEventListener('submit', (event) => {
        event.preventDefault();
        const totalIngresos = valueOf('ingreso-principal') + valueOf('ingreso-adicional');
        const concepto = document.getElementById('concepto-gasto-fijo').value.trim();
        const montoTotal = valueOf('monto-gasto-fijo');
        const gastoCompartido = document.getElementById('gasto-fijo-compartido').checked;
        const porcentajeAporte = valueOf('porcentaje-gasto-fijo');
        const gastoFijoReal = gastoCompartido ? montoTotal * porcentajeAporte / 100 : montoTotal;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            income: totalIngresos,
            fixedExpenses: gastoFijoReal,
            fixedExpenseDetail: { description: concepto, category: 'Gasto fijo', amount: montoTotal, personalAmount: gastoFijoReal, shared: gastoCompartido, splitMode: 'percentage', splitValue: gastoCompartido ? porcentajeAporte : null },
            dailyExpenses: []
        }));
        render();
    });
    document.getElementById('form-gasto').addEventListener('submit', (event) => {
        event.preventDefault();
        const data = getData();
        const amount = valueOf('monto-gasto');
        const shared = document.getElementById('gasto-compartido').checked;
        const splitMode = document.getElementById('modo-dividir').value;
        const splitValue = shared ? valueOf('valor-dividir') : null;
        const personalAmount = !shared ? amount : splitMode === 'percentage' ? amount * splitValue / 100 : amount / splitValue;
        data.dailyExpenses.push({ description: document.getElementById('descripcion-gasto').value.trim(), category: document.getElementById('categoria-gasto').value, amount, personalAmount, shared, splitMode, splitValue, date: document.getElementById('fecha-gasto').value });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        event.target.reset();
        document.getElementById('fecha-gasto').valueAsDate = new Date();
        updateSharedOptions();
        render();
    });
    document.getElementById('gasto-compartido').addEventListener('change', updateSharedOptions);
    document.getElementById('modo-dividir').addEventListener('change', updateSharedOptions);
    document.getElementById('monto-gasto').addEventListener('input', updateContributionPreview);
    document.getElementById('valor-dividir').addEventListener('input', updateContributionPreview);
    document.getElementById('filtro-gastos').addEventListener('change', () => render());
    document.getElementById('filtro-fechas').addEventListener('change', updateDateControls);
    document.getElementById('fecha-especifica').addEventListener('change', () => render());
    document.getElementById('fecha-desde').addEventListener('change', () => render());
    document.getElementById('fecha-hasta').addEventListener('change', () => render());
    document.getElementById('btn-reset').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); location.reload(); });
    document.getElementById('fecha-gasto').valueAsDate = new Date();
    updateSharedOptions();
    render();
});
