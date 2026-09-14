const tasks = [...document.querySelectorAll('[data-task]')];
const filters = [...document.querySelectorAll('.filter')];
const storageKey = 'way-to-canada-progress';
const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

function updateProgress() {
  const completed = tasks.filter((task) => task.checked).length;
  const percent = tasks.length ? (completed / tasks.length) * 100 : 0;
  document.querySelector('#progress-label').textContent = `${completed} з ${tasks.length} кроків`;
  document.querySelector('#progress-bar').style.width = `${percent}%`;
}

tasks.forEach((task) => {
  task.checked = Boolean(saved[task.dataset.task]);
  task.addEventListener('change', () => {
    saved[task.dataset.task] = task.checked;
    localStorage.setItem(storageKey, JSON.stringify(saved));
    updateProgress();
  });
});

filters.forEach((button) => {
  button.addEventListener('click', () => {
    filters.forEach((item) => item.classList.toggle('active', item === button));
    const filter = button.dataset.filter;
    document.querySelectorAll('.phase').forEach((phase) => {
      phase.hidden = filter !== 'all' && !phase.dataset.phase.split(' ').includes(filter);
    });
  });
});

updateProgress();
