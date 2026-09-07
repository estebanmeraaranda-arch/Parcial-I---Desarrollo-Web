const STORAGE_KEY = 'perfilFinanciero';
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function getData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch (error) { return null; }
}

function money(value) { return currency.format(value); }
function valueOf(id) { return Number(document.getElementById(id).value) || 0; }

function render() {
    const data = getData();
    const configured = Boolean(data);
    document.getElementById('vista-caracterizacion').classList.toggle('d-none', configured);
    document.getElementById('vista-dashboard').classList.toggle('d-none', !configured);
    if (!configured) return;

    const fixed = data.fixedExpenses + data.sharedExpenses;
    const spent = data.dailyExpenses.reduce((total, expense) => total + expense.amount, 0);
    const balance = data.income - fixed - spent;
    document.getElementById('resumen-ingresos').textContent = money(data.income);
    document.getElementById('resumen-fijos').textContent = money(fixed);
    document.getElementById('resumen-gastos').textContent = money(spent);
    document.getElementById('resumen-saldo').textContent = money(balance);
    document.getElementById('saldo-disponible').textContent = money(balance);
    document.getElementById('gastos-count').textContent = `${data.dailyExpenses.length} registro${data.dailyExpenses.length === 1 ? '' : 's'}`;

    const list = document.getElementById('gastos-lista');
    list.innerHTML = data.dailyExpenses.length ? '' : '<tr><td colspan="4" class="text-center text-muted py-4">Aun no tienes gastos registrados.</td></tr>';
    data.dailyExpenses.slice().reverse().forEach((expense, reverseIndex) => {
        const index = data.dailyExpenses.length - 1 - reverseIndex;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${expense.date}</td><td><strong>${expense.description}</strong><br><small class="text-muted">${expense.category}</small></td><td class="text-right font-weight-bold">${money(expense.amount)}</td><td class="text-right"><button class="btn btn-sm btn-light text-danger remove-expense" data-index="${index}" title="Eliminar gasto"><i class="fas fa-trash"></i></button></td>`;
        list.appendChild(row);
    });
    document.querySelectorAll('.remove-expense').forEach((button) => button.addEventListener('click', () => {
        const current = getData();
        current.dailyExpenses.splice(Number(button.dataset.index), 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        render();
    }));
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('form-caracterizacion').addEventListener('submit', (event) => {
        event.preventDefault();
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ income: valueOf('ingresos'), fixedExpenses: valueOf('gastos-fijos'), sharedExpenses: valueOf('gastos-compartidos'), dailyExpenses: [] }));
        render();
    });
    document.getElementById('form-gasto').addEventListener('submit', (event) => {
        event.preventDefault();
        const data = getData();
        data.dailyExpenses.push({ description: document.getElementById('descripcion-gasto').value.trim(), category: document.getElementById('categoria-gasto').value, amount: valueOf('monto-gasto'), date: document.getElementById('fecha-gasto').value });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        event.target.reset();
        document.getElementById('fecha-gasto').valueAsDate = new Date();
        render();
    });
    document.getElementById('btn-reset').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); render(); });
    document.getElementById('fecha-gasto').valueAsDate = new Date();
    render();
});
