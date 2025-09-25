// Função para exibir notificações
function showToast(message, type = 'success') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: 'top',
        position: 'right',
        backgroundColor: type === 'success' ? '#28a745' : '#dc3545',
    }).showToast();
}

// Carregar tarefas
async function loadTasks() {
    const response = await fetch('/api/tasks');
    const data = await response.json();
    if (data.status === 'success') {
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = '';
        data.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span class="${task.completed ? 'text-decoration-line-through' : ''}">${task.description}</span>
                <div>
                    ${!task.completed ? `<button class="btn btn-success btn-sm complete-task" data-id="${task.id}">Concluir</button>` : ''}
                    <button class="btn btn-danger btn-sm delete-task" data-id="${task.id}">Excluir</button>
                </div>
            `;
            taskList.appendChild(li);
        });
    } else {
        showToast(data.message, 'error');
    }
}

// Adicionar tarefa
document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const description = document.getElementById('task-input').value;
    const response = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `description=${encodeURIComponent(description)}`
    });
    const data = await response.json();
    showToast(data.message, data.status);
    if (data.status === 'success') {
        document.getElementById('task-input').value = '';
        loadTasks();
    }
});

// Concluir/Excluir tarefa
document.getElementById('task-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('complete-task')) {
        const taskId = e.target.getAttribute('data-id');
        const response = await fetch(`/api/complete/${taskId}`, { method: 'POST' });
        const data = await response.json();
        showToast(data.message, data.status);
        if (data.status === 'success') loadTasks();
    } else if (e.target.classList.contains('delete-task')) {
        const taskId = e.target.getAttribute('data-id');
        const response = await fetch(`/api/delete/${taskId}`, { method: 'POST' });
        const data = await response.json();
        showToast(data.message, data.status);
        if (data.status === 'success') loadTasks();
    }
});

// Pomodoro
let timerId = null;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function loadPomodoro() {
    const response = await fetch('/api/pomodoro');
    const data = await response.json();
    if (data.status === 'success') {
        const timer = document.getElementById('pomodoro-timer');
        const status = document.getElementById('pomodoro-status');
        timer.textContent = formatTime(data.time_left);
        status.textContent = `Modo: ${data.is_break ? 'Pausa' : 'Trabalho'}`;
        timer.classList.toggle('break', data.is_break);
        if (data.is_running && !timerId) {
            startPomodoroTimer();
        }
    }
}

function startPomodoroTimer() {
    if (timerId) return;
    timerId = setInterval(async () => {
        const response = await fetch('/api/pomodoro/tick', { method: 'POST' });
        const data = await response.json();
        if (data.status === 'success') {
            document.getElementById('pomodoro-timer').textContent = formatTime(data.time_left);
            document.getElementById('pomodoro-status').textContent = `Modo: ${data.is_break ? 'Pausa' : 'Trabalho'}`;
            document.getElementById('pomodoro-timer').classList.toggle('break', data.is_break);
            if (data.time_left <= 0) {
                clearInterval(timerId);
                timerId = null;
                showToast(data.is_break ? 'Pausa concluída! Inicie o próximo ciclo.' : 'Trabalho concluído! Hora da pausa.', 'success');
            }
        }
    }, 1000);
}

document.getElementById('start-pomodoro').addEventListener('click', async () => {
    const response = await fetch('/api/pomodoro/start', { method: 'POST' });
    const data = await response.json();
    showToast(data.message, data.status);
    if (data.status === 'success') startPomodoroTimer();
});

document.getElementById('reset-pomodoro').addEventListener('click', async () => {
    clearInterval(timerId);
    timerId = null;
    const response = await fetch('/api/pomodoro/reset', { method: 'POST' });
    const data = await response.json();
    showToast(data.message, data.status);
    if (data.status === 'success') loadPomodoro();
});

// Inicializar
loadTasks();
loadPomodoro();