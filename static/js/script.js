document.addEventListener('DOMContentLoaded', () => {
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

    // Gerenciamento de Perfil
    function loadProfile() {
        const name = localStorage.getItem('profileName') || 'Usuário';
        const pic = localStorage.getItem('profilePic') || 'https://via.placeholder.com/100';
        const profileNameInput = document.getElementById('profile-name');
        const profilePicImg = document.getElementById('profile-pic');
        if (profileNameInput) profileNameInput.value = name;
        if (profilePicImg) profilePicImg.src = pic;
    }

    const saveProfileButton = document.getElementById('save-profile');
    if (saveProfileButton) {
        saveProfileButton.addEventListener('click', () => {
            const name = document.getElementById('profile-name').value.trim();
            if (name) {
                localStorage.setItem('profileName', name);
                showToast('Perfil atualizado com sucesso!', 'success');
            } else {
                showToast('Por favor, insira um nome.', 'error');
            }
            const fileInput = document.getElementById('profile-pic-upload');
            if (fileInput && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    localStorage.setItem('profilePic', e.target.result);
                    document.getElementById('profile-pic').src = e.target.result;
                };
                reader.readAsDataURL(fileInput.files[0]);
            }
            bootstrap.Modal.getInstance(document.getElementById('profileModal')).hide();
        });
    }

    // Carregar Tarefas
    async function loadTasks() {
        try {
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
        } catch (error) {
            showToast('Erro ao carregar tarefas: ' + error.message, 'error');
        }
    }

    // Adicionar Tarefa
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const description = document.getElementById('task-input').value;
            try {
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
            } catch (error) {
                showToast('Erro ao adicionar tarefa: ' + error.message, 'error');
            }
        });
    }

    // Concluir/Excluir Tarefa
    const taskList = document.getElementById('task-list');
    if (taskList) {
        taskList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('complete-task')) {
                const taskId = e.target.getAttribute('data-id');
                try {
                    const response = await fetch(`/api/complete/${taskId}`, { method: 'POST' });
                    const data = await response.json();
                    showToast(data.message, data.status);
                    if (data.status === 'success') loadTasks();
                } catch (error) {
                    showToast('Erro ao concluir tarefa: ' + error.message, 'error');
                }
            } else if (e.target.classList.contains('delete-task')) {
                const taskId = e.target.getAttribute('data-id');
                try {
                    const response = await fetch(`/api/delete/${taskId}`, { method: 'POST' });
                    const data = await response.json();
                    showToast(data.message, data.status);
                    if (data.status === 'success') loadTasks();
                } catch (error) {
                    showToast('Erro ao excluir tarefa: ' + error.message, 'error');
                }
            }
        });
    }

    // Pomodoro
    let timerId = null;

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async function loadPomodoro() {
        try {
            const response = await fetch('/api/pomodoro');
            const data = await response.json();
            if (data.status === 'success') {
                const timer = document.getElementById('pomodoro-timer');
                const status = document.getElementById('pomodoro-status');
                if (timer && status) {
                    timer.textContent = formatTime(data.time_left);
                    status.textContent = `Modo: ${data.is_break ? 'Pausa' : 'Trabalho'}`;
                    timer.classList.toggle('break', data.is_break);
                    if (data.is_running && !timerId) {
                        startPomodoroTimer();
                    }
                }
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            showToast('Erro ao carregar Pomodoro: ' + error.message, 'error');
        }
    }

    function startPomodoroTimer() {
        if (timerId) return;
        timerId = setInterval(async () => {
            try {
                const response = await fetch('/api/pomodoro/tick', { method: 'POST' });
                const data = await response.json();
                if (data.status === 'success') {
                    const timer = document.getElementById('pomodoro-timer');
                    const status = document.getElementById('pomodoro-status');
                    if (timer && status) {
                        timer.textContent = formatTime(data.time_left);
                        status.textContent = `Modo: ${data.is_break ? 'Pausa' : 'Trabalho'}`;
                        timer.classList.toggle('break', data.is_break);
                        if (data.time_left <= 0) {
                            clearInterval(timerId);
                            timerId = null;
                            showToast(data.is_break ? 'Pausa concluída! Inicie o próximo ciclo.' : 'Trabalho concluído! Hora da pausa.', 'success');
                        }
                    }
                } else {
                    showToast(data.message, 'error');
                }
            } catch (error) {
                showToast('Erro no temporizador Pomodoro: ' + error.message, 'error');
            }
        }, 1000);
    }

    const startPomodoroButton = document.getElementById('start-pomodoro');
    if (startPomodoroButton) {
        startPomodoroButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/pomodoro/start', { method: 'POST' });
                const data = await response.json();
                showToast(data.message, data.status);
                if (data.status === 'success') startPomodoroTimer();
            } catch (error) {
                showToast('Erro ao iniciar Pomodoro: ' + error.message, 'error');
            }
        });
    }

    const resetPomodoroButton = document.getElementById('reset-pomodoro');
    if (resetPomodoroButton) {
        resetPomodoroButton.addEventListener('click', async () => {
            clearInterval(timerId);
            timerId = null;
            try {
                const response = await fetch('/api/pomodoro/reset', { method: 'POST' });
                const data = await response.json();
                showToast(data.message, data.status);
                if (data.status === 'success') loadPomodoro();
            } catch (error) {
                showToast('Erro ao reiniciar Pomodoro: ' + error.message, 'error');
            }
        });
    }

    // Troca de Seções
    const sectionToggles = document.querySelectorAll('.section-toggle');
    sectionToggles.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.getAttribute('data-section');
            document.querySelectorAll('.section').forEach(sec => {
                sec.style.display = 'none';
                sec.style.opacity = '0';
            });
            const activeSection = document.getElementById(`${section}-section`);
            if (activeSection) {
                activeSection.style.display = 'block';
                setTimeout(() => { activeSection.style.opacity = '1'; }, 10);
            }
            sectionToggles.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Inicializar
    loadTasks();
    loadPomodoro();
    loadProfile();
    const tasksButton = document.querySelector('.section-toggle[data-section="tasks"]');
    if (tasksButton) tasksButton.classList.add('active');
});