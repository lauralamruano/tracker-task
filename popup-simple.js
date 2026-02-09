// JavaScript simplificado para el nuevo diseño Stitch
document.addEventListener('DOMContentLoaded', function() {
    // Actualizar la hora actual
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        const timeElement = document.querySelector('.w-full.max-w-\\[390px\\].h-11 span');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }

    // Actualizar hora cada minuto
    updateTime();
    setInterval(updateTime, 60000);

    // Actualizar fecha
    function updateDate() {
        const now = new Date();
        const options = { month: 'short', day: 'numeric' };
        const dateString = now.toLocaleDateString('en-US', options);
        const dateElement = document.querySelector('.text-xs.text-muted');
        if (dateElement) {
            dateElement.textContent = dateString;
        }
    }

    updateDate();

    // Funcionalidad para agregar nuevas tareas
    const taskInput = document.querySelector('input[placeholder="What are you working on?"]');
    const addButton = document.querySelector('.absolute.right-0 button');

    if (taskInput && addButton) {
        addButton.addEventListener('click', function() {
            const taskName = taskInput.value.trim();
            if (taskName) {
                addNewTask(taskName);
                taskInput.value = '';
            }
        });

        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addButton.click();
            }
        });
    }

    function addNewTask(taskName) {
        const taskSection = document.querySelector('section.space-y-10');
        if (!taskSection) return;

        const newTask = document.createElement('div');
        newTask.className = 'task-row flex items-center justify-between group transition-all opacity-80';
        newTask.innerHTML = `
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-accent/10"></span>
                    <h2 class="text-base font-normal">${taskName}</h2>
                </div>
                <div class="task-actions opacity-0 transition-opacity flex gap-4 ml-3.5">
                    <button class="text-xs font-semibold tracking-tight uppercase hover:text-black">Start</button>
                    <button class="text-xs font-semibold tracking-tight uppercase hover:text-black opacity-40">More</button>
                </div>
            </div>
            <div class="text-right">
                <span class="text-base font-normal tabular-nums text-muted">0:00</span>
            </div>
        `;

        taskSection.appendChild(newTask);
    }

    // Toggle para modo oscuro (ya está en el HTML)
    // El botón de contrast ya tiene el onclick="document.documentElement.classList.toggle('dark')"
});
