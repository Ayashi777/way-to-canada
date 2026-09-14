const tasks = [...document.querySelectorAll('[data-task]')];
const filters = [...document.querySelectorAll('.filter')];

tasks.forEach((task) => {
  task.disabled = true;
});

document.querySelector('#progress-label').textContent =
  'Статус оновлюється під час щоденного огляду';
document.querySelector('#progress-bar').style.width = '0';

filters.forEach((button) => {
  button.addEventListener('click', () => {
    filters.forEach((item) => item.classList.toggle('active', item === button));
    const filter = button.dataset.filter;

    document.querySelectorAll('.phase').forEach((phase) => {
      phase.hidden =
        filter !== 'all' && !phase.dataset.phase.split(' ').includes(filter);
    });
  });
});
