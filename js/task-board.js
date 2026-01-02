// Task data storage
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        let editingTaskId = null;

        // Initialize
        window.addEventListener('load', () => {
            renderTasks();
            updateStats();
            setupDragAndDrop();
            setupSearch();
            
            // Add sample tasks if empty
            if (tasks.length === 0) {
                addSampleTasks();
            }
        });

        // Add sample tasks
        function addSampleTasks() {
            const samples = [
                {
                    id: Date.now() + 1,
                    title: 'Design landing page',
                    description: 'Create mockups for the new product landing page',
                    priority: 'high',
                    status: 'todo',
                    date: '2025-01-15',
                    createdAt: Date.now()
                },
                {
                    id: Date.now() + 2,
                    title: 'Setup development environment',
                    description: 'Install necessary tools and dependencies',
                    priority: 'medium',
                    status: 'progress',
                    date: '2025-01-10',
                    createdAt: Date.now()
                },
                {
                    id: Date.now() + 3,
                    title: 'Write documentation',
                    description: 'Document API endpoints and usage examples',
                    priority: 'low',
                    status: 'done',
                    date: '2025-01-05',
                    createdAt: Date.now()
                }
            ];
            tasks = samples;
            saveTasks();
            renderTasks();
            updateStats();
        }

        // Render all tasks
        function renderTasks() {
            const containers = {
                todo: document.getElementById('todo-tasks'),
                progress: document.getElementById('progress-tasks'),
                done: document.getElementById('done-tasks')
            };

            // Clear containers
            Object.values(containers).forEach(container => {
                container.innerHTML = '';
            });

            // Render tasks
            tasks.forEach(task => {
                const container = containers[task.status];
                if (container) {
                    container.appendChild(createTaskElement(task));
                }
            });

            // Show empty states
            Object.entries(containers).forEach(([status, container]) => {
                if (container.children.length === 0) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <p>No tasks here</p>
                        </div>
                    `;
                }
            });
        }

        // Create task element
        function createTaskElement(task) {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-card';
            taskEl.draggable = true;
            taskEl.dataset.id = task.id;

            const formattedDate = task.date ? new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';

            taskEl.innerHTML = `
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <div class="task-actions">
                        <button class="task-action-btn" onclick="editTask(${task.id})" title="Edit">✏️</button>
                        <button class="task-action-btn" onclick="deleteTask(${task.id})" title="Delete">🗑️</button>
                    </div>
                </div>
                ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                <div class="task-footer">
                    <span class="task-priority priority-${task.priority}">${task.priority}</span>
                    <span class="task-date">📅 ${formattedDate}</span>
                </div>
            `;

            return taskEl;
        }

        // Open modal
        function openModal(status = 'todo') {
            editingTaskId = null;
            document.getElementById('modal-title').textContent = 'Create New Task';
            document.getElementById('task-form').reset();
            document.getElementById('task-status').value = status;
            document.getElementById('task-modal').classList.add('active');
        }

        // Close modal
        function closeModal() {
            document.getElementById('task-modal').classList.remove('active');
            editingTaskId = null;
        }

        // Edit task
        function editTask(id) {
            const task = tasks.find(t => t.id === id);
            if (!task) return;

            editingTaskId = id;
            document.getElementById('modal-title').textContent = 'Edit Task';
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-date').value = task.date || '';
            document.getElementById('task-modal').classList.add('active');
        }

        // Delete task
        function deleteTask(id) {
            if (!confirm('Are you sure you want to delete this task?')) return;
            
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
            updateStats();
            showToast('Task deleted successfully');
        }

        // Handle form submission
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();

            const taskData = {
                title: document.getElementById('task-title').value.trim(),
                description: document.getElementById('task-description').value.trim(),
                priority: document.getElementById('task-priority').value,
                status: document.getElementById('task-status').value,
                date: document.getElementById('task-date').value
            };

            if (editingTaskId) {
                // Update existing task
                const task = tasks.find(t => t.id === editingTaskId);
                if (task) {
                    Object.assign(task, taskData);
                    showToast('Task updated successfully');
                }
            } else {
                // Create new task
                const newTask = {
                    id: Date.now(),
                    ...taskData,
                    createdAt: Date.now()
                };
                tasks.push(newTask);
                showToast('Task created successfully');
            }

            saveTasks();
            renderTasks();
            updateStats();
            closeModal();
        });

        // Setup drag and drop
        function setupDragAndDrop() {
            const containers = document.querySelectorAll('.tasks-container');
            
            // Drag start
            document.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('task-card')) {
                    e.target.classList.add('dragging');
                }
            });

            // Drag end
            document.addEventListener('dragend', (e) => {
                if (e.target.classList.contains('task-card')) {
                    e.target.classList.remove('dragging');
                }
            });

            // Drag over
            containers.forEach(container => {
                container.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    container.classList.add('drag-over');
                });

                container.addEventListener('dragleave', (e) => {
                    if (e.target === container) {
                        container.classList.remove('drag-over');
                    }
                });

                container.addEventListener('drop', (e) => {
                    e.preventDefault();
                    container.classList.remove('drag-over');
                    
                    const draggingCard = document.querySelector('.dragging');
                    if (draggingCard) {
                        const taskId = parseInt(draggingCard.dataset.id);
                        const newStatus = container.dataset.status;
                        
                        // Update task status
                        const task = tasks.find(t => t.id === taskId);
                        if (task && task.status !== newStatus) {
                            task.status = newStatus;
                            saveTasks();
                            renderTasks();
                            updateStats();
                            showToast(`Task moved to ${newStatus === 'todo' ? 'To Do' : newStatus === 'progress' ? 'In Progress' : 'Done'}`);
                        }
                    }
                });
            });
        }

        // Setup search
        function setupSearch() {
            const searchInput = document.getElementById('search-input');
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const taskCards = document.querySelectorAll('.task-card');
                
                taskCards.forEach(card => {
                    const title = card.querySelector('.task-title').textContent.toLowerCase();
                    const description = card.querySelector('.task-description')?.textContent.toLowerCase() || '';
                    
                    if (title.includes(query) || description.includes(query)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }

        // Update statistics
        function updateStats() {
            const todoCount = tasks.filter(t => t.status === 'todo').length;
            const progressCount = tasks.filter(t => t.status === 'progress').length;
            const doneCount = tasks.filter(t => t.status === 'done').length;
            const totalCount = tasks.length;

            document.getElementById('todo-count').textContent = todoCount;
            document.getElementById('progress-count').textContent = progressCount;
            document.getElementById('done-count').textContent = doneCount;
            document.getElementById('total-count').textContent = totalCount;

            document.getElementById('todo-badge').textContent = todoCount;
            document.getElementById('progress-badge').textContent = progressCount;
            document.getElementById('done-badge').textContent = doneCount;
        }

        // Clear completed tasks
        function clearCompleted() {
            const completedCount = tasks.filter(t => t.status === 'done').length;
            if (completedCount === 0) {
                showToast('No completed tasks to clear');
                return;
            }

            if (!confirm(`Delete ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`)) return;

            tasks = tasks.filter(t => t.status !== 'done');
            saveTasks();
            renderTasks();
            updateStats();
            showToast('Completed tasks cleared');
        }

        // Save tasks to localStorage
        function saveTasks() {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        }

        // Show toast notification
        function showToast(message) {
            const toast = document.getElementById('toast');
            const toastMessage = document.getElementById('toast-message');
            
            toastMessage.textContent = message;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // Close modal on outside click
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                closeModal();
            }
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
            }
        });