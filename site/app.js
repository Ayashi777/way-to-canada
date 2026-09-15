const search = document.querySelector('#search');
const result = document.querySelector('#search-result');
const documents = [...document.querySelectorAll('[data-document]')];
search?.addEventListener('input', () => {
  const query = search.value.trim().toLocaleLowerCase('uk'); let visible = 0;
  documents.forEach((document) => { const matches = !query || document.dataset.search.includes(query); document.hidden = !matches; if (matches) visible += 1; });
  result.textContent = query ? `Знайдено документів: ${visible}` : '';
});
