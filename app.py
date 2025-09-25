from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sua-chave-secreta-aqui'

# Database
def init_db():
    with sqlite3.connect('tasks.db') as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS tasks
                        (id INTEGER PRIMARY KEY AUTOINCREMENT,
                         description TEXT NOT NULL,
                         completed BOOLEAN NOT NULL)''')
        conn.execute('''CREATE TABLE IF NOT EXISTS pomodoro
                        (id INTEGER PRIMARY KEY,
                         time_left INTEGER NOT NULL,
                         is_running BOOLEAN NOT NULL,
                         is_break BOOLEAN NOT NULL)''')
        conn.execute('INSERT OR IGNORE INTO pomodoro (id, time_left, is_running, is_break) VALUES (1, 1500, 0, 0)')
        conn.commit()

def get_db_connection():
    conn = sqlite3.connect('tasks.db')
    conn.row_factory = sqlite3.Row
    return conn

# Task Routes
@app.route('/api/add', methods=['POST'])
def add_task():
    description = request.form.get('description')
    if not description or len(description.strip()) == 0:
        return jsonify({'status': 'error', 'message': 'Descrição da tarefa é obrigatória'}), 400
    try:
        with get_db_connection() as conn:
            conn.execute('INSERT INTO tasks (description, completed) VALUES (?, ?)', (description.strip(), False))
            conn.commit()
        return jsonify({'status': 'success', 'message': 'Tarefa adicionada com sucesso'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/complete/<int:task_id>', methods=['POST'])
def complete_task(task_id):
    try:
        with get_db_connection() as conn:
            conn.execute('UPDATE tasks SET completed = ? WHERE id = ?', (True, task_id))
            if conn.total_changes == 0:
                return jsonify({'status': 'error', 'message': 'Tarefa não encontrada'}), 404
            conn.commit()
        return jsonify({'status': 'success', 'message': 'Tarefa concluída'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/delete/<int:task_id>', methods=['POST'])
def delete_task(task_id):
    try:
        with get_db_connection() as conn:
            conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
            if conn.total_changes == 0:
                return jsonify({'status': 'error', 'message': 'Tarefa não encontrada'}), 404
            conn.commit()
        return jsonify({'status': 'success', 'message': 'Tarefa excluída'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    try:
        with get_db_connection() as conn:
            tasks = conn.execute('SELECT * FROM tasks').fetchall()
            tasks_list = [{'id': task['id'], 'description': task['description'], 'completed': bool(task['completed'])} for task in tasks]
        return jsonify({'status': 'success', 'tasks': tasks_list})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Pomodoro Routes
@app.route('/api/pomodoro', methods=['GET'])
def get_pomodoro():
    try:
        with get_db_connection() as conn:
            pomodoro = conn.execute('SELECT * FROM pomodoro WHERE id = 1').fetchone()
            if not pomodoro:
                return jsonify({'status': 'error', 'message': 'Pomodoro não encontrado'}), 404
            return jsonify({
                'status': 'success',
                'time_left': pomodoro['time_left'],
                'is_running': bool(pomodoro['is_running']),
                'is_break': bool(pomodoro['is_break'])
            })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/pomodoro/start', methods=['POST'])
def start_pomodoro():
    try:
        with get_db_connection() as conn:
            conn.execute('UPDATE pomodoro SET is_running = ? WHERE id = 1', (True,))
            conn.commit()
        return jsonify({'status': 'success', 'message': 'Pomodoro iniciado'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/pomodoro/reset', methods=['POST'])
def reset_pomodoro():
    try:
        with get_db_connection() as conn:
            pomodoro = conn.execute('SELECT is_break FROM pomodoro WHERE id = 1').fetchone()
            time_left = 300 if pomodoro['is_break'] else 1500
            conn.execute('UPDATE pomodoro SET is_running = ?, time_left = ? WHERE id = 1', (False, time_left))
            conn.commit()
        return jsonify({'status': 'success', 'message': 'Pomodoro reiniciado'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/pomodoro/tick', methods=['POST'])
def tick_pomodoro():
    try:
        with get_db_connection() as conn:
            pomodoro = conn.execute('SELECT * FROM pomodoro WHERE id = 1').fetchone()
            if pomodoro['is_running']:
                time_left = pomodoro['time_left'] - 1
                is_break = pomodoro['is_break']
                if time_left <= 0:
                    is_break = not is_break
                    time_left = 300 if is_break else 1500
                    conn.execute('UPDATE pomodoro SET is_running = ?, time_left = ?, is_break = ? WHERE id = 1',
                                 (False, time_left, is_break))
                else:
                    conn.execute('UPDATE pomodoro SET time_left = ? WHERE id = 1', (time_left,))
                conn.commit()
            return jsonify({
                'status': 'success',
                'time_left': time_left,
                'is_running': bool(pomodoro['is_running']),
                'is_break': bool(is_break)
            })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=8000)
