const filters = [...document.querySelectorAll('.filter')];
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
